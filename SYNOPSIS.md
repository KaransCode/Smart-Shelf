# Smart-Shelf: Project Synopsis

## 🌍 Problem Statement
The United Nations has identified Food Loss and Waste as a critical global challenge, with approximately one-third of all food produced for human consumption being lost or wasted globally (SDG 12). At the consumer level, a significant portion of this waste occurs simply because households lose track of what groceries they have and when those items expire. Food is pushed to the back of the pantry or fridge, forgotten, and ultimately thrown away when it rots. Traditional inventory management apps require tedious manual data entry, which leads to poor user retention and inaccurate data.

## 💡 The Solution
**Smart-Shelf** is an autonomous, Edge-AI powered Consumer Food Waste Predictor. By bridging the gap between Computer Vision and Generative AI, Smart-Shelf removes the friction of manual data entry entirely. 

The system utilizes an edge-deployed camera (e.g., inside a smart fridge or pantry) to continuously monitor the physical shelf. Using a highly-optimized object detection model, it instantly recognizes grocery items (produce, fast food, kitchenware) and tracks how long they have been sitting on the shelf. As an item's freshness degrades over time, the system mathematically forecasts its expiration date. 

When an item approaches its critical expiration window (<= 4 days), Smart-Shelf autonomously triggers a Generative AI model to instantly create a highly specific, Zero-Waste recipe utilizing that exact ingredient, pushing the solution directly to the user's web dashboard before the food spoils.

## 🛠️ Technology Stack
Smart-Shelf is built using a modern, event-driven, three-tier IoT architecture:

1. **Edge AI Hardware Layer:**
   - **Language:** Python
   - **Computer Vision:** Ultralytics YOLOv8 (Nano) & OpenCV for real-time object detection and bounding-box rendering.
   - **Protocol:** Paho-MQTT for publishing ultra-lightweight telemetry payloads.

2. **Backend Orchestration Layer:**
   - **Language:** Node.js, Express, TypeScript
   - **IoT Broker:** `aedes` (Embedded MQTT Broker to bridge hardware and software).
   - **Generative AI:** Google Generative AI API (`gemini-pro`) to autonomously craft zero-waste recipes.
   - **Real-Time Data Pipeline:** Server-Sent Events (SSE) to push live updates to the frontend without HTTP polling.

3. **Frontend Dashboard Layer:**
   - **Framework:** React (Vite)
   - **Styling:** Custom CSS3 Glassmorphism with responsive grid layouts.
   - **Icons:** Lucide-React.
   - **Interactivity:** Bi-directional remote control allowing the web client to command the Edge AI hardware (e.g., turning the camera on/off).

## 📱 Example Usage Scenario

**1. The Setup:** 
A user places an Apple and a bunch of Bananas onto their kitchen counter (where the Smart-Shelf camera is pointed). The user opens their Smart-Shelf web dashboard and clicks **"Start AI Camera"**.

**2. Autonomous Detection:** 
The edge camera turns on, instantly draws bounding boxes around the fruit, and classifies them. The web dashboard immediately updates, categorizing the items under "Fresh Produce" and showing their freshness at 100%.

**3. The Decay Simulation:** 
Over time, the Smart-Shelf system tracks the Apple and Bananas. The dashboard's "Decay Forecast" card shows the Banana's lifespan dropping to `4 days left`. 

**4. The AI Intervention:** 
The moment the Banana hits the critical 4-day threshold, the Node.js backend intercepts this data. Without any user input, it queries the Gemini LLM. Within seconds, the web dashboard flashes and a brand new card appears: *"Banana Recipe: Mash the overripe banana into pancake batter for naturally sweet, zero-waste morning flapjacks!"* 

The user cooks the pancakes, the food is saved, and food waste is prevented. The user clicks **"Clear Shelf"**, and the cycle is complete.
