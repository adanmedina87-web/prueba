
import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";

// --- 1. DEFINICIÓN DE TIPOS ---
interface Product {
  id: string;
  name: string;
  category: string;
  quantity: number;
  location: string;
  arrivalDate: string;
  responsible: string;
  sku: string;
}

interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

enum AppSection {
  DASHBOARD = 'DASHBOARD',
  QUERY = 'QUERY',
  INVENTORY = 'INVENTORY',
  SETTINGS = 'SETTINGS'
}

// --- 2. CONSTANTES E ICONOS ---
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1PyR211FL1fAOqSYmMhsh7c7hY4jOfQRAwuQxhAqD_Zk/edit?usp=sharing';

const CustomLogo = () => (
  <img 
    src="https://yt3.ggpht.com/a-/AAuE7mAOAi4DgYrnVswYDrVeyBYZX0RPcjLf2EC6mw=s900-mo-c-c0xffffffff-rj-k-no" 
    alt="Logo Inventario"
    className="w-10 h-10 md:w-14 md:h-14 rounded-xl shadow-sm object-cover"
  />
);

const ICONS = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Inventory: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
};

// --- 3. COMPONENTE BUSCADOR ---
const AutocompleteSearch: React.FC<{ products: Product[], onSelect: (p: Product) => void }> = ({ products, onSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length > 1) {
      // Coincidencia parcial mejorada
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.location.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 10)); // Más sugerencias para búsquedas genéricas
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [query, products]);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Ej: 'Silla', 'Mesa', 'Pasillo A'..."
        className="w-full px-5 py-4 pl-12 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm font-medium"
      />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><ICONS.Search /></div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl overflow-hidden divide-y divide-slate-50 max-h-[400px] overflow-y-auto">
          {suggestions.map((p) => (
            <li key={p.id} onClick={() => { onSelect(p); setQuery(p.name); setIsOpen(false); }} className="px-5 py-4 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors">
              <div className="flex-1 pr-4">
                <p className="font-bold text-slate-800 text-sm uppercase tracking-tight">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.location}</p>
              </div>
              <div className="shrink-0 text-right">
                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-lg">CANT: {p.quantity}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- 4. APLICACIÓN PRINCIPAL ---
const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [inventory, setInventory] = useState<Product[]>(() => {
    const saved = localStorage.getItem('inv_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [sourceLink, setSourceLink] = useState(() => localStorage.getItem('inv_link_v2') || DEFAULT_SHEET_URL);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  
  // Chat States
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date>(new Date());
  const [closingMessage, setClosingMessage] = useState<string | null>(null);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('inv_v2', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('inv_link_v2', sourceLink); }, [sourceLink]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [chatMessages, isChatOpen]);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return "¡Buen día!";
    if (hour >= 12 && hour < 20) return "¡Buenas tardes!";
    return "¡Buenas noches!";
  };

  const closeChat = () => {
    if (!isChatOpen) return;
    setClosingMessage(`El chat se ha cerrado. ${getGreeting()} Que tengas una excelente jornada.`);
    setTimeout(() => {
      setIsChatOpen(false);
      setClosingMessage(null);
      setChatMessages([]);
    }, 4000);
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      closeChat();
    }, 60000); // 1 minuto
  };

  const syncData = async (silent = false) => {
    if (!sourceLink || !sourceLink.includes('docs.google.com/spreadsheets')) return;
    if (!silent) setIsSyncing(true);
    try {
      let url = sourceLink;
      if (url.includes('/edit')) url = url.split('/edit')[0] + '/export?format=csv';
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('<html') || text.trim() === '') throw new Error("No accesible");
      
      const rows = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(1);
      const newInv = rows.map((line, i) => {
        // Mejorado: Parser de CSV robusto que respeta espacios y celdas completas
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        
        return {
          id: `row-${i}-${Date.now()}`,
          quantity: parseInt(cols[0]?.replace(/[^0-9]/g, '')) || 0,
          name: cols[1] || 'Sin nombre',
          sku: 'S/N',
          location: cols[2] || 'Sin asignar',
          responsible: cols[3] || 'Desconocido',
          category: 'General',
          arrivalDate: new Date().toISOString()
        };
      });
      
      if (JSON.stringify(newInv) !== JSON.stringify(inventory)) setInventory(newInv);
      setLastSync(new Date());
    } catch (e: any) {
      if (!silent) alert("Error al conectar con la hoja de Google Sheets.");
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncData(true);
    const interval = setInterval(() => syncData(true), 30000);
    return () => clearInterval(interval);
  }, [sourceLink]);

  const askAi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const query = new FormData(form).get('q') as string;
    if (!query) return;

    resetInactivityTimer();
    const newUserMsg: ChatMessage = { role: 'user', text: query, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMsg]);
    form.reset();
    
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const context = JSON.stringify(inventory.map(i => ({ n: i.name, q: i.quantity, l: i.location, r: i.responsible })));
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Inventario: ${context}\nPregunta: ${query}`,
        config: { systemInstruction: "Eres el asistente de Inventario Bodega. Responde de forma muy breve, humana y amable. Si el usuario te indica que su duda fue resuelta o se despide, termina educadamente y confirma que cerrarás la sesión." }
      });
      const aiMsg: ChatMessage = { role: 'ai', text: res.text || 'No pude procesar la respuesta.', timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMsg]);
      
      // Si la IA detecta despedida, cerramos el chat después de un breve delay
      if (res.text?.toLowerCase().includes("hasta luego") || res.text?.toLowerCase().includes("adiós") || res.text?.toLowerCase().includes("resuelto")) {
        setTimeout(closeChat, 5000);
      }
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'system', text: 'Error de conexión con el servidor de inteligencia.', timestamp: new Date() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const navItems = [
    { id: AppSection.DASHBOARD, icon: <ICONS.Dashboard />, label: 'Inicio' },
    { id: AppSection.QUERY, icon: <ICONS.Search />, label: 'Consultar' },
    { id: AppSection.INVENTORY, icon: <ICONS.Inventory />, label: 'Lista' },
    { id: AppSection.SETTINGS, icon: <ICONS.Settings />, label: 'Config' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] pb-24 md:pb-0 font-['Plus_Jakarta_Sans']">
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-80 bg-white border-r border-slate-200 flex-col fixed h-full z-20 shadow-sm">
        <div className="p-8 flex items-center gap-4">
          <CustomLogo />
          <h1 className="font-black text-xl text-slate-800 tracking-tighter leading-none uppercase">Inventario<br/><span className="text-blue-600 text-lg">bodega</span></h1>
        </div>
        <nav className="flex-1 px-5 space-y-2 mt-4">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-sm ${activeSection === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-200' : 'text-slate-400 hover:bg-slate-50'}`}>
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-6 m-6 bg-slate-50 rounded-3xl border border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sincronizado</span>
          </div>
          <p className="text-[11px] font-bold text-slate-400 leading-tight">Actualizado: {lastSync.toLocaleTimeString()}</p>
        </div>
      </aside>

      {/* Contenido Principal */}
      <main className="flex-1 md:ml-80 p-5 md:p-12 max-w-6xl mx-auto w-full">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div className="md:hidden flex items-center gap-4 mb-2">
             <CustomLogo />
             <h1 className="font-black text-lg text-slate-800 tracking-tighter uppercase leading-none">Inventario<br/><span className="text-blue-600">bodega</span></h1>
          </div>
          <h2 className="text-2xl md:text-4xl font-black text-slate-800 tracking-tighter uppercase">
            {activeSection === AppSection.DASHBOARD && '📊 Resumen General'}
            {activeSection === AppSection.QUERY && '🔍 Consulta Rápida'}
            {activeSection === AppSection.INVENTORY && '📋 Lista Maestra'}
            {activeSection === AppSection.SETTINGS && '⚙️ Configuración'}
          </h2>
        </header>

        {activeSection === AppSection.DASHBOARD && (
          <div className="space-y-10 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-100 transition-colors">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Activos Registrados</p>
                <h3 className="text-4xl md:text-6xl font-black text-slate-800 mt-2">{inventory.length}</h3>
              </div>
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-100 transition-colors">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Stock Consolidado</p>
                <h3 className="text-4xl md:text-6xl font-black text-blue-600 mt-2">{inventory.reduce((a, b) => a + b.quantity, 0)}</h3>
              </div>
              <div className="bg-white p-8 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 hover:border-blue-100 transition-colors col-span-2 lg:col-span-1">
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest">Zonas Activas</p>
                <h3 className="text-4xl md:text-6xl font-black text-slate-800 mt-2">{new Set(inventory.map(i => i.location)).size}</h3>
              </div>
            </div>

            {/* Chat Trigger / Chat UI */}
            {!isChatOpen ? (
              <button 
                onClick={() => { setIsChatOpen(true); resetInactivityTimer(); }}
                className="w-full bg-blue-600 p-10 md:p-16 rounded-[3.5rem] shadow-2xl shadow-blue-200 text-white flex flex-col md:flex-row items-start md:items-center justify-between group hover:bg-blue-700 transition-all gap-8"
              >
                <div className="text-left max-w-lg">
                  <h4 className="text-2xl md:text-4xl font-black mb-4 uppercase tracking-tighter">🤖 ¿Tienes alguna duda?</h4>
                  <p className="text-blue-100 text-lg opacity-80 font-medium leading-tight">Consulta stock, ubicaciones o responsables mediante lenguaje natural.</p>
                </div>
                <div className="w-20 h-20 md:w-24 md:h-24 bg-white/10 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>
                </div>
              </button>
            ) : (
              <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[600px] animate-fade-in relative">
                {closingMessage && (
                  <div className="absolute inset-0 z-50 bg-white/95 backdrop-blur-md flex items-center justify-center p-12 text-center animate-fade-in">
                    <div className="space-y-6">
                      <div className="w-24 h-24 bg-blue-50 text-blue-600 rounded-full mx-auto flex items-center justify-center animate-bounce">
                        <CustomLogo />
                      </div>
                      <p className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">{closingMessage}</p>
                    </div>
                  </div>
                )}
                <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse"></div>
                    <span className="font-black text-sm uppercase tracking-[0.2em] text-slate-500">Asistente de Bodega</span>
                  </div>
                  <button onClick={closeChat} className="text-slate-400 hover:text-rose-500 transition-colors p-2 bg-white rounded-xl shadow-sm border border-slate-100">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 space-y-6 scrollbar-hide bg-[#fdfdfe]">
                  {chatMessages.length === 0 && (
                    <div className="text-center py-20">
                       <p className="text-slate-300 text-xs font-black uppercase tracking-[0.3em]">Sesión Iniciada</p>
                       <p className="text-slate-400 text-sm font-bold mt-2">¿Cómo puedo ayudarte con el stock hoy?</p>
                    </div>
                  )}
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                      <div className={`max-w-[85%] px-6 py-4 rounded-[1.8rem] text-sm md:text-base font-medium shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex justify-start animate-pulse">
                      <div className="bg-slate-50 border border-slate-100 px-6 py-4 rounded-[1.8rem] text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">El asistente está escribiendo...</div>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={askAi} className="p-6 bg-white border-t border-slate-100 flex gap-3">
                  <input name="q" placeholder="Escribe tu mensaje..." autoComplete="off" className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 outline-none focus:ring-4 focus:ring-blue-100 text-sm md:text-base font-bold transition-all" />
                  <button disabled={aiLoading} className="bg-blue-600 text-white p-4 rounded-2xl hover:bg-blue-700 disabled:opacity-50 transition-all shadow-xl shadow-blue-100 active:scale-95">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.QUERY && (
          <div className="max-w-4xl animate-fade-in space-y-12">
            <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-sm border border-slate-100">
              <h3 className="text-2xl font-black text-slate-800 mb-10 uppercase tracking-tighter">Buscador Inteligente</h3>
              <AutocompleteSearch products={inventory} onSelect={setSelectedProduct} />
            </div>
            {selectedProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                <div className="bg-white p-10 md:p-14 rounded-[3.5rem] shadow-2xl border border-blue-50">
                  <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-5 py-2 rounded-full shadow-inner">Información del Activo</span>
                  <h4 className="text-3xl md:text-4xl font-black text-slate-800 mt-8 leading-tight uppercase tracking-tighter">{selectedProduct.name}</h4>
                  <div className="mt-12 space-y-10">
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 text-2xl font-bold shadow-sm">📍</div>
                      <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación Actual</p><p className="text-xl text-slate-800 font-black uppercase tracking-tight">{selectedProduct.location}</p></div>
                    </div>
                  </div>
                </div>
                <div className="bg-blue-600 p-12 md:p-16 rounded-[3.5rem] text-white shadow-2xl shadow-blue-100 flex flex-col justify-center text-center">
                  <p className="text-blue-200 font-black uppercase text-xs tracking-[0.3em] mb-4">Stock Disponible</p>
                  <h5 className="text-8xl md:text-[9rem] font-black leading-none">{selectedProduct.quantity}</h5>
                  <p className="text-blue-100 text-[10px] font-black mt-4 opacity-70 uppercase tracking-widest">Unidades contabilizadas</p>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.INVENTORY && (
          <div className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-10 md:p-12 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
               <div>
                 <h3 className="font-black text-slate-800 text-2xl uppercase tracking-tighter">Reporte Maestro</h3>
                 <p className="text-xs text-slate-400 font-bold uppercase tracking-[0.2em] mt-1">Total: {inventory.length} activos registrados</p>
               </div>
              <button onClick={() => syncData()} disabled={isSyncing} className="w-full md:w-auto bg-blue-600 text-white px-10 py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-700 active:scale-95 transition-all">
                {isSyncing ? 'Sincronizando...' : 'Refrescar Datos'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest">
                  <tr><th className="px-10 py-8">Stock</th><th className="px-10 py-8">Nombre del Activo</th><th className="hidden lg:table-cell px-10 py-8">Lugar</th><th className="px-10 py-8">Encargado</th></tr>
                </thead>
                <tbody className="text-slate-600 text-sm divide-y divide-slate-50 font-medium">
                  {inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-10 py-8 font-black text-blue-600 text-2xl">{item.quantity}</td>
                      <td className="px-10 py-8 font-black text-slate-800 uppercase text-xs md:text-sm tracking-tight">{item.name}</td>
                      <td className="hidden lg:table-cell px-10 py-8 font-bold text-slate-400 uppercase text-[11px]">{item.location}</td>
                      <td className="px-10 py-8 font-black text-slate-400 uppercase text-[10px] tracking-widest">{item.responsible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === AppSection.SETTINGS && (
          <div className="max-w-3xl bg-white p-12 md:p-20 rounded-[4rem] shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-3xl font-black text-slate-800 mb-12 uppercase tracking-tighter">Configuración</h3>
            <div className="space-y-12">
              <div className="space-y-6">
                <label className="block text-[11px] font-black text-slate-400 uppercase tracking-[0.3em] ml-1">URL de Google Sheets Vinculada</label>
                <input type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} className="w-full px-8 py-6 bg-slate-50 border border-slate-200 rounded-[2rem] focus:ring-8 focus:ring-blue-50 outline-none text-sm font-bold shadow-inner transition-all" />
              </div>
              <div className="p-10 bg-blue-50 rounded-[2.5rem] border border-blue-100 shadow-sm">
                <p className="text-xs text-blue-600 font-black uppercase tracking-widest mb-2 flex items-center gap-2">
                   <span className="w-2 h-2 bg-blue-600 rounded-full"></span> Importante
                </p>
                <p className="text-[11px] text-blue-500 font-bold leading-relaxed uppercase tracking-tight">El sistema procesa celdas completas respetando espacios. Asegúrate de que tu hoja tenga las columnas: CANTIDAD, PRODUCTO, UBICACIÓN, RESPONSABLE en ese orden.</p>
              </div>
              <button onClick={() => syncData()} disabled={isSyncing || !sourceLink} className="w-full bg-blue-600 text-white font-black py-8 rounded-[2rem] shadow-2xl hover:bg-blue-700 active:scale-95 transition-all text-xs uppercase tracking-[0.4em]">
                Guardar y Sincronizar
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Navegación Móvil */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-xl border-t border-slate-100 px-6 py-5 flex justify-around items-center z-50 shadow-2xl">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} className={`flex flex-col items-center gap-2 transition-all ${activeSection === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`p-3 rounded-2xl transition-all ${activeSection === item.id ? 'bg-blue-50 scale-125 shadow-inner' : ''}`}>{item.icon}</div>
            <span className="text-[9px] font-black uppercase tracking-[0.2em]">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
