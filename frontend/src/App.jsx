import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, Legend, ScatterChart, Scatter, ZAxis } from 'recharts';
import { MapContainer, TileLayer, CircleMarker, Tooltip as LeafletTooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import './index.css';

const API_URL = import.meta.env.DEV ? "http://localhost:8000/api" : "/api";
const PIE_COLORS = ['#38bdf8', '#818cf8', '#c084fc', '#e879f9', '#f472b6', '#fb7185', '#fb923c'];

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 }
  }
};

const fadeUp = {
  hidden: { opacity: 0, y: 50, scale: 0.95 },
  visible: { 
      opacity: 1, y: 0, scale: 1, 
      transition: { type: "spring", stiffness: 70, damping: 20, mass: 1.2 } 
  }
};

function App() {
  const [activePage, setActivePage] = useState('home');
  const [theme, setTheme] = useState('light');
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({
        x: e.clientX,
        y: e.clientY
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  // Static Gurgaon State
  const [gurOpt, setGurOpt] = useState(null);
  const [gurForms, setGurForms] = useState({
    property_type: "flat", sector: "", bedRoom: 2, bathroom: 2, balcony: "2",
    agePossession: "", built_up_area: 1500, servant_room: 0, store_room: 0,
    furnishing_type: "semifurnished", luxury_category: "Medium", floor_category: "Mid Floor"
  });
  const [gurRes, setGurRes] = useState(null);
  
  // Analytics State
  const [anaOpt, setAnaOpt] = useState(null);
  const [anaFilters, setAnaFilters] = useState({ sector: 'All', property_type: 'All' });
  const [anaData, setAnaData] = useState(null);
  const [anaTab, setAnaTab] = useState('Overview');

  // Recommender State
  const [recOptions, setRecOptions] = useState(null);
  const [recTab, setRecTab] = useState('location');
  const [recLoc, setRecLoc] = useState('');
  const [recRadius, setRecRadius] = useState(50.0);
  const [recSearchRes, setRecSearchRes] = useState(null);
  const [recProp, setRecProp] = useState('');
  const [wLoc, setWLoc] = useState(30);
  const [wAmenities, setWAmenities] = useState(20);
  const [wFeatures, setWFeatures] = useState(8);
  const [topN, setTopN] = useState(10);
  const [recSimRes, setRecSimRes] = useState(null);

  // Dynamic ML State
  const [file, setFile] = useState(null);
  const [detectInfo, setDetectInfo] = useState(null);
  const [training, setTraining] = useState(false);
  const [trainRes, setTrainRes] = useState(null);
  const [dynOpt, setDynOpt] = useState(null);
  const [dynForms, setDynForms] = useState({});
  const [dynRes, setDynRes] = useState(null);

  // Primary Fetchers
  useEffect(() => {
    fetch(`${API_URL}/gurgaon/options`).then(res => res.json()).then(data => {
        setGurOpt(data);
        if(data.sector && data.sector.length > 0) setGurForms(f => ({...f, sector: data.sector[0], agePossession: data.agePossession[0]}))
    }).catch(console.error);

    fetch(`${API_URL}/recommender/options`).then(res => res.json()).then(data => {
        setRecOptions(data);
        if(data.locations?.length > 0) setRecLoc(data.locations[0]);
        if(data.properties?.length > 0) setRecProp(data.properties[0]);
    }).catch(console.error);
    
    fetch(`${API_URL}/analytics/interactive-options`).then(r => r.json()).then(setAnaOpt).catch(console.error);
  }, []);

  useEffect(() => {
     if(anaOpt) {
         fetch(`${API_URL}/analytics/interactive-data`, {
            method: 'POST', headers: {'Content-Type': 'application/json'},
            body: JSON.stringify(anaFilters)
         }).then(r => r.json()).then(setAnaData).catch(console.error);
     }
  }, [anaOpt, anaFilters.sector, anaFilters.property_type]);

  const handleGurgaonPredict = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_URL}/gurgaon/predict`, {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({...gurForms, bedRoom: Number(gurForms.bedRoom), bathroom: Number(gurForms.bathroom), built_up_area: Number(gurForms.built_up_area)})
      });
      const data = await res.json();
      if(res.ok) setGurRes(data);
    } catch(err) { alert(err.message); }
  }

  const handleLocationSearch = async (e) => {
     e.preventDefault();
     try {
       const res = await fetch(`${API_URL}/recommender/location`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ location: recLoc, radius_km: Number(recRadius) })
       });
       const data = await res.json();
       if(res.ok) setRecSearchRes(data.results);
     } catch(err) { alert(err.message); }
  }

  const handleSimilaritySearch = async (e) => {
     e.preventDefault();
     try {
       const res = await fetch(`${API_URL}/recommender/similarity`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ property_name: recProp, w_location: Number(wLoc), w_amenities: Number(wAmenities), w_features: Number(wFeatures), top_n: Number(topN) })
       });
       const data = await res.json();
       if(res.ok) setRecSimRes(data.results);
     } catch(err) { alert(err.message); }
  }

  const handleUpload = async (e) => {
    e.preventDefault();
    if(!file) return alert("Select a CSV file first!");
    const formData = new FormData(); formData.append('file', file);
    try {
       const res = await fetch(`${API_URL}/dynamic/upload`, { method: 'POST', body: formData });
       const dat = await res.json();
       if(res.ok) setDetectInfo(dat);
       else alert(dat.detail || "Upload error");
    } catch(err) { alert(err.message); }
  };

  const handleTrain = async () => {
     setTraining(true);
     try {
       const features = [detectInfo.mapping.location, detectInfo.mapping.area, detectInfo.mapping.bedrooms, detectInfo.mapping.bathrooms, ...detectInfo.mapping.features].filter(Boolean);
       const res = await fetch(`${API_URL}/dynamic/train`, {
          method: 'POST', headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({ target: detectInfo.mapping.target, features: [...new Set(features)] })
       });
       const dat = await res.json();
       if(res.ok) {
           setTrainRes(dat);
           const rOpt = await fetch(`${API_URL}/dynamic/options`);
           const optData = await rOpt.json();
           setDynOpt(optData);
           const initials = {};
           Object.keys(optData.options).forEach(k => { initials[k] = optData.options[k].type === 'numeric' ? optData.options[k].median : optData.options[k].values[0]; });
           setDynForms(initials);
           alert("Dynamic Pipeline Model Trained Successfully!");
       } else alert(dat.detail);
     } catch(err) { alert(err.message); }
     setTraining(false);
  };

  const handleDynPredict = async(e) => {
     e.preventDefault();
     try {
        const payload = {};
        Object.keys(dynForms).forEach(k => { payload[k] = dynOpt.options[k].type === 'numeric' ? Number(dynForms[k]) : dynForms[k]; });
        const res = await fetch(`${API_URL}/dynamic/predict`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({payload}) });
        const dat = await res.json();
        if(res.ok) setDynRes(dat.prediction);
     } catch(err) {}
  };

  const renderHome = () => (
    <>
      <section className="hero">
         <div className="hero-overlay"></div>
         <motion.div className="hero-content" variants={fadeUp} initial="hidden" animate="visible">
            <h1 style={{textShadow: theme === 'dark' ? '0 4px 10px rgba(0,0,0,0.5)' : 'none'}}>PriceNest</h1>
            <p style={{textShadow: theme === 'dark' ? '0 2px 5px rgba(0,0,0,0.5)' : 'none'}}>A real estate price prediction and market analysis platform.</p>
            <div style={{pointerEvents: 'auto'}}>
               <button onClick={() => window.scrollTo({top: window.innerHeight, behavior: 'smooth'})} className="btn-secondary" style={{textDecoration:'none', marginTop:'20px'}}>Explore Project</button>
            </div>
         </motion.div>
      </section>

      <motion.section className="section" style={{background:'var(--bg-secondary)', paddingBottom:'60px'}} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
         <h2 className="section-title">About Us</h2>
         <p className="section-subtitle">We centralize and decode real estate market physics across vast metropolitan scopes to empower buyers, sellers, and asset managers with instantaneous transparency.</p>
         <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'40px', marginTop:'60px'}}>
             <motion.div className="card" style={{borderTop:'4px solid #111827', margin:0}} whileHover={{ scale: 1.02, translateY: -5 }}>
                 <h3 style={{fontSize:'1.5rem', marginBottom:'15px', color:'var(--text)'}}>Data-Driven Clarity</h3>
                 <p style={{color:'var(--text-muted)'}}>Replacing geographical guesswork with rigorously trained, objective valuation regressions mapping massive localized real-world pricing datasets.</p>
             </motion.div>
             <motion.div className="card" style={{borderTop:'4px solid #38bdf8', margin:0}} whileHover={{ scale: 1.02, translateY: -5 }}>
                 <h3 style={{fontSize:'1.5rem', marginBottom:'15px', color:'var(--text)'}}>Democratized Technology</h3>
                 <p style={{color:'var(--text-muted)'}}>PriceNest runs powerful machine-learning architecture historically restricted to massive banking institutions, exposing it instantly to homebuyers.</p>
             </motion.div>
         </div>
      </motion.section>

      <motion.section className="section" initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
         <h2 className="section-title">How Our Model Works</h2>
         <p className="section-subtitle">A transparent view into our real estate machine learning inference cycle.</p>
         <div style={{display:'flex', flexDirection:'column', gap:'30px', marginTop:'50px'}}>
             <motion.div className="card" style={{display:'flex', alignItems:'center', gap:'30px', margin:0}} whileHover={{ scale: 1.01, translateX: 10 }}>
                <div style={{fontSize:'3rem', fontWeight:'900', color:'var(--card-border)', width:'50px'}}>01</div>
                <div><h3 style={{fontSize:'1.3rem', marginBottom:'8px'}}>Data Harvesting</h3><p style={{color:'var(--text-muted)'}}>We ingest historical transaction databases & correct missing structural dimensions natively.</p></div>
             </motion.div>
             <motion.div className="card" style={{display:'flex', alignItems:'center', gap:'30px', margin:0}} whileHover={{ scale: 1.01, translateX: 10 }}>
                <div style={{fontSize:'3rem', fontWeight:'900', color:'var(--card-border)', width:'50px'}}>02</div>
                <div><h3 style={{fontSize:'1.3rem', marginBottom:'8px'}}>Target Encoding</h3><p style={{color:'var(--text-muted)'}}>Categorical locations are naturally mathematically averaged protecting data shape scale.</p></div>
             </motion.div>
             <motion.div className="card" style={{display:'flex', alignItems:'center', gap:'30px', margin:0}} whileHover={{ scale: 1.01, translateX: 10 }}>
                <div style={{fontSize:'3rem', fontWeight:'900', color:'var(--card-border)', width:'50px'}}>03</div>
                <div><h3 style={{fontSize:'1.3rem', marginBottom:'8px'}}>Random Forest Predictors</h3><p style={{color:'var(--text-muted)'}}>Thousands of trees infer optimal weight limits across dimensions providing robust stability.</p></div>
             </motion.div>
         </div>
       </motion.section>

      <motion.section className="section" style={{background:'var(--bg)', paddingBottom: '20px'}} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}>
         <motion.h2 className="section-title" variants={fadeUp}>How Our Model Works</motion.h2>
         <motion.p className="section-subtitle" style={{maxWidth: '800px'}} variants={fadeUp}>This academic ML project leverages high fidelity geographic vectorization computing native predictions strictly.</motion.p>
         
         <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(300px, 1fr))', gap:'30px', marginTop:'40px', maxWidth: '1000px', margin: '0 auto'}}>
             <motion.div className="card" variants={fadeUp} style={{borderLeft: '4px solid #10b981'}}>
                 <h3 style={{fontSize:'1.2rem', marginBottom:'15px', color:'var(--text)'}}>1. Data Cleaning</h3>
                 <p style={{color:'var(--text-muted)'}}>We compiled thousands of residential footprints parsing explicit categorizations and isolating mathematical outliers resulting in natively pure predictive parameters natively.</p>
             </motion.div>
             <motion.div className="card" variants={fadeUp} style={{borderLeft: '4px solid #3b82f6'}}>
                 <h3 style={{fontSize:'1.2rem', marginBottom:'15px', color:'var(--text)'}}>2. Model Architecture</h3>
                 <p style={{color:'var(--text-muted)'}}>The prediction engine compiles variables mapped dynamically into a unified Random Forest Regressor yielding transparent asset forecasts seamlessly via the frontend natively.</p>
             </motion.div>
         </div>
      </motion.section>

      <motion.section className="section" style={{background:'var(--bg-secondary)'}} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={staggerContainer}>
         <motion.h2 className="section-title" variants={fadeUp}>Core Features</motion.h2>
         <motion.p className="section-subtitle" variants={fadeUp}>Select a module below to launch the dedicated interface seamlessly.</motion.p>
         <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(250px, 1fr))', gap:'25px', marginTop:'40px'}}>
             {[ 
               { id: 'estimator', title: 'Estimator', desc: 'Calculate local geographic pricing models.', color: '#f59e0b' }, 
               { id: 'analytics', title: 'Analysis App', desc: 'Deep statistical mapping and heatmap charting features.', color: '#3b82f6' }, 
               { id: 'recommender', title: 'Similarity Engine', desc: 'Mathematical identical feature cross-referencing algorithms.', color: '#10b981' }, 
               { id: 'datasets', title: 'Dataset Export', desc: 'Export CSV configurations of native model vectors.', color: '#8b5cf6' } 
             ].map(feat => (
               <motion.div key={feat.id} className="card feature-card" onClick={() => { setActivePage(feat.id); window.scrollTo(0,0); }} 
                           style={{cursor:'pointer', borderTop:`4px solid ${feat.color}`, margin:0}}
                           variants={fadeUp}>
                   <h3 style={{fontSize:'1.5rem', marginBottom:'10px', color:'var(--text)'}}>{feat.title}</h3>
                   <p style={{color:'var(--text-muted)'}}>{feat.desc}</p>
               </motion.div>
             ))}
         </div>
      </motion.section>

      <motion.section className="section" style={{textAlign:'center', paddingBottom:'20px'}} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-50px" }} variants={fadeUp}>
         <h2 className="section-title" style={{fontSize: '3rem'}}>Ready to Predict?</h2>
         <p className="section-subtitle">A simple, transparent environment unifying complex ML inferences instantly.</p>
         <motion.img 
            src="/house_3d_illustration.png" 
            alt="Real Estate 3D Model" 
            style={{maxWidth:'600px', width:'100%', margin:'0 auto', display:'block'}}
            animate={{y: [0, -20, 0]}} 
            transition={{duration: 5, repeat: Infinity, ease: "easeInOut"}}
         />
      </motion.section>
      <section className="section" style={{padding:'100px 50px'}}>
         <h2 className="section-title">Deploy Custom Intelligence.</h2>
         <p className="section-subtitle">Upload any residential CSV footprint globally to train a custom ML architecture isolated to your dataset instantly.</p>
         <div className="card">
            <form onSubmit={handleUpload} style={{display:'flex', gap:'20px', alignItems:'flex-end'}}>
               <div className="input-field" style={{flex:1}}>
                 <label>Attach CSV Payload</label>
                 <input type="file" accept=".csv" onChange={(e) => setFile(e.target.files[0])} style={{padding:'7px'}}/>
               </div>
               <button type="submit" className="btn-secondary" style={{width:'auto', padding:'12px 24px', margin:0, marginBottom:'2px'}}>Inspect Schema</button>
            </form>
            {detectInfo && (
               <div style={{marginTop:'30px', padding:'25px', backgroundColor:'var(--accent-green-bg)', border:'1px solid var(--accent-green-border)', borderRadius:'10px'}}>
                 <h3 style={{fontSize:'1.2rem', marginBottom:'10px', color:'var(--accent-green-text)'}}>Architecture Identified</h3>
                 <ul style={{marginBottom:'20px', color:'var(--accent-green-text)', lineHeight:'1.8'}}>
                    <li>Target Variable (Price): <strong>{detectInfo.mapping.target}</strong></li>
                    <li>Records Extracted: <strong>{detectInfo.rows.toLocaleString()} Rows</strong></li>
                 </ul>
                 <button onClick={handleTrain} disabled={training} className="btn-primary" style={{marginTop:0, backgroundColor:'#166534', color:'white'}}>
                   {training ? 'Training Trees...' : 'Compile ML Engine'}
                 </button>
               </div>
            )}
         </div>
         {dynOpt && (
            <div className="card" style={{marginTop:'30px', borderTop:'5px solid #111827'}}>
               <h3 style={{marginBottom:'20px', fontSize:'1.5rem'}}>Custom Predictor ({dynOpt.target})</h3>
               <form onSubmit={handleDynPredict}>
                  <div className="form-grid">
                    {Object.keys(dynForms).map(k => (
                      <div className="input-field" key={k}>
                         <label>{k}</label>
                         {dynOpt.options[k].type === 'numeric' ? (
                            <input type="number" step="any" value={dynForms[k]} onChange={e => setDynForms({...dynForms, [k]: e.target.value})} />
                         ) : (
                            <select value={dynForms[k]} onChange={e => setDynForms({...dynForms, [k]: e.target.value})}>
                              {dynOpt.options[k].values.map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                         )}
                      </div>
                    ))}
                  </div>
                  <button type="submit" className="btn-primary">Calculate Target</button>
               </form>
               {dynRes && (
                 <div className="result-box">
                    <h4>Custom Output ({dynOpt.target})</h4>
                    <h3>{dynRes.toLocaleString(undefined, {maximumFractionDigits:2})}</h3>
                 </div>
               )}
            </div>
         )}
      </section>
    </>
  );

  const renderAnalytics = () => (
      <section className="section" style={{paddingTop:'120px', minHeight:'80vh', maxWidth:'1400px'}}>
         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <div>
               <h2 className="section-title" style={{margin:0, textAlign:'left'}}>Real Estate Market Intelligence</h2>
               <p style={{color:'var(--text-muted)', marginTop:'5px'}}>Data-driven sector analytics and valuation insights</p>
            </div>
            <button className="btn-secondary" onClick={() => setActivePage('home')} style={{marginTop:0, padding:'10px 20px'}}>← Back to Home</button>
         </div>
         
         {!anaOpt || !anaData ? <div style={{padding:'50px', textAlign:'center', color:'var(--text-muted)'}}>Initializing Data Arrays...</div> : (
            <>
              {/* Dynamic Filters */}
              <div style={{display:'flex', gap:'20px', marginBottom:'30px', borderBottom:'1px solid var(--card-border)', paddingBottom:'30px'}}>
                 <div className="input-field" style={{flex:2}}>
                    <label>Select Sector</label>
                    <select value={anaFilters.sector} onChange={e => setAnaFilters({...anaFilters, sector: e.target.value})}>
                       {anaOpt.sectors.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
                 <div className="input-field" style={{flex:1}}>
                    <label>Property Type</label>
                    <select value={anaFilters.property_type} onChange={e => setAnaFilters({...anaFilters, property_type: e.target.value})}>
                       {anaOpt.types.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>
              </div>

              {/* TABS */}
              <div style={{display:'flex', gap:'20px', borderBottom:'1px solid var(--card-border)', paddingBottom:'10px', marginBottom:'40px'}}>
                  {['Overview', 'Analytics', 'Amenities'].map(t => (
                      <span key={t} onClick={()=>setAnaTab(t)} style={{cursor:'pointer', fontWeight:anaTab===t?700:500, color:anaTab===t?'#ef4444':'var(--text-muted)', borderBottom:anaTab===t?'2px solid #ef4444':'none', paddingBottom:'8px', fontSize:'1.1rem'}}>{t}</span>
                  ))}
              </div>

              {/* TAB VIEWS */}
              {anaTab === 'Overview' && (
                 <div>
                    <h3 style={{fontSize:'1.6rem', marginBottom:'25px'}}>Key Metrics</h3>
                    <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:'30px', marginBottom:'50px'}}>
                       <div className="card" style={{margin:0, backgroundColor:'var(--bg-secondary)', border:'none', boxShadow:'none'}}>
                          <div style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>Average Price</div>
                          <div style={{fontSize:'2.2rem', fontWeight:600, marginTop:'8px'}}>₹ {anaData.metrics.avg_price.toLocaleString()}</div>
                       </div>
                       <div className="card" style={{margin:0, backgroundColor:'var(--bg-secondary)', border:'none', boxShadow:'none'}}>
                          <div style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>Avg Price / Sqft</div>
                          <div style={{fontSize:'2.2rem', fontWeight:600, marginTop:'8px'}}>₹ {anaData.metrics.avg_sqft.toLocaleString()}</div>
                       </div>
                       <div className="card" style={{margin:0, backgroundColor:'var(--bg-secondary)', border:'none', boxShadow:'none'}}>
                          <div style={{fontSize:'0.9rem', color:'var(--text-muted)'}}>Average Area (Sqft)</div>
                          <div style={{fontSize:'2.2rem', fontWeight:600, marginTop:'8px'}}>{anaData.metrics.avg_area.toLocaleString()}</div>
                       </div>
                    </div>

                    <h3 style={{fontSize:'1.6rem', marginBottom:'20px'}}>Sector Distribution Map</h3>
                    <div style={{width:'100%', height:'550px', borderRadius:'14px', overflow:'hidden', border: '1px solid var(--card-border)'}}>
                       <MapContainer center={[28.4595, 77.0266]} zoom={11} style={{height: '100%', width: '100%'}}>
                          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="© OpenStreetMap" />
                          {anaData.map_points.map((pt, i) => (
                             <CircleMarker key={i} center={[pt.lat, pt.lng]} radius={Math.max(pt.area / 150, 5)} 
                                pathOptions={{fillColor: '#ef4444', fillOpacity: 0.8, color: 'white', weight: 1}}>
                                <LeafletTooltip>
                                   <div style={{textAlign:'center'}}>
                                      <strong>{pt.sector}</strong><br/>
                                      Price: ₹{pt.price}Cr<br/>
                                      Price/Sqft: ₹{pt.sqft_price}<br/>
                                      Area: {pt.area} Sqft
                                   </div>
                                </LeafletTooltip>
                             </CircleMarker>
                          ))}
                       </MapContainer>
                    </div>
                 </div>
              )}

              {anaTab === 'Analytics' && (
                 <div>
                    <h3 style={{fontSize:'1.6rem', marginBottom:'25px'}}>Area vs Price Distribution</h3>
                    <div className="card" style={{margin:0, padding:'30px', marginBottom:'40px'}}>
                       <ResponsiveContainer width="100%" height={450}>
                          <ScatterChart margin={{top: 20, right: 20, bottom: 20, left: 20}}>
                             <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" />
                             <XAxis type="number" dataKey="built_up_area" name="Area" unit=" sqft" tick={{fill:'var(--text-muted)'}} />
                             <YAxis type="number" dataKey="price" name="Price" unit=" Cr" tick={{fill:'var(--text-muted)'}} />
                             <ZAxis type="number" dataKey="bedRoom" name="BHK" range={[60, 200]} />
                             <RechartsTooltip cursor={{strokeDasharray: '3 3'}} contentStyle={{backgroundColor:'var(--card-bg)', color:'var(--text)', border:'1px solid var(--card-border)'}} />
                             <Scatter name="Properties" data={anaData.scatter} fill="#38bdf8" opacity={0.7} />
                          </ScatterChart>
                       </ResponsiveContainer>
                    </div>

                    <h3 style={{fontSize:'1.6rem', marginBottom:'25px'}}>BHK Distribution</h3>
                    <div style={{display:'flex', gap:'30px', marginBottom:'40px'}}>
                       <div className="card" style={{flex:1, margin:0, padding:'30px'}}>
                          <ResponsiveContainer width="100%" height={350}>
                             <PieChart>
                                <Pie data={anaData.pie} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={120} label>
                                   {anaData.pie.map((e, index) => <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />)}
                                </Pie>
                                <RechartsTooltip contentStyle={{backgroundColor:'var(--card-bg)', color:'var(--text)', border:'1px solid var(--card-border)'}}/>
                                <Legend />
                             </PieChart>
                          </ResponsiveContainer>
                       </div>
                       
                       <div className="card" style={{flex:1, margin:0, padding:'30px'}}>
                          <h4 style={{textAlign:'center', marginBottom:'20px'}}>Side by Side BHK Price Comparison</h4>
                          <ResponsiveContainer width="100%" height={300}>
                             <BarChart data={anaData.bar} margin={{left: 0}}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                                <XAxis dataKey="bhk" tick={{fill:'var(--text-muted)'}} />
                                <YAxis tick={{fill:'var(--text-muted)'}} tickFormatter={v=>`₹${v}Cr`} />
                                <RechartsTooltip cursor={{fill: 'var(--bg-secondary)'}} contentStyle={{backgroundColor:'var(--card-bg)', color:'var(--text)', border:'1px solid var(--card-border)'}} />
                                <Bar dataKey="avg_price" fill="#ef4444" radius={[6, 6, 0, 0]} />
                             </BarChart>
                          </ResponsiveContainer>
                       </div>
                    </div>
                 </div>
              )}

              {anaTab === 'Amenities' && (
                 <div style={{padding:'60px 20px', textAlign:'center'}}>
                    <h3 style={{fontSize:'1.8rem', marginBottom:'20px'}}>Amenities & Feature Insights</h3>
                    <p style={{color:'var(--text-muted)', fontSize:'1.2rem', maxWidth:'700px', margin:'0 auto'}}>Native WordCloud generation is historically computed server-side directly into static bytes. As PriceNest dynamically fetches exact localized parameters, interactive graphical clustering is processed inside the Analytics Tab arrays implicitly bypassing static images.</p>
                 </div>
              )}
            </>
         )}
      </section>
  );

  const renderEstimator = () => (
      <section className="section" style={{paddingTop:'120px', minHeight:'80vh'}}>
         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'40px'}}>
            <h2 className="section-title" style={{margin:0}}>Terminal Estimator Dashboard</h2>
            <button className="btn-secondary" onClick={() => setActivePage('home')} style={{marginTop:0, padding:'10px 20px'}}>← Back to Home</button>
         </div>
         <p className="section-subtitle" style={{marginLeft:0, textAlign:'left'}}>Instantly calculate asset baseline estimates mapped specifically over active residential areas.</p>
         
         <div className="card">
            {!gurOpt ? <p style={{color:'var(--text-muted)'}}>Loading Market Parameters...</p> : (
               <form onSubmit={handleGurgaonPredict}>
                  <div className="form-group" style={{marginBottom:'20px'}}>
                     <label style={{fontSize:'0.85rem', color:'var(--text-muted)', textTransform:'uppercase', fontWeight:'600', marginBottom:'8px', display:'block'}}>Sector Location</label>
                     <select className="form-control" style={{width:'100%', padding:'12px', border:'1px solid var(--input-border)', borderRadius:'10px', background:'var(--input-bg)', color:'var(--text)'}} 
                        value={gurForms.sector} onChange={e => setGurForms({...gurForms, sector: e.target.value})}>
                        {gurOpt.sector.map(s => <option key={s} value={s}>{s}</option>)}
                     </select>
                  </div>
                  <div className="form-grid" style={{marginTop:'20px'}}>
                     <div className="input-field"><label>Property Type</label><select value={gurForms.property_type} onChange={e => setGurForms({...gurForms, property_type: e.target.value})}>{gurOpt.property_type.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                     <div className="input-field"><label>Square Footage (Area)</label><input type="number" value={gurForms.built_up_area} onChange={e => setGurForms({...gurForms, built_up_area: e.target.value})} /></div>
                     <div className="input-field"><label>Bedrooms</label><input type="number" value={gurForms.bedRoom} onChange={e => setGurForms({...gurForms, bedRoom: e.target.value})} /></div>
                     <div className="input-field"><label>Age & Possession</label><select value={gurForms.agePossession} onChange={e => setGurForms({...gurForms, agePossession: e.target.value})}>{gurOpt.agePossession.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                     <div className="input-field"><label>Luxury Category</label><select value={gurForms.luxury_category} onChange={e => setGurForms({...gurForms, luxury_category: e.target.value})}>{gurOpt.luxury_category.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                     <div className="input-field"><label>Floor Context</label><select value={gurForms.floor_category} onChange={e => setGurForms({...gurForms, floor_category: e.target.value})}>{gurOpt.floor_category.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  </div>
                  <button type="submit" className="btn-primary" style={{marginTop:'30px'}}>Generate Estimate</button>
               </form>
            )}
            {gurRes && (
               <div className="result-box">
                  <h4>Calculated Asset Valuation</h4>
                  <h3>₹ {gurRes.predicted.toLocaleString()} Cr</h3>
                  <p style={{color:'var(--text-muted)', marginTop:'5px'}}>Estimated Variance Range: ₹ {gurRes.low.toLocaleString()} Cr to ₹ {gurRes.high.toLocaleString()} Cr</p>
               </div>
            )}
         </div>
      </section>
  );

  const renderRecommender = () => (
      <section className="section" style={{paddingTop:'120px', minHeight:'80vh', maxWidth:'1400px'}}>
         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'30px'}}>
            <h2 className="section-title" style={{margin:0}}>Real Estate Recommendation Dashboard</h2>
            <button className="btn-secondary" onClick={() => setActivePage('home')} style={{marginTop:0, padding:'10px 20px'}}>← Back to Home</button>
         </div>

         {!recOptions ? <p>Loading Intelligence Matrices...</p> : (
            <div style={{display:'flex', gap:'40px', alignItems:'flex-start', flexWrap:'wrap'}}>
               <div className="card" style={{flex:'1 1 300px', minWidth:'250px', background:'var(--bg-secondary)', position:'sticky', top:'100px'}}>
                   <h3 style={{fontSize:'1.3rem', marginBottom:'20px'}}>Model Configuration</h3>
                   
                   <div style={{marginBottom:'25px'}}>
                      <label style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'5px'}}>
                        <span>Location Weight</span><span style={{color:'var(--accent-green-price)', fontWeight:'700'}}>{wLoc}</span>
                      </label>
                      <input type="range" min="0" max="50" value={wLoc} onChange={e=>setWLoc(e.target.value)} style={{width:'100%', accentColor:'var(--accent-green-price)'}} />
                   </div>
                   
                   <div style={{marginBottom:'25px'}}>
                      <label style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'5px'}}>
                        <span>Amenities Weight</span><span style={{color:'var(--accent-green-price)', fontWeight:'700'}}>{wAmenities}</span>
                      </label>
                      <input type="range" min="0" max="50" value={wAmenities} onChange={e=>setWAmenities(e.target.value)} style={{width:'100%', accentColor:'var(--accent-green-price)'}} />
                   </div>

                   <div style={{marginBottom:'25px'}}>
                      <label style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'5px'}}>
                        <span>Features Weight</span><span style={{color:'var(--accent-green-price)', fontWeight:'700'}}>{wFeatures}</span>
                      </label>
                      <input type="range" min="0" max="50" value={wFeatures} onChange={e=>setWFeatures(e.target.value)} style={{width:'100%', accentColor:'var(--accent-green-price)'}} />
                   </div>

                   <div style={{marginBottom:'25px'}}>
                      <label style={{display:'flex', justifyContent:'space-between', color:'var(--text-muted)', fontSize:'0.9rem', marginBottom:'5px'}}>
                        <span>Top Recommendations</span><span style={{color:'var(--accent-green-price)', fontWeight:'700'}}>{topN}</span>
                      </label>
                      <input type="range" min="5" max="50" value={topN} onChange={e=>setTopN(e.target.value)} style={{width:'100%', accentColor:'var(--accent-green-price)'}} />
                   </div>
               </div>

               <div style={{flex:'3 1 700px'}}>
                  <div style={{display:'flex', gap:'20px', borderBottom:'1px solid var(--card-border)', paddingBottom:'10px', marginBottom:'30px'}}>
                      <span onClick={()=>setRecTab('location')} style={{cursor:'pointer', fontWeight:recTab==='location'?700:500, color:recTab==='location'?'var(--text)':'var(--text-muted)', borderBottom:recTab==='location'?'2px solid var(--text)':'none', paddingBottom:'8px'}}>Location-Based Search</span>
                      <span onClick={()=>setRecTab('similarity')} style={{cursor:'pointer', fontWeight:recTab==='similarity'?700:500, color:recTab==='similarity'?'var(--text)':'var(--text-muted)', borderBottom:recTab==='similarity'?'2px solid var(--text)':'none', paddingBottom:'8px'}}>Similarity Engine</span>
                  </div>

                  {recTab === 'location' && (
                      <div>
                          <form onSubmit={handleLocationSearch} style={{display:'flex', gap:'20px', alignItems:'flex-end', marginBottom:'30px'}}>
                              <div className="input-field" style={{flex:2}}>
                                <label>Select Location</label>
                                <select value={recLoc} onChange={e=>setRecLoc(e.target.value)}>
                                   {recOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div className="input-field" style={{flex:1}}>
                                <label>Radius (in kms)</label>
                                <input type="number" step="0.5" min="0" value={recRadius} onChange={e=>setRecRadius(e.target.value)} />
                              </div>
                              <button type="submit" className="btn-primary" style={{margin:0, width:'auto', padding:'14px 24px'}}>Search Properties</button>
                          </form>
                          
                          {recSearchRes && (
                              <div className="card" style={{padding:'20px', overflowX:'auto'}}>
                                 {recSearchRes.length === 0 ? <p>No properties found within {recRadius} km.</p> : (
                                     <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
                                        <thead>
                                           <tr style={{borderBottom:'1px solid var(--card-border)'}}><th style={{padding:'12px', color:'var(--text-muted)', fontWeight:500}}>Property</th><th style={{padding:'12px', color:'var(--text-muted)', fontWeight:500}}>Distance (km)</th></tr>
                                        </thead>
                                        <tbody>
                                           {recSearchRes.map((r, i) => (
                                              <tr key={i} style={{borderBottom:'1px solid var(--card-border)'}}><td style={{padding:'12px', color:'var(--text)'}}>{r.property}</td><td style={{padding:'12px', color:'var(--text)'}}>{r.distance_km}</td></tr>
                                           ))}
                                        </tbody>
                                     </table>
                                 )}
                              </div>
                          )}
                      </div>
                  )}

                  {recTab === 'similarity' && (
                      <div>
                          <form onSubmit={handleSimilaritySearch} style={{display:'flex', gap:'20px', alignItems:'flex-end', marginBottom:'30px'}}>
                              <div className="input-field" style={{flex:1}}>
                                <label>Select Property Framework</label>
                                <select value={recProp} onChange={e=>setRecProp(e.target.value)}>
                                   {recOptions.properties.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                              </div>
                              <button type="submit" className="btn-primary" style={{margin:0, width:'auto', padding:'14px 24px'}}>Generate Recommendations</button>
                          </form>
                          
                          {recSimRes && (
                              <div className="card" style={{padding:'20px', overflowX:'auto'}}>
                                 <table style={{width:'100%', textAlign:'left', borderCollapse:'collapse'}}>
                                    <thead><tr style={{borderBottom:'1px solid var(--card-border)'}}><th style={{padding:'12px', color:'var(--text-muted)', fontWeight:500}}>Recommended Property</th><th style={{padding:'12px', color:'var(--text-muted)', fontWeight:500}}>Similarity Score</th></tr></thead>
                                    <tbody>
                                       {recSimRes.map((r, i) => (
                                          <tr key={i} style={{borderBottom:'1px solid var(--card-border)'}}><td style={{padding:'12px', color:'var(--text)', fontWeight:600}}>{r.property}</td><td style={{padding:'12px', color:'var(--accent-green-price)'}}>{r.score}</td></tr>
                                       ))}
                                    </tbody>
                                 </table>
                              </div>
                          )}
                      </div>
                  )}
               </div>
            </div>
         )}
      </section>
  );

  const renderDatasets = () => (
      <section className="section" style={{paddingTop:'120px', minHeight:'80vh'}}>
         <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
            <h2 className="section-title" style={{margin:0}}>Data Output Hub</h2>
            <button className="btn-secondary" onClick={() => setActivePage('home')} style={{marginTop:0, padding:'10px 20px'}}>← Back to Home</button>
         </div>
         <p className="section-subtitle" style={{marginLeft:0, textAlign:'left', maxWidth:'800px', marginBottom:'40px'}}>Securely download fully structured, cleaned, and heavily vectorized geographic data frames prepared natively by PriceNest.</p>
         
         <div className="card" style={{borderLeft:'5px solid #8b5cf6'}}>
             <h3 style={{fontSize:'1.5rem', marginBottom:'10px', color:'var(--text)'}}>Native Cleaned Market Frame</h3>
             <p style={{color:'var(--text-muted)', marginBottom:'30px'}}>This exact dataset trains our models natively. Contains over 3,000 uniquely tracked variables including precise target prices automatically synthesized alongside categorical metadata representing accurate local variables.</p>
             <button className="btn-primary" style={{width:'auto', margin:0, backgroundColor:'#8b5cf6', color:'white'}} 
                     onClick={() => window.open(`${API_URL}/datasets/download/gurgaon`, '_blank')}>
                Download CSV Frame
             </button>
         </div>
      </section>
  );

  return (
    <>
      <motion.div
         className="cursor-glow"
         animate={{ x: mousePosition.x - 200, y: mousePosition.y - 200 }}
         transition={{ type: "spring", damping: 30, stiffness: 200, mass: 0.5 }}
      />
      
      <nav className="navbar" style={{backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', background: theme === 'dark' ? 'rgba(6, 9, 19, 0.7)' : 'rgba(255,255,255,0.7)', zIndex: 50}}>
        <div style={{display:'flex', alignItems:'center'}}>
           <h2 onClick={() => { setActivePage('home'); window.scrollTo(0,0); }} style={{cursor:'pointer', margin:0}}>PriceNest.</h2>
           <button onClick={toggleTheme} className="theme-toggle">{theme === 'light' ? '🌙' : '☀️'}</button>
        </div>
        <div className="nav-links">
           <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('home'); window.scrollTo(0,0); }} style={{color: activePage==='home'?'var(--nav-text-hover)':'var(--text-muted)', fontWeight: activePage==='home'?700:500}}>Home</a>
           <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('estimator'); window.scrollTo(0,0); }} style={{color: activePage==='estimator'?'var(--nav-text-hover)':'var(--text-muted)', fontWeight: activePage==='estimator'?700:500}}>Estimator</a>
           <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('analytics'); window.scrollTo(0,0); }} style={{color: activePage==='analytics'?'var(--nav-text-hover)':'var(--text-muted)', fontWeight: activePage==='analytics'?700:500}}>Analysis App</a>
           <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('recommender'); window.scrollTo(0,0); }} style={{color: activePage==='recommender'?'var(--nav-text-hover)':'var(--text-muted)', fontWeight: activePage==='recommender'?700:500}}>Similarity Engine</a>
           <a href="#" onClick={(e) => {e.preventDefault(); setActivePage('datasets'); window.scrollTo(0,0); }} style={{color: activePage==='datasets'?'var(--nav-text-hover)':'var(--text-muted)', fontWeight: activePage==='datasets'?700:500}}>Data Hub</a>
        </div>
      </nav>

      <main style={{minHeight: '80vh', paddingBottom: '40px', position: 'relative', zIndex: 10 }}>
         {activePage === 'home' && renderHome()}
         {activePage === 'estimator' && renderEstimator()}
         {activePage === 'analytics' && renderAnalytics()}
         {activePage === 'recommender' && renderRecommender()}
         {activePage === 'datasets' && renderDatasets()}
      </main>

      <footer style={{padding:'40px', textAlign:'center', background:'#111827', color:'#9ca3af', fontSize:'0.9rem'}}>
         <p>© 2026 PriceNest. All rights reserved.</p>
      </footer>
    </>
  )
}

export default App;
