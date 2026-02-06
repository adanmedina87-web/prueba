
import React, { useState, useEffect, useRef, useMemo } from 'react';
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

interface DeliveryRecord {
  id: string;
  fecha: string;
  persona: string;
  seccion: string;
  departamento: string;
  producto: string;
  cantidad: number;
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
  ENTREGA = 'ENTREGA',
  SETTINGS = 'SETTINGS'
}

// --- 2. CONSTANTES E ICONOS ---
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1PyR211FL1fAOqSYmMhsh7c7hY4jOfQRAwuQxhAqD_Zk/edit?usp=sharing';
const DELIVERY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/edit?usp=sharing';

const CustomLogo = () => (
  <img 
    src="https://yt3.ggpht.com/a-/AAuE7mAOAi4DgYrnVswYDrVeyBYZX0RPcjLf2EC6mw=s900-mo-c-c0xffffffff-rj-k-no" 
    alt="Logo Inventario"
    className="w-10 h-10 md:w-12 md:h-12 rounded-lg shadow-sm object-cover"
  />
);

const ICONS = {
  Dashboard: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>,
  Search: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>,
  Inventory: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Delivery: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  ExternalLink: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  ZoomIn: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" /></svg>,
  DocumentIcon: () => <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
};

// --- 3. FUNCIONES DE UTILIDAD ---
const extractDriveThumbnail = (url: string) => {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9_-]{25,})/) || 
                url.match(/id=([a-zA-Z0-9_-]{25,})/);
  
  if (match && match[1]) {
    return `https://lh3.googleusercontent.com/d/${match[1]}`;
  }
  return null;
};

const parseCSV = (text: string) => {
  const rows = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (rows.length === 0) return [];
  return rows.map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|"$/g, '')));
};

// Helper robusto para normalizar fechas para comparación (solo YYYY-MM-DD)
const getNormalizedTimestamp = (dateStr: string) => {
  if (!dateStr) return null;
  
  const cleanStr = dateStr.trim();
  
  // Detectar separador común
  const separator = cleanStr.includes('/') ? '/' : (cleanStr.includes('-') ? '-' : null);
  
  let y = 0, m = 0, d = 1;
  
  if (separator) {
    const parts = cleanStr.split(separator);
    if (parts.length >= 3) {
      // Intentar detectar si es YYYY-MM-DD o DD-MM-YYYY
      if (parts[0].length === 4) { // YYYY-MM-DD
        y = parseInt(parts[0]);
        m = parseInt(parts[1]) - 1;
        d = parseInt(parts[2]);
      } else { // DD-MM-YYYY
        y = parseInt(parts[2]);
        m = parseInt(parts[1]) - 1;
        d = parseInt(parts[0]);
      }
    } else if (parts.length === 1 && parts[0].length === 4) {
      y = parseInt(parts[0]);
      m = 0;
      d = 1;
    } else {
      // Fallback a constructor nativo
      const fallback = new Date(cleanStr);
      if (!isNaN(fallback.getTime())) {
        fallback.setHours(0, 0, 0, 0);
        return fallback.getTime();
      }
      return null;
    }
  } else {
    // Caso de solo año (ej: "2024")
    if (cleanStr.length === 4 && !isNaN(parseInt(cleanStr))) {
      y = parseInt(cleanStr);
      m = 0;
      d = 1;
    } else {
      const fallback = new Date(cleanStr);
      if (!isNaN(fallback.getTime())) {
        fallback.setHours(0, 0, 0, 0);
        return fallback.getTime();
      }
      return null;
    }
  }

  const dateObj = new Date(y, m, d);
  if (isNaN(dateObj.getTime())) return null;
  
  dateObj.setHours(0, 0, 0, 0);
  return dateObj.getTime();
};

