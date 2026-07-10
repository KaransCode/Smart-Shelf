# How to set up and run the Smart-Shelf AI project

Welcome! This guide will help you set up the Smart-Shelf project on your local machine from scratch.

### Step 1: Download the Code
Open a terminal and clone the repository:
```bash
git clone https://github.com/KaransCode/Smart-Shelf.git
cd Smart-Shelf
```

### Step 2: Start the Backend (Terminal 1)
Open your first terminal and run:
```bash
cd backend-api
npm install
```
*Wait! Before running it, create a new file inside the `backend-api` folder called `.env` and paste this inside it:*
```env
PORT=3001
GEMINI_API_KEY=""
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_PHONE_NUMBER=""
USER_PHONE_NUMBER=""
```
*(Note: If you leave these blank, the project will gracefully run in "Mock Mode", printing the recipes and text alerts safely to the terminal!)*

Now start the backend:
```bash
npm run dev
```

### Step 3: Start the Web Dashboard (Terminal 2)
Open a second terminal and run:
```bash
cd frontend-app
npm install
npm run dev
```
*(Once this finishes, open `http://localhost:5173` in your web browser!)*

### Step 4: Start the Edge AI Camera (Terminal 3)
Open a third terminal. Run:
```bash
cd edge-ml-service
python -m venv venv
```
Activate the virtual environment (choose the right command for your laptop):
* **Windows:** `.\venv\Scripts\activate`
* **Mac/Linux:** `source venv/bin/activate`

Then install the AI packages and start the camera:
```bash
pip install ultralytics opencv-python paho-mqtt
python src/main.py
```

### Step 5: Test the Voice Alerts!
Go to your browser at `http://localhost:5173`. Make sure your volume is on, and click the **"Start AI Camera"** button. Hold an apple, banana, or carton of milk up to your laptop's webcam to watch the AI predict its decay, generate a recipe, and speak to you out loud!
