import express, { Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import Aedes from 'aedes';
import { createServer } from 'net';
import { GoogleGenerativeAI } from '@google/generative-ai';
import NodeCache from 'node-cache';
import twilio from 'twilio';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3001;
const mqttPort = 1883;

// Initialize Gemini and Cache
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const recipeCache = new NodeCache({ stdTTL: 3600 }); // Cache recipes for 1 hour to avoid spam
const smsCache = new NodeCache({ stdTTL: 86400 }); // SMS Cooldown for 24 hours

// Initialize Twilio Enterprise Fallback Mode
const twilioClient = process.env.TWILIO_ACCOUNT_SID 
  ? twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN) 
  : null;

app.use(cors());
app.use(express.json());

// Store connected SSE clients for live streaming
let clients: Response[] = [];

app.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  clients.push(res);
  console.log('SSE Client Connected. Total clients:', clients.length);

  req.on('close', () => {
    clients = clients.filter(client => client !== res);
    console.log('SSE Client Disconnected. Total clients:', clients.length);
  });
});

// Setup embedded MQTT Broker
const aedes = new Aedes();
const mqttServer = createServer(aedes.handle);

mqttServer.listen(mqttPort, () => {
  console.log(`MQTT Broker running on port ${mqttPort}`);
});

aedes.on('client', (client) => {
  console.log(`MQTT Client Connected: ${client.id}`);
});

async function generateZeroWasteRecipe(item: string) {
  if (recipeCache.has(item)) {
    return recipeCache.get(item);
  }


  try {
    // Simulate LLM Network Delay (1.5 seconds)
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Mock GenAI responses to bypass Google Server Outages (503/404s)
    const mockRecipes: Record<string, string> = {
      "Banana": "Mash the overripe banana into pancake batter for naturally sweet, zero-waste morning flapjacks!",
      "Apple": "Chop the softening apple and simmer with cinnamon for a quick, zero-waste applesauce topping.",
      "Orange": "Blend the entire orange (peel included) into a vibrant, high-fiber zero-waste citrus smoothie.",
      "Hot dog": "Slice the leftover hot dog into a hearty zero-waste breakfast scramble with eggs and onions.",
      "Carrot": "Grate the limp carrot into a zesty zero-waste slaw with a splash of vinegar.",
      "Broccoli": "Roast the wilting broccoli florets with olive oil and garlic for a crispy zero-waste side."
    };

    const recipeText = mockRecipes[item] || `Dice the ${item} and toss it into a hearty zero-waste stir-fry!`;
    
    recipeCache.set(item, recipeText);
    return recipeText;
  } catch (error) {
    console.error("LLM Error:", error);
    return `Could not generate recipe for ${item}.`;
  }
}

aedes.on('publish', async (packet, client) => {
  if (packet.topic === 'smart-shelf/telemetry') {
    const payload = packet.payload.toString();
    console.log(`Received Telemetry: ${payload}`);
    
    // Broadcast data to all connected React dashboards
    clients.forEach(c => c.write(`data: ${payload}\n\n`));

    // LLM Integration Trigger
    try {
      const data = JSON.parse(payload);
      // Trigger recipe generation if item is expiring soon (<= 4 days)
      if (data.estimated_days_left <= 4) {
        const recipeText = await generateZeroWasteRecipe(data.item);
        
        // Broadcast the recipe to the frontend as a special SSE payload
        const recipePayload = JSON.stringify({
          type: 'recipe',
          item: data.item,
          recipe: recipeText
        });
        clients.forEach(c => c.write(`data: ${recipePayload}\n\n`));

        // Trigger Push Notification (only once per item per day)
        if (!smsCache.has(data.item)) {
          smsCache.set(data.item, true);
          const smsBody = `Smart-Shelf Alert 🚨\nYour ${data.item} is expiring!\nZero-Waste Recipe: ${recipeText}`;
          
          if (twilioClient && process.env.USER_PHONE_NUMBER) {
            await twilioClient.messages.create({
              body: smsBody,
              from: process.env.TWILIO_PHONE_NUMBER,
              to: process.env.USER_PHONE_NUMBER
            }).catch(err => console.error("Twilio Error:", err));
            console.log(`[TWILIO] Real SMS Sent to ${process.env.USER_PHONE_NUMBER} for ${data.item}!`);
          } else {
            console.log(`\n=================================================`);
            console.log(`[MOCK SMS NOTIFICATION] TO USER'S PHONE`);
            console.log(smsBody);
            console.log(`=================================================\n`);
          }
        }
      }
    } catch (e) {
      console.error("Error processing telemetry:", e);
    }
  }
});

// Setup REST API
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Smart-Shelf API' });
});

app.post('/api/camera', (req, res) => {
  const { action } = req.body;
  if (action === 'start' || action === 'stop') {
    aedes.publish({ topic: 'smart-shelf/control', payload: Buffer.from(JSON.stringify({ action })) }, () => {});
    res.json({ success: true, action });
  } else {
    res.status(400).json({ error: 'Invalid action' });
  }
});

app.post('/api/clear', (req, res) => {
  recipeCache.flushAll();
  aedes.publish({ topic: 'smart-shelf/control', payload: Buffer.from(JSON.stringify({ action: 'clear' })) }, () => {});
  // Tell clients to clear
  clients.forEach(c => c.write(`data: ${JSON.stringify({ type: 'clear' })}\n\n`));
  res.json({ success: true });
});

// Permanent Database Endpoints
app.get('/api/inventory', async (req, res) => {
  try {
    const items = await prisma.item.findMany({
      orderBy: { updatedAt: 'desc' }
    });
    res.json(items);
  } catch (error) {
    console.error("DB Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { name, category, decayStatus } = req.body;
    const newItem = await prisma.item.create({
      data: { name, category: category || 'General', decayStatus }
    });
    res.json({ success: true, item: newItem });
  } catch (error) {
    console.error("DB Save Error:", error);
    res.status(500).json({ error: "Failed to save item" });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await prisma.item.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    console.error("DB Delete Error:", error);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

app.listen(port, () => {
  console.log(`Backend API running on http://localhost:${port}`);
});