// --- 4. COMPONENTE BUSCADOR ---
const AutocompleteSearch: React.FC<{ products: Product[], onSelect: (p: Product) => void, placeholder?: string }> = ({ products, onSelect, placeholder }) => {
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
        placeholder={placeholder || "¿Qué activo buscas?"}
        className="w-full px-4 py-3.5 md:px-5 md:py-4 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm font-bold uppercase tracking-tight"
      />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><ICONS.Search /></div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-50 max-h-[250px] overflow-y-auto">
          {suggestions.map((p) => (
            <li key={p.id} onClick={() => { onSelect(p); setQuery(p.name); setIsOpen(false); }} className="px-5 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors active:bg-blue-100">
              <div className="flex-1 pr-3">
                <p className="font-bold text-slate-800 text-xs uppercase tracking-tight">{p.name}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.location}</p>
              </div>
              <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-md shrink-0">CANT: {p.quantity}</span>
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
  
  // States para Inventario
  const [inventory, setInventory] = useState<Product[]>(() => {
    const saved = localStorage.getItem('inv_v4_final');
    return saved ? JSON.parse(saved) : [];
  });
  const [sourceLink, setSourceLink] = useState(() => localStorage.getItem('inv_link_v4_final') || DEFAULT_SHEET_URL);
  
  // States para Entrega
  const [deliveryData, setDeliveryData] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem('del_v4_final');
    return saved ? JSON.parse(saved) : [];
  });
  const [deliveryFilters, setDeliveryFilters] = useState({
    persona: '',
    seccion: '',
    departamento: '',
    fechaInicio: '',
    fechaFin: ''
  });

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showPersonaSuggestions, setShowPersonaSuggestions] = useState(false);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const personaRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('inv_v4_final', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('inv_link_v4_final', sourceLink); }, [sourceLink]);
  useEffect(() => { localStorage.setItem('del_v4_final', JSON.stringify(deliveryData)); }, [deliveryData]);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [chatMessages, isChatOpen]);

  // Click outside listener for persona autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (personaRef.current && !personaRef.current.contains(event.target as Node)) {
        setShowPersonaSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const syncData = async (type: 'inventory' | 'delivery' = 'inventory', silent = false) => {
    const link = type === 'inventory' ? sourceLink : DELIVERY_SHEET_URL;
    if (!link || !link.includes('docs.google.com/spreadsheets')) return;
    if (!silent) setIsSyncing(true);
    try {
      let url = link;
      if (url.includes('/edit')) url = url.split('/edit')[0] + '/export?format=csv';
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('<html') || text.trim() === '') throw new Error("Hoja no pública o privada");
      
      const colsData = parseCSV(text);
      if (colsData.length < 2) throw new Error("Sin datos suficientes");

      const rows = colsData.slice(1);

      if (type === 'inventory') {
        const newInv = rows.map((cols, i) => ({
          id: `item-${i}-${Date.now()}`,
          quantity: parseInt(cols[0]?.replace(/[^0-9]/g, '')) || 0,
          name: cols[1] || 'Sin nombre',
          sku: 'S/N',
          location: cols[2] || 'Sin asignar',
          responsible: cols[3] || 'Desconocido',
          link: cols[4] || '', 
          category: 'General',
          arrivalDate: new Date().toISOString()
        }));
        setInventory(newInv);
      } else {
        const newDel = rows.map((cols, i) => ({
          id: `del-${i}-${Date.now()}`,
          cantidad: parseInt(cols[0]?.replace(/[^0-9]/g, '') || '0') || 0,
          producto: cols[1]?.trim() || '',
          persona: cols[2]?.trim() || '',
          departamento: cols[3]?.trim() || '',
          seccion: cols[4]?.trim() || '',
          fecha: cols[5]?.trim() || ''
        }));
        setDeliveryData(newDel);
      }
    } catch (e: any) {
      if (!silent) alert(`Error Sincronización ${type}: ${e.message}`);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncData('inventory', true);
    syncData('delivery', true);
    const interval = setInterval(() => {
      syncData('inventory', true);
      syncData('delivery', true);
    }, 60000);
    return () => clearInterval(interval);
  }, [sourceLink]);

  // Derived data for dropdowns and autocomplete
  const uniqueSecciones = useMemo(() => {
    const set = new Set(deliveryData.map(d => d.seccion).filter(s => s));
    return Array.from(set).sort();
  }, [deliveryData]);

  const uniqueDepartamentos = useMemo(() => {
    const set = new Set(deliveryData.map(d => d.departamento).filter(d => d));
    return Array.from(set).sort();
  }, [deliveryData]);

  const uniquePersonas = useMemo(() => {
    const set = new Set(deliveryData.map(d => d.persona).filter(p => p));
    return Array.from(set).sort();
  }, [deliveryData]);

  const filteredPersonas = useMemo(() => {
    if (!deliveryFilters.persona) return [];
    return uniquePersonas.filter(p => 
      p.toLowerCase().includes(deliveryFilters.persona.toLowerCase()) && 
      p.toLowerCase() !== deliveryFilters.persona.toLowerCase()
    ).slice(0, 10);
  }, [uniquePersonas, deliveryFilters.persona]);

  const filteredDelivery = useMemo(() => {
    // Normalizar marcas de tiempo para los filtros actuales (Inicio y Fin)
    const filterStartTime = getNormalizedTimestamp(deliveryFilters.fechaInicio);
    const filterEndTime = getNormalizedTimestamp(deliveryFilters.fechaFin);

    return deliveryData
      .filter(d => {
        const matchPersona = deliveryFilters.persona === '' || d.persona.toLowerCase().includes(deliveryFilters.persona.toLowerCase());
        const matchSeccion = deliveryFilters.seccion === '' || d.seccion.toLowerCase() === deliveryFilters.seccion.toLowerCase();
        const matchDepto = deliveryFilters.departamento === '' || d.departamento.toLowerCase() === deliveryFilters.departamento.toLowerCase();
        
        let matchFecha = true;
        const recordTime = getNormalizedTimestamp(d.fecha);
        
        if (recordTime !== null) {
          // Filtrado matemático exacto incluyendo años
          if (filterStartTime !== null && recordTime < filterStartTime) matchFecha = false;
          if (filterEndTime !== null && recordTime > filterEndTime) matchFecha = false;
        } else {
          // Si el registro no tiene fecha válida y hay filtros de fecha activos, no mostrar
          if (filterStartTime !== null || filterEndTime !== null) matchFecha = false;
        }

        return matchPersona && matchSeccion && matchDepto && matchFecha;
      })
      .sort((a, b) => {
        const dateA = getNormalizedTimestamp(a.fecha) || 0;
        const dateB = getNormalizedTimestamp(b.fecha) || 0;
        return dateB - dateA; // Orden descendente por defecto
      });
  }, [deliveryData, deliveryFilters]);

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
      const context = JSON.stringify(inventory.slice(0, 50).map(i => ({ n: i.name, q: i.quantity, l: i.location, r: i.responsible })));
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Inventario: ${context}\nPregunta: ${query}`,
        config: { systemInstruction: "Responde de forma muy breve sobre stock y ubicación." }
      });
      const aiMsg: ChatMessage = { role: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date() };
      setChatMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'system', text: 'Error procesando IA.', timestamp: new Date() }]);
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
    { id: AppSection.ENTREGA, icon: <ICONS.Delivery />, label: 'Entrega' },
    { id: AppSection.SETTINGS, icon: <ICONS.Settings />, label: 'Ajustes' },
  ];

  const handleZoom = (url: string) => {
    setZoomedImage(url);
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] pb-24 md:pb-0 font-['Plus_Jakarta_Sans']">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-20 shadow-sm">
        <div className="p-8 flex items-center gap-4">
          <CustomLogo />
          <h1 className="font-black text-base text-slate-800 tracking-tight leading-none uppercase">Stock<br/><span className="text-blue-600 text-sm">Bodega</span></h1>
        </div>
        <nav className="flex-1 px-5 space-y-2 mt-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeSection === item.id ? 'bg-blue-600 text-white shadow-xl shadow-blue-100 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-5 m-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-[11px] font-black text-slate-400 leading-tight uppercase tracking-wider">Activos: {inventory.length}</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-12 max-w-6xl mx-auto w-full">
        <header className="flex justify-between items-center mb-6 md:mb-10">
          <div className="hidden md:block">
            <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">
              {activeSection === AppSection.DASHBOARD && 'Tablero Principal'}
              {activeSection === AppSection.QUERY && 'Consulta Activos'}
              {activeSection === AppSection.INVENTORY && 'Inventario'}
              {activeSection === AppSection.ENTREGA && 'Control de Entrega'}
              {activeSection === AppSection.SETTINGS && 'Configuración'}
            </h2>
          </div>
          <div className="md:hidden flex items-center gap-3">
            <CustomLogo />
            <h1 className="font-black text-sm text-slate-800 tracking-tight leading-none uppercase">Stock<br/><span className="text-blue-600 text-[10px]">Bodega</span></h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 md:px-3 md:py-1 rounded-full whitespace-nowrap">
              {new Date().toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>
        </header>

        {activeSection === AppSection.DASHBOARD && (
          <div className="space-y-6 md:space-y-10 animate-fade-in">
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-40">
                <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Activos Registrados</p>
                <h3 className="text-2xl md:text-4xl font-black text-slate-800">{inventory.length}</h3>
              </div>
              <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-40">
                <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Stock Total</p>
                <h3 className="text-2xl md:text-4xl font-black text-blue-600">{inventory.reduce((acc, curr) => acc + curr.quantity, 0)}</h3>
              </div>
              <div className="bg-white p-5 md:p-8 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100 flex flex-col justify-between h-32 md:h-40 col-span-2 lg:col-span-1">
                <p className="text-slate-400 text-[9px] md:text-[10px] font-black uppercase tracking-widest mb-1">Zonas de Bodega</p>
                <h3 className="text-2xl md:text-4xl font-black text-slate-800">{new Set(inventory.map(i => i.location)).size}</h3>
              </div>
            </div>

            {!isChatOpen ? (
              <button onClick={() => setIsChatOpen(true)} className="w-full bg-blue-600 p-8 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl text-white flex items-center justify-between group hover:bg-blue-700 transition-all border-b-8 border-blue-800 active:translate-y-1 active:border-b-0">
                <div className="text-left">
                  <h4 className="text-lg md:text-2xl font-black uppercase tracking-tighter leading-none mb-2 md:mb-3">Asistente Logístico IA</h4>
                  <p className="text-blue-100 text-[11px] md:text-[13px] opacity-90 uppercase tracking-widest font-bold">Consulte stock y ubicaciones.</p>
                </div>
                <div className="bg-white/20 p-4 md:p-5 rounded-2xl md:rounded-3xl group-hover:scale-110 transition-transform">
                  <ICONS.Search />
                </div>
              </button>
            ) : (
              <div className="bg-white rounded-[32px] md:rounded-[40px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[400px] md:h-[500px] animate-fade-in">
                <div className="p-4 md:p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="font-black text-[10px] md:text-[11px] uppercase tracking-widest text-slate-500">Inteligencia Logística</span>
                  <button onClick={() => setIsChatOpen(false)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-xl transition-colors"><ICONS.ExternalLink /></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-4 md:space-y-5 bg-[#fdfdfe] scrollbar-hide">
                  {chatMessages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[85%] px-4 py-3 md:px-5 md:py-4 rounded-2xl md:rounded-3xl text-[13px] md:text-[14px] font-bold shadow-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                        {msg.text}
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>
                <form onSubmit={askAi} className="p-4 md:p-6 bg-white border-t border-slate-100 flex gap-2 md:gap-4">
                  <input name="q" placeholder="Pregunta..." autoComplete="off" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl px-4 py-3 md:px-6 md:py-4 outline-none text-sm font-bold focus:ring-4 focus:ring-blue-100 transition-all uppercase" />
                  <button disabled={aiLoading} className="bg-blue-600 text-white px-4 md:px-6 rounded-xl md:rounded-2xl shadow-xl hover:bg-blue-700 active:scale-95 transition-all"><ICONS.Search /></button>
                </form>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.QUERY && (
          <div className="animate-fade-in space-y-6 md:space-y-10">
            <div className="bg-white p-6 md:p-10 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100">
              <h3 className="text-sm md:text-base font-black text-slate-800 mb-4 md:mb-6 uppercase tracking-tighter text-center">Búsqueda Maestra</h3>
              <AutocompleteSearch products={inventory} onSelect={setSelectedProduct} />
            </div>
            
            {selectedProduct && (
              <div className="max-w-3xl mx-auto animate-fade-in">
                <div className="bg-white rounded-[32px] md:rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col">
                  <div className="p-6 md:p-14">
                    <div className="flex justify-between items-start mb-6 md:mb-8">
                      <div>
                        <span className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-3 py-1.5 md:px-4 md:py-2 rounded-full inline-block mb-3 md:mb-4 tracking-widest">Activo Vinculado</span>
                        <h4 className="text-lg md:text-3xl font-black text-slate-800 uppercase leading-none tracking-tight">{selectedProduct.name}</h4>
                      </div>
                      <div className="bg-slate-50 p-2.5 md:p-4 rounded-xl md:rounded-3xl border border-slate-100 text-center min-w-[70px] md:min-w-[100px]">
                        <p className="text-[8px] md:text-[9px] font-black text-slate-400 uppercase tracking-widest mb-0.5">SKU</p>
                        <p className="text-[11px] md:text-sm font-black text-slate-800">#{selectedProduct.sku}</p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-10 mb-8 md:mb-12">
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-sm border border-slate-100"><ICONS.Dashboard /></div>
                        <div>
                          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Ubicación</p>
                          <p className="text-sm md:text-base text-slate-800 font-bold uppercase">{selectedProduct.location}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 md:gap-5">
                        <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl bg-slate-50 flex items-center justify-center text-blue-600 shadow-sm border border-slate-100"><ICONS.Settings /></div>
                        <div>
                          <p className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsable</p>
                          <p className="text-sm md:text-base text-slate-800 font-bold uppercase">{selectedProduct.responsible}</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-600 p-6 md:p-10 rounded-[24px] md:rounded-[32px] text-white shadow-2xl flex items-center justify-between mb-8 md:mb-12 border-b-8 border-blue-800">
                      <div className="text-left">
                        <p className="text-blue-100 font-black uppercase text-[10px] md:text-[12px] tracking-widest mb-1 md:mb-2">Cantidad</p>
                        <p className="text-[11px] md:text-sm text-blue-200 opacity-90 uppercase font-black">Stock Físico</p>
                      </div>
                      <h5 className="text-4xl md:text-7xl font-black tracking-tighter">{selectedProduct.quantity}</h5>
                    </div>

                    <div className="w-full h-32 md:h-40 bg-slate-50 border border-slate-100 rounded-[24px] md:rounded-[32px] flex items-center justify-center relative mb-8 md:mb-12 border-dashed border-2">
                      {selectedProduct.link && extractDriveThumbnail(selectedProduct.link) ? (
                        <button 
                          onClick={() => handleZoom(extractDriveThumbnail(selectedProduct.link)!)}
                          className="flex items-center gap-2 md:gap-4 px-6 py-3.5 md:px-10 md:py-5 bg-white border border-slate-200 rounded-2xl md:rounded-3xl shadow-xl text-blue-600 font-black text-[11px] md:text-sm uppercase tracking-widest hover:bg-blue-50 transition-all active:scale-95"
                        >
                          <ICONS.ZoomIn /> <span>Previsualizar</span>
                        </button>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-slate-300 gap-2">
                          <ICONS.DocumentIcon />
                          <span className="text-[9px] font-black uppercase tracking-widest">Sin miniatura</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-auto">
                      {selectedProduct.link ? (
                        <a href={selectedProduct.link} target="_blank" rel="noopener noreferrer" className="bg-emerald-500 hover:bg-emerald-600 text-white font-black py-4 md:py-6 px-6 md:px-10 rounded-[24px] md:rounded-[32px] flex items-center justify-center gap-3 md:gap-4 transition-all shadow-xl active:scale-95 text-[11px] md:text-sm uppercase tracking-[0.2em] w-full border-b-8 border-emerald-700 active:border-b-0">
                          <ICONS.ExternalLink /><span>Ver Original</span>
                        </a>
                      ) : (
                        <div className="py-4 md:py-6 bg-slate-50 rounded-[24px] md:rounded-[32px] text-center text-[10px] font-black text-slate-300 uppercase tracking-widest border border-dashed border-slate-200">Enlace no disponible</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.INVENTORY && (
          <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-6 md:p-8 border-b border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
               <h3 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight">Inventario Maestro</h3>
               <button onClick={() => syncData('inventory')} disabled={isSyncing} className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl hover:bg-blue-700 transition-all active:scale-95">
                 {isSyncing ? 'Sincronizando...' : 'Actualizar Inventario'}
               </button>
            </div>
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left min-w-[500px] md:min-w-0">
                <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[9px] md:text-[10px] tracking-widest">
                  <tr>
                    <th className="px-4 md:px-8 py-4 md:py-6">Stock</th>
                    <th className="px-4 md:px-8 py-4 md:py-6">Activo</th>
                    <th className="hidden md:table-cell px-8 py-6">Lugar</th>
                    <th className="px-4 md:px-8 py-4 md:py-6 text-center">Acción</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 text-[13px] md:text-[15px] divide-y divide-slate-50">
                  {inventory.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 md:px-8 py-5 font-black text-blue-600 text-xl">{item.quantity}</td>
                      <td className="px-4 md:px-8 py-5">
                         <p className="font-bold text-slate-800 uppercase tracking-tight line-clamp-2 md:line-clamp-1">{item.name}</p>
                         <p className="md:hidden text-[9px] text-slate-400 mt-0.5">{item.location}</p>
                      </td>
                      <td className="hidden md:table-cell px-8 py-5 font-bold text-slate-400 uppercase">{item.location}</td>
                      <td className="px-4 md:px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {item.link && (
                            <button 
                              onClick={() => handleZoom(extractDriveThumbnail(item.link)!)}
                              className="text-blue-500 p-2 hover:bg-blue-50 rounded-xl transition-all active:scale-90"
                            >
                              <ICONS.ZoomIn />
                            </button>
                          )}
                          {!item.link && <span className="text-slate-200 font-black">-</span>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === AppSection.ENTREGA && (
          <div className="animate-fade-in space-y-6 md:space-y-10">
            {/* Filtros de Entrega */}
            <div className="bg-white p-5 md:p-10 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-6 md:mb-8">
                  <h3 className="font-black text-slate-800 text-sm md:text-base uppercase tracking-tight">Filtros</h3>
                  <button onClick={() => syncData('delivery')} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg active:scale-95">
                    {isSyncing ? '...' : 'Refrescar'}
                  </button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-2 relative" ref={personaRef}>
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Persona</label>
                    <input 
                      type="text" 
                      value={deliveryFilters.persona} 
                      onChange={(e) => {
                        setDeliveryFilters({...deliveryFilters, persona: e.target.value});
                        setShowPersonaSuggestions(true);
                      }}
                      onFocus={() => setShowPersonaSuggestions(true)}
                      placeholder="Nombre..."
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                    {showPersonaSuggestions && filteredPersonas.length > 0 && (
                      <ul className="absolute z-[60] w-full mt-1 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto divide-y divide-slate-50">
                        {filteredPersonas.map(p => (
                          <li 
                            key={p} 
                            onClick={() => {
                              setDeliveryFilters({...deliveryFilters, persona: p});
                              setShowPersonaSuggestions(false);
                            }}
                            className="px-5 py-3.5 hover:bg-blue-50 cursor-pointer text-xs font-bold text-slate-800 uppercase transition-colors active:bg-blue-100"
                          >
                            {p}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sección</label>
                    <select 
                      value={deliveryFilters.seccion} 
                      onChange={(e) => setDeliveryFilters({...deliveryFilters, seccion: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">TODAS</option>
                      {uniqueSecciones.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Depto</label>
                    <select 
                      value={deliveryFilters.departamento} 
                      onChange={(e) => setDeliveryFilters({...deliveryFilters, departamento: e.target.value})}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer transition-all"
                    >
                      <option value="">TODOS</option>
                      {uniqueDepartamentos.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:col-span-2">
                     <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Desde</label>
                        <input 
                          type="date" 
                          value={deliveryFilters.fechaInicio} 
                          onChange={(e) => setDeliveryFilters({...deliveryFilters, fechaInicio: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Hasta</label>
                        <input 
                          type="date" 
                          value={deliveryFilters.fechaFin} 
                          onChange={(e) => setDeliveryFilters({...deliveryFilters, fechaFin: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                     </div>
                  </div>
                  <div className="flex items-end">
                    <button 
                      onClick={() => setDeliveryFilters({persona: '', seccion: '', departamento: '', fechaInicio: '', fechaFin: ''})}
                      className="w-full px-4 py-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-widest hover:bg-rose-100 transition-all active:scale-95"
                    >
                      Limpiar
                    </button>
                  </div>
               </div>
            </div>

            {/* Resultado de Entregas */}
            <div className="bg-white rounded-[24px] md:rounded-[40px] shadow-sm border border-slate-100 overflow-hidden">
               <div className="p-5 md:p-8 border-b border-slate-50 bg-blue-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="font-black text-blue-800 text-sm md:text-base uppercase tracking-tight">Registros</h3>
                    <p className="text-blue-600 text-[9px] md:text-[11px] font-bold uppercase mt-1 tracking-wider">{filteredDelivery.length} encontrados</p>
                  </div>
                  <div className="grid grid-cols-2 sm:flex flex-wrap gap-2 md:gap-4 w-full md:w-auto">
                    <div className="bg-white px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl border border-blue-100 text-center">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Productos</p>
                      <p className="text-lg md:text-xl font-black text-blue-600">{filteredDelivery.reduce((acc, curr) => acc + curr.cantidad, 0)}</p>
                    </div>
                    <div className="bg-white px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl border border-blue-100 text-center">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Personas</p>
                      <p className="text-lg md:text-xl font-black text-indigo-600">{new Set(filteredDelivery.map(d => d.persona)).size}</p>
                    </div>
                    <div className="bg-white px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl border border-blue-100 text-center">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Secciones</p>
                      <p className="text-lg md:text-xl font-black text-emerald-600">{new Set(filteredDelivery.map(d => d.seccion)).size}</p>
                    </div>
                    <div className="bg-white px-3 py-2 md:px-5 md:py-3 rounded-xl md:rounded-2xl border border-blue-100 text-center">
                      <p className="text-[7px] md:text-[8px] font-black text-slate-400 uppercase tracking-widest">Deptos</p>
                      <p className="text-lg md:text-xl font-black text-rose-600">{new Set(filteredDelivery.map(d => d.departamento)).size}</p>
                    </div>
                  </div>
               </div>
               <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left min-w-[700px] md:min-w-0">
                    <thead className="bg-slate-50 text-slate-400 font-black uppercase text-[8px] md:text-[10px] tracking-widest">
                      <tr>
                        <th className="px-4 md:px-8 py-4 md:py-6 text-center">Cant.</th>
                        <th className="px-4 md:px-8 py-4 md:py-6">Producto</th>
                        <th className="px-4 md:px-8 py-4 md:py-6">Persona</th>
                        <th className="px-4 md:px-8 py-4 md:py-6">Sección</th>
                        <th className="px-4 md:px-8 py-4 md:py-6">Depto</th>
                        <th className="px-4 md:px-8 py-4 md:py-6">Fecha</th>
                      </tr>
                    </thead>
                    <tbody className="text-slate-600 text-[12px] md:text-[14px] divide-y divide-slate-50">
                      {filteredDelivery.map((d, idx) => (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-4 md:px-8 py-4 text-center font-black text-slate-800 text-base md:text-lg">{d.cantidad}</td>
                          <td className="px-4 md:px-8 py-4 font-bold text-blue-600 uppercase truncate max-w-[150px]">{d.producto}</td>
                          <td className="px-4 md:px-8 py-4 font-black text-slate-800 uppercase tracking-tight">{d.persona}</td>
                          <td className="px-4 md:px-8 py-4 font-bold text-slate-800 text-[10px] md:text-[11px] uppercase">{d.seccion}</td>
                          <td className="px-4 md:px-8 py-4 font-bold text-slate-400 text-[9px] md:text-[10px] uppercase tracking-widest">{d.departamento}</td>
                          <td className="px-4 md:px-8 py-4 font-bold text-slate-400 text-[10px] md:text-[11px] whitespace-nowrap">{d.fecha}</td>
                        </tr>
                      ))}
                      {filteredDelivery.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-8 py-16 md:py-20 text-center">
                            <p className="text-[10px] md:text-[12px] font-black text-slate-300 uppercase tracking-[0.2em]">Sin registros encontrados</p>
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
               </div>
            </div>
          </div>
        )}

        {activeSection === AppSection.SETTINGS && (
          <div className="max-w-2xl bg-white p-6 md:p-14 rounded-[24px] md:rounded-[48px] shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-base md:text-lg font-black text-slate-800 mb-6 md:mb-10 uppercase tracking-tighter">Conexión de Datos</h3>
            <div className="space-y-6 md:space-y-10">
              <div className="space-y-3 md:space-y-4">
                <label className="block text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Google Sheets URL</label>
                <input type="url" value={sourceLink} onChange={(e) => setSourceLink(e.target.value)} placeholder="..." className="w-full px-4 py-3 md:px-6 md:py-5 bg-slate-50 border border-slate-200 rounded-xl md:rounded-[24px] text-sm font-bold outline-none focus:ring-4 focus:ring-blue-100 transition-all" />
              </div>
              <div className="p-4 md:p-6 bg-slate-50 rounded-2xl md:rounded-[32px] border border-slate-100">
                <p className="text-[9px] md:text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Nota</p>
                <p className="text-[10px] md:text-xs font-bold text-slate-500 leading-relaxed uppercase">Sincronización automática activa cada 60 segundos.</p>
              </div>
              <button onClick={() => { syncData('inventory'); syncData('delivery'); }} disabled={isSyncing} className="w-full bg-blue-600 text-white font-black py-4 md:py-6 rounded-xl md:rounded-[28px] text-[10px] md:text-[12px] uppercase tracking-widest shadow-2xl hover:bg-blue-700 active:scale-95 transition-all border-b-8 border-blue-800 active:border-b-0">
                {isSyncing ? 'Sincronizando...' : 'Actualizar Todas las Bases'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Modal de Imagen Ampliada */}
      {zoomedImage && (
        <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-3 md:p-6 animate-fade-in" onClick={() => setZoomedImage(null)}>
          <div className="relative max-w-5xl w-full bg-white rounded-2xl md:rounded-[48px] overflow-hidden shadow-2xl flex flex-col border-4 md:border-8 border-white" onClick={e => e.stopPropagation()}>
             <div className="p-4 md:p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                <span className="text-[10px] md:text-[12px] font-black text-slate-400 uppercase tracking-widest">Vista de Archivo</span>
                <button onClick={() => setZoomedImage(null)} className="p-3 md:p-4 bg-slate-50 hover:bg-rose-50 hover:text-rose-500 rounded-xl md:rounded-3xl transition-all active:scale-90 shadow-sm">
                   <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
             </div>
             <div className="flex-1 bg-slate-100 flex items-center justify-center p-4 md:p-10 min-h-[50vh] md:min-h-[65vh]">
                <img src={zoomedImage} alt="Vista" className="max-w-full max-h-[65vh] md:max-h-[75vh] object-contain rounded-xl md:rounded-3xl shadow-xl" onError={(e) => e.currentTarget.src = "https://via.placeholder.com/800?text=Miniatura+no+disponible"} />
             </div>
             <div className="p-4 md:p-8 bg-white border-t border-slate-100 text-center">
                <p className="text-[12px] md:text-sm font-black text-slate-800 uppercase tracking-tight">{selectedProduct?.name || 'Archivo'}</p>
             </div>
          </div>
        </div>
      )}

      {/* Nav Móvil - Ajustado para optimizar Touch Areas */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-2xl border-t border-slate-100 px-2 py-3 flex justify-around items-center z-50 shadow-[0_-10px_40px_rgb(0,0,0,0.06)]">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} className={`flex flex-col items-center gap-1 min-w-[55px] transition-all active:scale-90 ${activeSection === item.id ? 'text-blue-600' : 'text-slate-400'}`}>
            <div className={`p-2.5 rounded-xl transition-all ${activeSection === item.id ? 'bg-blue-50' : 'bg-transparent'}`}>{item.icon}</div>
            <span className="text-[8px] font-black uppercase tracking-widest">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
