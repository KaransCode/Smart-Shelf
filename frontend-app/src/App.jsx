import React, { useState, useEffect } from 'react';
import { Apple, Clock, ChefHat, Camera, CameraOff, Trash2, Box } from 'lucide-react';
import './index.css';

function App() {
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [inventory, setInventory] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [cameraActive, setCameraActive] = useState(false);

  useEffect(() => {
    fetch('http://localhost:3001/health')
      .then(res => res.json())
      .then(data => setHealthStatus(data.status))
      .catch(err => setHealthStatus('Offline'));

    const eventSource = new EventSource('http://localhost:3001/stream');
    
    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'recipe') {
          // Play Digital Beep
          try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // High pitch beep
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // Volume
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3); // Beep for 300ms
            
            // Trigger Voice Assistant (after the beep)
            setTimeout(() => {
              const utterance = new SpeechSynthesisUtterance(`Smart Shelf Alert. Your ${data.item} is expiring soon.`);
              utterance.rate = 0.95; // Slightly slower, more robotic/clear voice
              window.speechSynthesis.speak(utterance);
            }, 400);
          } catch(e) { 
            console.log('Audio Autoplay Blocked or Unsupported:', e); 
          }

          setRecipes(prev => ({ ...prev, [data.item]: data.recipe }));
        } else if (data.type === 'clear') {
          setInventory([]);
          setRecipes({});
        } else {
          setInventory(prev => {
            const existingIndex = prev.findIndex(item => item.item === data.item);
            if (existingIndex >= 0) {
              const newInv = [...prev];
              newInv[existingIndex] = data;
              return newInv;
            }
            return [...prev, data];
          });
        }
      } catch (err) {
        console.error("Error parsing stream data", err);
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const toggleCamera = () => {
    const action = cameraActive ? 'stop' : 'start';
    fetch('http://localhost:3001/api/camera', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
    setCameraActive(!cameraActive);
  };

  const clearShelf = () => {
    fetch('http://localhost:3001/api/clear', { method: 'POST' });
  };

  // Group inventory by category
  const categories = inventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <h1>Smart-Shelf</h1>
          <div className="status-badge">
            API: <span className={`status-indicator ${healthStatus === 'ok' ? 'online' : 'offline'}`}></span> {healthStatus}
          </div>
        </div>
        
        <div className="control-panel" style={{ display: 'flex', gap: '12px' }}>
          <button 
            className={`btn ${cameraActive ? 'btn-danger' : 'btn-primary'}`} 
            onClick={toggleCamera}
          >
            {cameraActive ? <CameraOff size={18} /> : <Camera size={18} />}
            {cameraActive ? 'Stop AI Camera' : 'Start AI Camera'}
          </button>
          
          <button className="btn btn-secondary" onClick={clearShelf}>
            <Trash2 size={18} /> Clear Shelf
          </button>
        </div>
      </header>

      <main className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))' }}>
        
        <section className="card">
          <div className="card-header">
            <Box className="icon" />
            <h2>Categorized Inventory</h2>
          </div>
          <div className="card-content">
            {Object.keys(categories).length === 0 ? (
              <p style={{ color: '#888' }}>{cameraActive ? "Waiting for AI detections..." : "Camera is offline."}</p>
            ) : (
              Object.entries(categories).map(([catName, items], idx) => (
                <div key={idx} style={{ marginBottom: '16px' }}>
                  <h3 style={{ fontSize: '1rem', color: '#00e5ff', borderBottom: '1px solid #333', paddingBottom: '4px', marginBottom: '8px' }}>
                    {catName}
                  </h3>
                  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {items.map((i, iIdx) => (
                      <li key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span>{i.item}</span>
                        <span style={{ color: i.decay_status > 0.5 ? '#4ade80' : '#f87171' }}>
                          {(i.decay_status * 100).toFixed(0)}% Fresh
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <Clock className="icon" />
            <h2>Decay Forecast</h2>
          </div>
          <div className="card-content">
            {inventory.length === 0 ? (
              <p style={{ color: '#888' }}>No items to track.</p>
            ) : (
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {inventory.map((i, idx) => (
                  <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '8px', background: 'rgba(255,255,255,0.02)', borderRadius: '4px' }}>
                    <strong>{i.item}</strong>
                    <span style={{ color: i.estimated_days_left <= 4 ? '#f87171' : '#a1a1aa' }}>
                      {i.estimated_days_left <= 0 ? 'Expired' : `~${i.estimated_days_left} days left`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section className="card highlight">
          <div className="card-header">
            <ChefHat className="icon" />
            <h2>Zero-Waste Recipes</h2>
          </div>
          <div className="card-content">
            {Object.keys(recipes).length === 0 ? (
              <p style={{ color: '#888' }}>
                {inventory.some(i => i.estimated_days_left <= 4) 
                  ? "Generating recipe via AI..."
                  : "Awaiting expiring items (<= 4 days) to generate recipes..."}
              </p>
            ) : (
              <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                {Object.entries(recipes).map(([item, recipe], idx) => (
                  <li key={idx} style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0, 229, 255, 0.05)', borderRadius: '8px', borderLeft: '3px solid #00e5ff' }}>
                    <strong style={{ color: '#00e5ff', display: 'block', marginBottom: '4px' }}>{item} Recipe</strong>
                    <p style={{ fontSize: '0.95em', lineHeight: '1.4', color: '#e4e4e7' }}>{recipe}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

      </main>
    </div>
  );
}

export default App;
