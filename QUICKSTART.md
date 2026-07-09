# My Smart-Shelf Launch Commands

Keep this file open during your presentation so you know exactly what to type to start your project.

### 🟢 Terminal 1 (Backend Server)
*Must be started first to handle the data!*
```powershell
cd C:\Smart-Shelf\backend-api
npm run dev
```

### 🔵 Terminal 2 (React Dashboard)
*Your web interface.*
```powershell
cd C:\Smart-Shelf\frontend-app
npm run dev
```
👉 Click here to open the dashboard: http://localhost:5173

### 🟠 Terminal 3 (Edge AI Hardware)
*The Python webcam controller.*
```powershell
cd C:\Smart-Shelf\edge-ml-service
.\venv\Scripts\activate
python src\main.py
```

---

### ⚠️ Important Demo Reminders:
1. **The Webcam:** When you run Terminal 3, the webcam won't open immediately! You must go to `http://localhost:5173` and click the blue **"Start AI Camera"** button at the top left.
2. **Clearing Data:** If your shelf gets cluttered during the demo, click the grey **"Clear Shelf"** button to instantly reset everything.
3. **Closing the Project:** When you are completely done for the day, go to each terminal and press **`Ctrl + C`** to shut down the servers safely.
