
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
  link: string; 
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
    className="w-7 h-7 md:w-9 md:h-9 rounded-lg shadow-sm object-cover"
  />
);

const ICONS = {
  Dashboard: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Search: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>,
  Inventory: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Settings: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  ExternalLink: () => <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  DocumentIcon: () => <svg className="w-6 h-6 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
};

// --- 3. FUNCIONES DE UTILIDAD ---
const extractDriveThumbnail = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                url.match(/id=([a-zA-Z0-9_-]{25,})/);
  
  if (match && match[1]) {
    // Si el archivo está compartido como "Cualquier persona con el enlace", lh3 debería funcionar.
    // Como alternativa también existe https://drive.google.com/thumbnail?id=ID&sz=w800
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return null;
};

// --- 4. COMPONENTE BUSCADOR ---
const AutocompleteSearch: React.FC<{ products: Product[], onSelect: (p: Product) => void }> = ({ products, onSelect }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length > 1) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(query.toLowerCase()) || 
        p.location.toLowerCase().includes(query.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 10));
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
        placeholder="¿Qué activo buscas?"
        className="w-full px-4 py-3 pl-10 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-xs font-medium"
      />
      <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"><ICONS.Search /></div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-50 max-h-[220px] overflow-y-auto">
          {suggestions.map((p) => (
            <li key={p.id} onClick={() => { onSelect(p); setQuery(p.name); setIsOpen(false); }} className="px-4 py-2 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors">
              <div className="flex-1 pr-3">
                <p className="font-bold text-slate-800 text-[10px] uppercase tracking-tight">{p.name}</p>
                <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{p.location}</p>
              </div>
              <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md shrink-0">CANT: {p.quantity}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

// --- 5. APLICACIÓN PRINCIPAL ---
const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [inventory, setInventory] = useState<Product[]>(() => {
    const saved = localStorage.getItem('inv_v2');
    return saved ? JSON.parse(saved) : [];
  });
  const [sourceLink, setSourceLink] = useState(() => localStorage.getItem('inv_link_v2') || DEFAULT_SHEET_URL);
  
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

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

  const syncData = async (silent = false) => {
    if (!sourceLink || !sourceLink.includes('docs.google.com/spreadsheets')) return;
    if (!silent) setIsSyncing(true);
    try {
      let url = sourceLink;
      if (url.includes('/edit')) url = url.split('/edit')[0] + '/export?format=csv';
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('<html') || text.trim() === '') throw new Error("Hoja no pública");
      
      const rows = text.split(/\r?\n/).filter(line => line.trim() !== '').slice(1);
      const newInv = rows.map((line, i) => {
        const cols = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, ''));
        return {
          id: `item-${i}-${Date.now()}`,
          quantity: parseInt(cols[0]?.replace(/[^0-9]/g, '')) || 0,
          name: cols[1] || 'Sin nombre',
          sku: 'S/N',
          location: cols[2] || 'Sin asignar',
          responsible: cols[3] || 'Desconocido',
          link: cols[4] || '', 
          category: 'General',
          arrivalDate: new Date().toISOString()
        };
      });
      
      if (JSON.stringify(newInv) !== JSON.stringify(inventory)) setInventory(newInv);
    } catch (e: any) {
      if (!silent) alert(`Error: ${e.message}`);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncData(true);
    const interval = setInterval(() => syncData(true), 60000);
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
        config: { systemInstruction: "Responde de forma muy breve sobre stock y ubicación." }
      });
      const aiMsg: ChatMessage = { role: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'system', text: 'Error.', timestamp: new Date() }]);
    } finally {
      setAiLoading(false);
    }
  };

  const resetInactivityTimer = () => {
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    inactivityTimer.current = setTimeout(() => {
      setIsChatOpen(false);
      setChatMessages([]);
    }, 60000); 
  };

  const navItems = [
    { id: AppSection.DASHBOARD, icon: <ICONS.Dashboard />, label: 'Inicio' },
    { id: AppSection.QUERY, icon: <ICONS.Search />, label: 'Consultar' },
    { id: AppSection.INVENTORY, icon: <ICONS.Inventory />, label: 'Lista' },
    { id: AppSection.SETTINGS, icon: <ICONS.Settings />, label: 'Config' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] pb-16 md:pb-0 font-['Plus_Jakarta_Sans']">
      {/* Sidebar - Compacto */}
      <aside className="hidden md:flex w-52 bg-white border-r border-slate-200 flex-col fixed h-full z-20 shadow-sm">
        <div className="p-5 flex items-center gap-2">
          <CustomLogo />
          <h1 className="font-bold text-sm text-slate-800 tracking-tight leading-none uppercase">Stock<br/><span className="text-blue-600">Bodega</span></h1>
        </div>
        <nav className="flex-1 px-3 space-y-1 mt-1">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl transition-all font-bold text-[10px] ${activeSection === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-50'}`}>
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-3 m-2 bg-slate-50 rounded-xl border border-slate-100">
          <p className="text-[9px] font-bold text-slate-400 leading-tight">Activos: {inventory.length}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-52 p-4 md:p-8 max-w-4xl mx-auto w-full">
        <header className="flex justify-between items-center mb-6">
          <h2 className="text-lg md:text-xl font-black text-slate-800 tracking-tighter uppercase">
            {activeSection === AppSection.DASHBOARD && 'Resumen'}
            {activeSection === AppSection.QUERY && 'Consulta'}
            {activeSection === AppSection.INVENTORY && 'Inventario'}
            {activeSection === AppSection.SETTINGS && 'Configuración'}
          </h2>
          <div className="md:hidden">
            <CustomLogo />
          </div>
        </header>

        {activeSection === AppSection.DASHBOARD && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Activos</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">{inventory.length}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
                <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Stock Total</p>
                <h3 className="text-xl md:text-2xl font-black text-blue-600 mt-0.5">{inventory.reduce((acc, curr) => acc + curr.quantity, 0)}</h3>
              </div>
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 col-span-2 lg:col-span-1">
                <p className="text-slate-400 text-[8px] font-black uppercase tracking-widest">Zonas</p>
                <h3 className="text-xl md:text-2xl font-black text-slate-800 mt-0.5">{new Set(inventory.map(i => i.location)).size}</h3>
              </div>
            </div>

            {!isChatOpen ? (
              <button onClick={() => setIsChatOpen(true)} className="w-full bg-blue-600 p-6 rounded-2xl shadow-md text-white flex items-center justify-between group hover:bg-blue-700 transition-all">
                <div className="text-left">
                  <h4 className="text-sm md:text-base font-black uppercase tracking-tighter leading-none mb-1">Asistente IA</h4>
                  <p className="text-blue-100 text-[9px] opacity-80">Consulta rápida de stock y ubicación.</p>
                </div>
                <ICONS.Search />
              </button>
            ) : (
              <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden flex flex-col h-[400px] animate-fade-in">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-black text-[8px] uppercase tracking-widest text-slate-500">Inteligencia Artificial</span>
                  <button onClick={() => setIsChatOpen(false)} className="text-slate-400 p-1"><ICONS.ExternalLink /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-5 space-y-3 bg-[#fdfdfe] scrollbar-hide">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-3.5 py-2 rounded-xl text-[10px] font-medium shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={askAi} className="p-3 bg-white border-t border-slate-100 flex gap-2">
                  <input name="q" placeholder="¿Dónde está...?" autoComplete="off" className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none text-[10px] font-bold" />
                  <button disabled={aiLoading} className="bg-blue-600 text-white p-2 rounded-lg"><ICONS.Search /></button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.QUERY && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-xs font-black text-slate-800 mb-3 uppercase tracking-tighter text-center">Consulta de Activo</h3>
              <AutocompleteSearch products={inventory} onSelect={setSelectedProduct} />
            </div>
            
            {selectedProduct && (
              <div className="max-w-2xl mx-auto animate-fade-in">
                <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col">
                  {/* 1. Información de Activo Registrado */}
                  <div className="p-6 md:p-8">
                    <span className="text-[7px] font-black text-blue-600 uppercase bg-blue-50 px-2.5 py-1 rounded-full inline-block mb-4 tracking-widest">Activo Registrado</span>
                    <h4 className="text-base md:text-lg font-black text-slate-800 uppercase leading-none mb-6">{selectedProduct.name}</h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-blue-600 shadow-sm"><ICONS.Dashboard /></div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Ubicación</p>
                          <p className="text-[11px] text-slate-800 font-bold uppercase">{selectedProduct.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-blue-600 shadow-sm"><ICONS.Settings /></div>
                        <div>
                          <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Responsable</p>
                          <p className="text-[11px] text-slate-800 font-bold uppercase">{selectedProduct.responsible}</p>
                        </div>
                      </div>
                    </div>

                    {/* 2. Cantidad (No tan grande) */}
                    <div className="bg-blue-600 p-6 rounded-2xl text-white shadow-md flex items-center justify-between mb-8">
                      <div className="text-left">
                        <p className="text-blue-100 font-black uppercase text-[8px] tracking-widest mb-1">Cantidad en Stock</p>
                        <p className="text-[10px] text-blue-200 opacity-70 uppercase font-medium">Unidades físicas</p>
                      </div>
                      <h5 className="text-4xl md:text-5xl font-black tracking-tighter">{selectedProduct.quantity}</h5>
                    </div>

                    {/* 3. Miniatura del Documento */}
                    <div className="w-full aspect-video bg-slate-50 border border-slate-100 rounded-2xl overflow-hidden relative group mb-8">
                      {selectedProduct.link && extractDriveThumbnail(selectedProduct.link) ? (
                        <img 
                          src={extractDriveThumbnail(selectedProduct.link)!} 
                          alt="Miniatura del activo" 
                          className="w-full h-full object-contain p-4 transition-transform duration-500 group-hover:scale-105"
                          onError={(e) => {
                            // Si falla lh3, intentamos con el endpoint de thumbnail nativo como fallback
                            const match = selectedProduct.link.match(/\/d\/([a-zA-Z0-9_-]{25,})/);
                            if (match) {
                                e.currentTarget.src = `https://drive.google.com/thumbnail?id=${match[1]}&sz=w800`;
                            } else {
                                e.currentTarget.style.display = 'none';
                                e.currentTarget.parentElement!.innerHTML = '<div class="flex flex-col items-center justify-center h-full gap-2 text-slate-300"><svg class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg><span class="text-[7px] font-black uppercase tracking-widest">Archivo no accesible o privado</span></div>';
                            }
                          }}
                        />
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-slate-200 gap-2">
                          <ICONS.DocumentIcon />
                          <span className="text-[7px] font-black uppercase tracking-widest">Sin Documento Cargado</span>
                        </div>
                      )}
                    </div>

                    {/* 4. Botón para ir al archivo */}
                    <div className="mt-auto">
                      {selectedProduct.link ? (
                        <a href={selectedProduct.link} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 px-6 rounded-2xl flex items-center justify-center gap-3 transition-all shadow-lg active:scale-95 text-[10px] uppercase tracking-[0.2em] w-full">
                          <ICONS.ExternalLink /><span>Ver Archivo Original</span>
                        </a>
                      ) : (
                        <div className="py-4 bg-slate-50 rounded-2xl text-center text-[8px] font-black text-slate-300 uppercase tracking-widest border border-dashed border-slate-200">No hay enlace vinculado al archivo</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.INVENTORY && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-4 border-b border-slate-50 flex justify-between items-center">
               <h3 className="font-black text-slate-800 text-[10px] uppercase tracking-tighter">Listado General</h3>
               <button onClick={() => syncData()} disabled={isSyncing} className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-[8px] font-black uppercase">{isSyncing ? 'Sinc...' : 'Refrescar'}</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[7px] tracking-widest">
                  <tr>
                    <th className="px-4 py-3">Stock</th>
                    <th className="px-4 py-3">Activo</th>
                    <th className="hidden md:table-cell px-4 py-3">Ubicación</th>
                    <th className="px-4 py-3 text-center">Archivo</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 text-[10px] divide-y divide-slate-50">
                  {inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 font-black text-blue-600 text-sm">{item.quantity}</td>
                      <td className="px-4 py-3 font-bold text-slate-800 uppercase tracking-tight">{item.name}</td>
                      <td className="hidden md:table-cell px-4 py-3 font-bold text-slate-400 uppercase">{item.location}</td>
                      <td className="px-4 py-3 text-center">
                        {item.link ? <a href={item.link} target="_blank" className="text-emerald-500 hover:text-emerald-700 inline-block"><ICONS.ExternalLink /></a> : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === AppSection.SETTINGS && (
          <div className="max-w-xl bg-white p-6 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-xs font-black text-slate-800 mb-6 uppercase tracking-tighter">Configuración</h3>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="block text-[8px] font-black text-slate-400 uppercase tracking-widest">Google Sheets URL (CSV Público)</label>
                <input type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} placeholder="https://..." className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold outline-none focus:ring-2 focus:ring-blue-100" />
              </div>
              <button onClick={() => syncData()} disabled={isSyncing} className="w-full bg-blue-600 text-white font-black py-3 rounded-xl text-[9px] uppercase tracking-widest shadow-md hover:bg-blue-700">
                {isSyncing ? 'Sincronizando...' : 'Cargar Inventario'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Nav Móvil - Compacto */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-lg border-t border-slate-100 px-2 py-2 flex justify-around items-center z-50 shadow-lg">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} className={`flex flex-col items-center gap-0.5 min-w-[50px] transition-all ${activeSection === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`p-1.5 rounded-lg ${activeSection === item.id ? 'bg-blue-50' : ''}`}>{item.icon}</div>
            <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
