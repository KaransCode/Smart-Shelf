# Smart-Shelf 🍏📱

**Smart-Shelf** is an intelligent, edge-AI powered Consumer Food Waste Predictor. Built to tackle the global food waste crisis (SDG 12), it uses a webcam and deep learning to identify grocery items in real-time, predict their decay/spoilage timelines, and automatically generate zero-waste recipes using Generative AI before the food goes bad.

## 🌟 Key Features

* **Real-time Edge AI:** Uses Ultralytics YOLOv8 for sub-second object detection directly on your local hardware.
* **Bi-directional IoT Architecture:** Uses an embedded MQTT broker (`aedes`) for ultra-fast, lightweight communication between the Python hardware script and the Node.js backend.
* **Remote Hardware Control:** The React dashboard can remotely turn the physical AI camera on and off.
* **Zero-Waste Recipe GenAI:** Automatically detects when an item is expiring soon (<= 4 days) and pings an LLM to generate a custom recipe to use up the ingredient.
* **Server-Sent Events (SSE):** The frontend receives real-time pushes without needing to refresh or poll the server.

## 🏗️ Tech Stack

* **Edge Device:** Python, OpenCV, Ultralytics YOLOv8, Paho-MQTT
* **Backend:** Node.js, Express, TypeScript, Aedes (MQTT), `@google/generative-ai`
* **Frontend:** React (Vite), CSS3 Glassmorphism, Lucide-React Icons

---

## 🚀 Installation Guide (From Scratch)

If you are cloning this project for the first time, follow these steps to get the full stack running.

### Prerequisites
* **Node.js** (v18+)
* **Python** (3.9+)
* A webcam connected to your computer.

### 1. Setup the Node.js Backend
```bash
cd backend-api
npm install
```
*Create a `.env` file in the `backend-api` folder and add your Gemini API Key (if you wish to use live GenAI instead of the built-in Mock generator):*
```env
PORT=3001
GEMINI_API_KEY="your_api_key_here"
```

### 2. Setup the React Frontend
```bash
cd frontend-app
npm install
```

### 3. Setup the Python Edge AI
```bash
cd edge-ml-service
python -m venv venv
```
*Activate the virtual environment:*
* **Windows:** `.\venv\Scripts\activate`
* **Mac/Linux:** `source venv/bin/activate`

*Install the dependencies:*
```bash
pip install ultralytics opencv-python paho-mqtt
```

---

## 🎮 How to Run the Project

You must start the backend *before* the Python script, as the backend acts as the central MQTT router.

**Terminal 1 (Backend):**
```bash
cd backend-api
npm run dev
```

**Terminal 2 (Frontend):**
```bash
cd frontend-app
npm run dev
```
*(Open http://localhost:5173 in your browser)*

**Terminal 3 (Edge AI):**
```bash
cd edge-ml-service
# Make sure your venv is activated!
python src/main.py
```

> **Note:** The camera will not turn on immediately. Go to your React dashboard and click the **"Start AI Camera"** button to command the hardware to wake up!

---

## 🏆 Hackathon & Competition Notes
This project was designed for rapid deployment and high-impact presentations. If you experience API rate limits or network issues during a live demo, the backend includes a fallback **Hyper-Realistic Mock LLM** that guarantees your Zero-Waste Recipes will always generate seamlessly on stage. 
