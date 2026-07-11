import React, { useState, useEffect } from 'react';
import { Clock, ChefHat, Box, Video, Trash2 } from 'lucide-react';
import './index.css';

const themes = {
    red: { color: '#d3383a', bgColor: '#fff1f2', image: 'https://images.unsplash.com/photo-1582284540020-8acbe03f4924?auto=format&fit=crop&w=600&h=600' },
    orange: { color: '#f97316', bgColor: '#fff7ed', image: 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&w=600&h=600' },
    green: { color: '#10b981', bgColor: '#ecfdf5', image: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?auto=format&fit=crop&w=600&h=600' },
    purple: { color: '#7c3aed', bgColor: '#f5f3ff', image: 'https://images.unsplash.com/photo-1496412705862-e0088f16f791?auto=format&fit=crop&w=600&h=600' },
    veggies: { color: '#15803d', bgColor: '#f0fdf4', image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&h=600' },
    fastfood: { color: '#d97706', bgColor: '#fef3c7', image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&h=600' }
};

function App() {
  const [healthStatus, setHealthStatus] = useState('Checking...');
  const [inventory, setInventory] = useState([]);
  const [dbInventory, setDbInventory] = useState([]);
  const [recipes, setRecipes] = useState({});
  const [cameraActive, setCameraActive] = useState(false);
  const [activeTheme, setActiveTheme] = useState('veggies');
  const [activePage, setActivePage] = useState('home');

  const fetchInventory = () => {
    fetch('http://localhost:3001/api/inventory')
      .then(res => res.json())
      .then(data => setDbInventory(data))
      .catch(err => console.error(err));
  };

  const saveToDb = (item) => {
    fetch('http://localhost:3001/api/inventory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: item.item, category: item.category, decayStatus: item.decay_status })
    }).then(() => fetchInventory());
  };

  const deleteFromDb = (id) => {
    fetch(`http://localhost:3001/api/inventory/${id}`, {
      method: 'DELETE'
    }).then(() => fetchInventory());
  };

  useEffect(() => {
    fetchInventory();
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
            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); 
            gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); 
            oscillator.start();
            oscillator.stop(audioCtx.currentTime + 0.3); 
            
            setTimeout(() => {
              const utterance = new SpeechSynthesisUtterance(`Smart Shelf Alert. Your ${data.item} is expiring soon.`);
              utterance.rate = 0.95; 
              window.speechSynthesis.speak(utterance);
            }, 400);
          } catch(e) { console.log('Audio Blocked', e); }

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
    return () => eventSource.close();
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--theme-color', themes[activeTheme].color);
    document.body.style.backgroundColor = themes[activeTheme].bgColor;
  }, [activeTheme]);

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

  const categories = inventory.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {});

  const freshItems = dbInventory.filter(i => i.decayStatus > 0.5);
  const expiringItems = dbInventory.filter(i => i.decayStatus <= 0.5);

  return (
    <>
      <nav className="top-nav">
          <div className="logo" onClick={() => setActivePage('home')} style={{cursor: 'pointer'}}>
              <span className="logo-box">Smart</span> Shelf
          </div>
          
          <div className="nav-links">
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('home'); setCameraActive(false); }} style={{ color: activePage === 'home' && !cameraActive ? 'var(--theme-color)' : '' }}>Home</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('about'); setCameraActive(false); }} style={{ color: activePage === 'about' ? 'var(--theme-color)' : '' }}>About Us</a>
              <a href="#" onClick={(e) => { e.preventDefault(); setActivePage('home'); toggleCamera(); }} style={{ color: cameraActive ? 'var(--theme-color)' : '' }}>Live Camera Dashboard</a>
          </div>
          
          <div className="theme-selector">
              <i className="fa-solid fa-palette"></i> Theme:
              <select value={activeTheme} onChange={(e) => setActiveTheme(e.target.value)}>
                  <option value="red">🍅 Tomato & Strawberry</option>
                  <option value="orange">🍊 Citrus & Carrot</option>
                  <option value="green">🥑 Avocado & Greens</option>
                  <option value="purple">🫐 Blueberry & Plum</option>
                  <option value="veggies">🥗 Mixed Vegetables</option>
                  <option value="fastfood">🍔 Fast Food</option>
              </select>
          </div>
      </nav>

      {activePage === 'about' ? (
        <main style={{ width: '100%', maxWidth: '1000px', padding: '4rem 2rem', flex: 1 }}>
           <h1 style={{ fontSize: '3.5rem', marginBottom: '1.5rem', color: 'var(--text-dark)', fontWeight: 900, letterSpacing: '-1px' }}>About Smart-Shelf</h1>
           <p style={{ fontSize: '1.2rem', lineHeight: 1.6, color: 'var(--text-muted)', marginBottom: '3rem', borderTop: '2px solid #eaeaea', paddingTop: '1.5rem' }}>
              Globally, over <strong>1.3 billion tons</strong> of food is wasted every year—amounting to roughly one-third of all food produced for human consumption. In India, despite immense agricultural output, households waste an estimated <strong>68 million tonnes</strong> of food annually (around 50 kg per person) according to the UNEP. <br/><br/>
              Smart-Shelf was built to combat this crisis at its root by bringing enterprise-grade Edge AI directly into the consumer kitchen.
           </p>
           
           <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
               <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                   <h3 style={{ color: 'var(--theme-color)', marginBottom: '1rem', fontSize: '1.4rem' }}><i className="fa-solid fa-microchip"></i> Edge ML & YOLO-World</h3>
                   <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Using a zero-shot object detection model, Smart-Shelf instantly recognizes loose produce locally without sending private video feeds to the cloud.</p>
               </div>
               <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                   <h3 style={{ color: 'var(--theme-color)', marginBottom: '1rem', fontSize: '1.4rem' }}><i className="fa-solid fa-barcode"></i> PyZbar Barcode Scanner</h3>
                   <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Seamlessly scans 1D/2D barcodes on packaged goods to retrieve exact product names via the Open Food Facts API.</p>
               </div>
               <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                   <h3 style={{ color: 'var(--theme-color)', marginBottom: '1rem', fontSize: '1.4rem' }}><i className="fa-solid fa-brain"></i> Google Gemini GenAI</h3>
                   <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>When an item drops below 4 days of freshness, our backend autonomously queries Gemini to generate a zero-waste recipe using the exact items you have left.</p>
               </div>
               <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid #eaeaea', boxShadow: '0 10px 30px rgba(0,0,0,0.03)' }}>
                   <h3 style={{ color: 'var(--theme-color)', marginBottom: '1rem', fontSize: '1.4rem' }}><i className="fa-solid fa-database"></i> SQLite Persistence</h3>
                   <p style={{ color: 'var(--text-muted)', lineHeight: 1.5 }}>Track your pantry long-term with a fully integrated database that categorizes your inventory into Fresh and Expiring items.</p>
               </div>
           </div>
        </main>
      ) : !cameraActive ? (
        <main className="hero">
            <div className="hero-content">
                <h1>Smart Shelf</h1>
                <img src="https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&h=400" alt="Healthy Food" className="hero-image-small" />
                <p className="description">
                    Smart-Shelf is an AI-powered initiative utilizing Edge ML and Barcode Scanning to detect grocery decay in real-time, preventing household food waste through zero-waste recipes.
                </p>
                <div style={{ display: 'flex', gap: '20px', alignItems: 'center', opacity: 0.7 }}>
                    <i className="fa-brands fa-aws" style={{ fontSize: '2.5rem' }}></i>
                    <i className="fa-brands fa-node-js" style={{ fontSize: '2.5rem' }}></i>
                    <i className="fa-brands fa-react" style={{ fontSize: '2.5rem' }}></i>
                </div>
            </div>

            <div className="hero-visuals">
                <div className="theme-backdrop"></div>
                <img src={themes[activeTheme].image} alt="Vegetables" className="floating-food-img" />
                
                <button onClick={toggleCamera} className="action-circle">
                    <i className="fa-solid fa-arrow-up-right-from-square"></i>
                    <span>Start Camera</span>
                </button>
            </div>
        </main>
      ) : (
        <div style={{ width: '100%', maxWidth: '1400px', padding: '0 2rem', marginTop: '2rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', alignItems: 'center' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800 }}>Live AI Dashboard <span style={{fontSize: '0.9rem', color: 'var(--text-muted)'}}>(API: {healthStatus})</span></h2>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button className="btn btn-secondary" onClick={clearShelf}><Trash2 size={18} /> Clear Data</button>
              <button className="btn btn-danger" onClick={toggleCamera}><Video size={18} /> Stop Camera</button>
            </div>
          </div>
          
          <main className="dashboard-grid">
            <section className="card">
              <div className="card-header">
                <Box className="icon" />
                <h2>Categorized Inventory</h2>
              </div>
              <div className="card-content">
                {Object.keys(categories).length === 0 ? (
                  <p>Waiting for YOLO-World or Barcode detections...</p>
                ) : (
                  Object.entries(categories).map(([catName, items], idx) => (
                    <div key={idx} style={{ marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '1rem', color: 'var(--theme-color)', borderBottom: '1px solid #eaeaea', paddingBottom: '4px', marginBottom: '8px' }}>
                        {catName}
                      </h3>
                      <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                        {items.map((i, iIdx) => (
                          <li key={iIdx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontWeight: '600', alignItems: 'center' }}>
                            <span style={{ color: 'var(--text-dark)' }}>{i.item}</span>
                            <div>
                              <span style={{ color: i.decay_status > 0.5 ? '#10b981' : '#ef4444' }}>
                                {(i.decay_status * 100).toFixed(0)}% Fresh
                              </span>
                              <button onClick={() => saveToDb(i)} style={{ marginLeft: '10px', background: 'var(--theme-color)', color: 'white', border: 'none', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer', fontSize: '0.8rem' }}>Save</button>
                            </div>
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
                  <p>No items to track.</p>
                ) : (
                  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {inventory.map((i, idx) => (
                      <li key={idx} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', padding: '10px', background: 'rgba(0,0,0,0.02)', borderRadius: '6px', border: '1px solid #eaeaea' }}>
                        <strong style={{ color: 'var(--text-dark)' }}>{i.item}</strong>
                        <span style={{ color: i.estimated_days_left <= 4 ? '#ef4444' : 'var(--text-muted)', fontWeight: '600' }}>
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
                  <p>
                    {inventory.some(i => i.estimated_days_left <= 4) 
                      ? "Generating Gemini AI recipe..."
                      : "Awaiting expiring items (<= 4 days)..."}
                  </p>
                ) : (
                  <ul style={{ listStyle: 'none', paddingLeft: 0 }}>
                    {Object.entries(recipes).map(([item, recipe], idx) => (
                      <li key={idx} style={{ marginBottom: '16px', padding: '12px', background: 'rgba(0,0,0,0.02)', borderRadius: '8px', borderLeft: '4px solid var(--theme-color)' }}>
                        <strong style={{ color: 'var(--theme-color)', display: 'block', marginBottom: '4px' }}>{item} Suggestion</strong>
                        <p style={{ fontSize: '0.95em', lineHeight: '1.5', color: 'var(--text-dark)' }}>{recipe}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          </main>

          {/* Permanent Pantry Database Section */}
          <div style={{ marginTop: '3rem', padding: '2rem', background: 'white', borderRadius: '16px', boxShadow: '0 10px 25px rgba(0,0,0,0.03)', marginBottom: '3rem' }}>
            <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '1.5rem', borderBottom: '2px solid #eaeaea', paddingBottom: '0.5rem', color: 'var(--text-dark)' }}>
              <i className="fa-solid fa-database" style={{ color: 'var(--theme-color)', marginRight: '10px' }}></i>
              Permanent Pantry Database
            </h2>
            
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
              <div>
                <h3 style={{ color: '#10b981', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-leaf"></i> Fresh Items {'>'} 50%</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {freshItems.length === 0 ? <p style={{color: 'var(--text-muted)'}}>No fresh items saved.</p> : freshItems.map(item => (
                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#ecfdf5', marginBottom: '8px', borderRadius: '8px', borderLeft: '4px solid #10b981', color: 'var(--text-dark)' }}>
                      <strong>{item.name}</strong>
                      <div>
                        <span style={{ color: '#10b981', marginRight: '10px', fontWeight: 'bold' }}>{(item.decayStatus * 100).toFixed(0)}%</span>
                        <button onClick={() => deleteFromDb(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div>
                <h3 style={{ color: '#ef4444', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '8px' }}><i className="fa-solid fa-triangle-exclamation"></i> Use Before {'<'} 50%</h3>
                <ul style={{ listStyle: 'none', padding: 0 }}>
                  {expiringItems.length === 0 ? <p style={{color: 'var(--text-muted)'}}>No expiring items saved.</p> : expiringItems.map(item => (
                    <li key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px', background: '#fef2f2', marginBottom: '8px', borderRadius: '8px', borderLeft: '4px solid #ef4444', color: 'var(--text-dark)' }}>
                      <strong>{item.name}</strong>
                      <div>
                        <span style={{ color: '#ef4444', marginRight: '10px', fontWeight: 'bold' }}>{(item.decayStatus * 100).toFixed(0)}%</span>
                        <button onClick={() => deleteFromDb(item.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer' }}><Trash2 size={16}/></button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

        </div>
      )}
    </>
  );
}

export default App;
