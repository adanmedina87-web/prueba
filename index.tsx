
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from "firebase/app";
import { 
  getDatabase, 
  ref, 
  onValue, 
  push, 
  update, 
  remove, 
  set 
} from "firebase/database";

// --- CONFIGURACIÓN DE FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyCdGGUOd1-SyzHgz3gnC2XUEngI9q-Dl90",
  authDomain: "bdadan-1c9dc.firebaseapp.com",
  databaseURL: "https://bdadan-1c9dc-default-rtdb.firebaseio.com",
  projectId: "bdadan-1c9dc",
  storageBucket: "bdadan-1c9dc.firebasestorage.app",
  messagingSenderId: "680803093429",
  appId: "1:1:680803093429:web:333faaf62bf0767b49e7fc"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

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
  imageUrl?: string; 
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

interface OrderItem {
  id?: string;
  producto: string;
  cantidad: number;
  persona?: string;
  departamento?: string;
  seccion?: string;
}

interface FinalizedRequest {
  id: string;
  persona: string;
  departamento: string;
  seccion: string;
  fecha: string;
  items: { producto: string; cantidad: number }[];
}

interface ChatMessage {
  role: 'user' | 'ai' | 'system';
  text: string;
  timestamp: Date;
}

enum AppSection {
  DASHBOARD = 'DASHBOARD',
  QUERY = 'QUERY',
  SOLICITUD = 'SOLICITUD',
  ENTREGA = 'ENTREGA',
  SETTINGS = 'SETTINGS'
}

// --- 2. CONSTANTES E ICONOS ---
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/edit#gid=507872400';
const DELIVERY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/edit?usp=sharing';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9R2ocvOKfUpf78kVjZxG9EL5tbGxqtvu2Y-YeM7ADGbA41JdHdJ0GRmCJ3Qh8-LY/exec';

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
  Solicitud: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>,
  Settings: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>,
  Delivery: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" /></svg>,
  ExternalLink: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>,
  Trash: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
  Check: () => <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>,
  Plus: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>,
  Minus: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" /></svg>,
  ChevronDown: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>
};

// --- 3. FUNCIONES DE UTILIDAD ---
const parseCSV = (text: string) => {
  const rows = text.split(/\r?\n/).filter(line => line.trim() !== '');
  if (rows.length === 0) return [];
  return rows.map(line => line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(c => c.trim().replace(/^"|$/g, '')));
};

const getNormalizedTimestamp = (dateStr: string) => {
  if (!dateStr) return 0;
  const cleanStr = dateStr.trim();
  const separator = cleanStr.includes('/') ? '/' : (cleanStr.includes('-') ? '-' : null);
  let y = 0, m = 0, d = 1;
  if (separator) {
    const parts = cleanStr.split(separator);
    if (parts.length >= 3) {
      if (parts[0].length === 4) { y = parseInt(parts[0]); m = parseInt(parts[1]) - 1; d = parseInt(parts[2]); }
      else { y = parseInt(parts[2]); m = parseInt(parts[1]) - 1; d = parseInt(parts[0]); }
    } else if (parts.length === 1 && parts[0].length === 4) { y = parseInt(parts[0]); m = 0; d = 1; }
    else {
      const fallback = new Date(cleanStr);
      if (!isNaN(fallback.getTime())) { fallback.setHours(0, 0, 0, 0); return fallback.getTime(); }
      return 0;
    }
  } else {
    if (cleanStr.length === 4 && !isNaN(parseInt(cleanStr))) { y = parseInt(cleanStr); m = 0; d = 1; }
    else {
      const fallback = new Date(cleanStr);
      if (!isNaN(fallback.getTime())) { fallback.setHours(0, 0, 0, 0); return fallback.getTime(); }
      return 0;
    }
  }
  const dateObj = new Date(y, m, d);
  if (isNaN(dateObj.getTime())) return 0;
  dateObj.setHours(0, 0, 0, 0);
  return dateObj.getTime();
};

const formatImageUrl = (url: string) => {
  if (!url) return '';
  if (url.includes('drive.google.com')) {
    const idMatch = url.match(/\/d\/([^/]+)/) || url.match(/id=([^&]+)/);
    if (idMatch && idMatch[1]) {
      return `https://lh3.googleusercontent.com/u/0/d/${idMatch[1]}=w1000`;
    }
  }
  return url;
};

// --- 4. COMPONENTES VISUALES ---

interface SectionBreakdown {
  name: string;
  quantity: number;
  percent: number;
}

interface ProductStat {
  name: string;
  total: number;
  sections: SectionBreakdown[];
}

const PieChart3D: React.FC<{ data: ProductStat[], globalTotal?: number }> = ({ data, globalTotal }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  
  const localSum = data.reduce((sum, item) => sum + item.total, 0);
  const displayTotal = globalTotal || localSum;
  
  const colors = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
  const radiusX = 140;
  const radiusY = 75;
  const depth = 22;
  const centerX = 160;
  const centerY = 110;

  let currentAngle = 0;

  if (localSum === 0) return null;

  return (
    <div className="flex flex-col lg:flex-row items-start justify-between gap-10 animate-fade-in">
      {/* Chart container remains stable at top */}
      <div className="relative w-full max-w-[320px] lg:max-w-[420px] sticky top-0">
        <svg viewBox="0 0 400 280" className="w-full drop-shadow-[0_25px_25px_rgba(0,0,0,0.15)] overflow-visible">
          {data.map((item, i) => {
            const sliceAngle = (item.total / localSum) * 2 * Math.PI;
            const startAngle = currentAngle;
            const endAngle = currentAngle + sliceAngle;
            currentAngle = endAngle;

            const isHighlighted = highlightedIndex === i;
            const explodeOffset = isHighlighted ? 20 : 0;
            const midAngle = startAngle + (sliceAngle / 2);
            const ox = explodeOffset * Math.cos(midAngle);
            const oy = explodeOffset * Math.sin(midAngle);

            const x1 = centerX + radiusX * Math.cos(startAngle);
            const y1 = centerY + radiusY * Math.sin(startAngle);
            const x2 = centerX + radiusX * Math.cos(endAngle);
            const y2 = centerY + radiusY * Math.sin(endAngle);

            const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;

            return (
              <g 
                key={`slice-group-${i}`}
                style={{ 
                  transform: `translate(${ox}px, ${oy}px)`, 
                  transition: 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)' 
                }}
              >
                {/* 3D Sides */}
                <path
                  d={`
                    M ${x1} ${y1} 
                    L ${x1} ${y1 + depth} 
                    A ${radiusX} ${radiusY} 0 ${largeArcFlag} 1 ${x2} ${y2 + depth}
                    L ${x2} ${y2}
                    A ${radiusX} ${radiusY} 0 ${largeArcFlag} 0 ${x1} ${y1}
                  `}
                  fill={colors[i % colors.length]}
                  filter="brightness(0.7)"
                />
                {/* Top Slice */}
                <path
                  d={`
                    M ${centerX} ${centerY} 
                    L ${x1} ${y1} 
                    A ${radiusX} ${radiusY} 0 ${largeArcFlag} 1 ${x2} ${y2} 
                    Z
                  `}
                  fill={colors[i % colors.length]}
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="1"
                />
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex-1 w-full space-y-2">
        {data.map((item, i) => (
          <div 
            key={`legend-${i}`} 
            className="group transition-all"
            onMouseEnter={() => setHighlightedIndex(i)}
            onMouseLeave={() => setHighlightedIndex(null)}
          >
            <button 
              onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
              className={`w-full flex items-center justify-between p-3 rounded-2xl transition-all ${expandedIndex === i ? 'bg-blue-50 shadow-sm' : 'hover:bg-slate-50'}`}
            >
              <div className="flex items-center gap-4">
                <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: colors[i % colors.length] }}></div>
                <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[150px] lg:max-w-[200px] text-left">
                  {item.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                  {Math.round((item.total / displayTotal) * 100)}%
                </span>
                <span className="text-[11px] font-black text-blue-600 w-8 text-right">
                  {item.total}
                </span>
                <div className={`transition-transform duration-300 ${expandedIndex === i ? 'rotate-180 text-blue-600' : 'text-slate-300'}`}>
                  <ICONS.ChevronDown />
                </div>
              </div>
            </button>
            
            {/* Dropdown breakdown list */}
            {expandedIndex === i && (
              <div className="mt-1 ml-8 px-4 py-3 bg-white border border-blue-50 rounded-2xl animate-fade-in shadow-inner overflow-hidden">
                <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-50 pb-1 flex justify-between">
                  <span>Sección</span>
                  <span>Cant. / % (Global)</span>
                </div>
                <div className="space-y-1.5">
                  {item.sections.map((sec, j) => (
                    <div 
                      key={`sec-${j}`} 
                      className="flex justify-between items-center group/item hover:bg-slate-50 rounded px-1 transition-colors"
                      onMouseEnter={() => setHighlightedIndex(i)}
                      onMouseLeave={() => setHighlightedIndex(null)}
                    >
                      <span className="text-[10px] font-bold text-slate-600 uppercase truncate pr-4">
                        {sec.name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                          {sec.quantity}
                        </span>
                        <span className="text-[9px] font-bold text-slate-400">
                          {sec.percent}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const AutocompleteSearch: React.FC<{ products: Product[], onSelect: (p: Product) => void, placeholder?: string }> = ({ products, onSelect, placeholder }) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      const filtered = products.filter(p => 
        p.name.toLowerCase().includes(trimmedQuery.toLowerCase()) || 
        (p.sku && p.sku.toLowerCase().includes(trimmedQuery.toLowerCase()))
      );
      setSuggestions(filtered.slice(0, 10));
      setIsOpen(true);
    } else {
      setSuggestions([]);
      setIsOpen(false);
    }
  }, [query, products]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={containerRef}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim().length > 0 && setIsOpen(true)}
        placeholder={placeholder || "¿Qué producto buscas?"}
        className="w-full px-4 py-3.5 md:px-5 md:py-3 pl-12 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all shadow-sm text-sm font-bold uppercase tracking-tight"
      />
      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg></div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-100 rounded-xl shadow-xl overflow-hidden divide-y divide-slate-50 max-h-[300px] overflow-y-auto">
          {suggestions.map((p) => (
            <li key={p.id} onClick={() => { onSelect(p); setQuery(''); setIsOpen(false); }} className="px-5 py-3 hover:bg-blue-50 cursor-pointer flex justify-between items-center transition-colors active:bg-blue-100">
              <div className="flex items-center gap-3 flex-1 pr-3 truncate">
                {p.imageUrl && (
                  <img 
                    src={formatImageUrl(p.imageUrl)} 
                    alt={p.name} 
                    className="w-10 h-10 object-cover rounded-lg bg-slate-100 shadow-sm shrink-0"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                )}
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm uppercase tracking-tight truncate">{p.name}</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate">{p.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-md shrink-0">STOCK: {p.quantity}</span>
                <div className="bg-blue-600 text-white p-1.5 rounded-lg shadow-sm"><ICONS.Plus /></div>
              </div>
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
    const saved = localStorage.getItem('inv_v4_final');
    return saved ? JSON.parse(saved) : [];
  });
  const [sourceLink, setSourceLink] = useState(() => localStorage.getItem('inv_link_v4_final') || DEFAULT_SHEET_URL);
  
  const [deliveryData, setDeliveryData] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem('del_v4_final');
    return saved ? JSON.parse(saved) : [];
  });
  const [deliveryFilters, setDeliveryFilters] = useState({
    persona: '', seccion: '', departamento: '', fechaInicio: '', fechaFin: ''
  });

  const [solicitudStep, setSolicitudStep] = useState<'crear' | 'cerrar'>('crear');
  const [solicitudFilters, setSolicitudFilters] = useState(() => {
    const saved = localStorage.getItem('solicitud_filters_v12');
    return saved ? JSON.parse(saved) : { persona: '', departamento: '', seccion: '' };
  });
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  
  const [finalizedRequests, setFinalizedRequests] = useState<FinalizedRequest[]>([]);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { localStorage.setItem('inv_v4_final', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('inv_link_v4_final', sourceLink); }, [sourceLink]);
  useEffect(() => { localStorage.setItem('del_v4_final', JSON.stringify(deliveryData)); }, [deliveryData]);
  useEffect(() => { localStorage.setItem('solicitud_filters_v12', JSON.stringify(solicitudFilters)); }, [solicitudFilters]);

  useEffect(() => {
    const itemsRef = ref(db, "pedidos_temporales");
    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const itemsList: OrderItem[] = Object.keys(data).map(key => ({
          id: key,
          producto: data[key].producto,
          cantidad: data[key].cantidad,
          persona: data[key].persona,
          departamento: data[key].departamento,
          seccion: data[key].seccion
        }));
        setCurrentOrderItems(itemsList);
      } else {
        setCurrentOrderItems([]);
      }
    });

    const finalizedRef = ref(db, "solicitudes_finalizadas");
    const unsubscribeFinalized = onValue(finalizedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FinalizedRequest[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        setFinalizedRequests(list);
      } else {
        setFinalizedRequests([]);
      }
    });
    
    return () => {
      unsubscribeItems();
      unsubscribeFinalized();
    };
  }, []);

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { if (isChatOpen) scrollToBottom(); }, [chatMessages, isChatOpen]);

  const deliveryStats = useMemo(() => {
    const productDataMap: Record<string, { total: number, sections: Record<string, number> }> = {};
    let globalTotal = 0;
    
    deliveryData.forEach(d => {
      const pName = d.producto?.trim();
      if (pName) {
        const qty = (d.cantidad || 0);
        if (!productDataMap[pName]) {
          productDataMap[pName] = { total: 0, sections: {} };
        }
        productDataMap[pName].total += qty;
        productDataMap[pName].sections[d.seccion] = (productDataMap[pName].sections[d.seccion] || 0) + qty;
        globalTotal += qty;
      }
    });

    const top5 = Object.entries(productDataMap)
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 5)
      .map(([name, data]) => ({ 
        name, 
        total: data.total,
        sections: Object.entries(data.sections)
          .map(([sec, q]) => ({
            name: sec || 'N/A',
            quantity: q,
            // Porcentaje relativo al total global (flecha) para que sumen el % del producto
            percent: globalTotal > 0 ? Math.round((q / globalTotal) * 100) : 0 
          }))
          .sort((a,b) => b.quantity - a.quantity)
      }));
    
    return { top5, globalTotal };
  }, [deliveryData]);

  const syncData = async (type: 'inventory' | 'delivery' = 'inventory', silent = false) => {
    const link = type === 'inventory' ? sourceLink : DELIVERY_SHEET_URL;
    if (!link || !link.includes('docs.google.com/spreadsheets')) return;
    if (!silent) setIsSyncing(true);
    try {
      let url = link;
      if (url.includes('/edit')) {
        const baseUrl = url.split('/edit')[0];
        const gidMatch = url.match(/[?#&]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '';
        url = `${baseUrl}/export?format=csv${gid ? `&gid=${gid}` : ''}`;
      } else if (!url.includes('/export')) {
        url = url.replace(/\/$/, '') + '/export?format=csv';
      }
      
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('<html') || text.trim() === '') throw new Error("Hoja no pública");
      const colsData = parseCSV(text);
      if (colsData.length < 2) throw new Error("Sin datos suficientes");
      const rows = colsData.slice(1);
      if (type === 'inventory') {
        const newInv = rows.map((cols, i) => ({
          id: `item-${i}-${Date.now()}`,
          quantity: parseInt(cols[0]?.replace(/[^0-9]/g, '')) || 0,
          name: cols[1] || 'Sin nombre',
          sku: cols[1]?.substring(0, 10).toUpperCase() || 'S/N',
          location: cols[2] || 'No especificado',
          responsible: cols[3] || 'Sin asignar',
          link: cols[4] || '', 
          imageUrl: cols[5] || '', 
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
      if (!silent) console.error(`Error Sincronización ${type}:`, e);
    } finally {
      if (!silent) setIsSyncing(false);
    }
  };

  useEffect(() => {
    syncData('inventory', true);
    syncData('delivery', true);
    const syncInterval = setInterval(() => {
      syncData('inventory', true);
      syncData('delivery', true);
    }, 30000);
    const handleFocus = () => {
      syncData('inventory', true);
      syncData('delivery', true);
    };
    window.addEventListener('focus', handleFocus);
    return () => {
      clearInterval(syncInterval);
      window.removeEventListener('focus', handleFocus);
    };
  }, [sourceLink]);

  const allPossiblePersonas = useMemo(() => {
    const set = new Set<string>();
    deliveryData.forEach(d => { if(d.persona) set.add(d.persona); });
    return Array.from(set).filter(Boolean).sort();
  }, [deliveryData]);

  const allPossibleDeptos = useMemo(() => {
    const set = new Set<string>();
    deliveryData.forEach(d => { if(d.departamento) set.add(d.departamento); });
    return Array.from(set).filter(Boolean).sort();
  }, [deliveryData]);

  const allPossibleSecciones = useMemo(() => {
    const set = new Set<string>();
    deliveryData.forEach(d => { if(d.seccion) set.add(d.seccion); });
    return Array.from(set).filter(Boolean).sort();
  }, [deliveryData]);

  const uniqueSeccionesHistory = allPossibleSecciones;
  const uniqueDepartamentosHistory = allPossibleDeptos;

  const filteredDelivery = useMemo(() => {
    return deliveryData
      .filter(d => {
        const matchPersona = !deliveryFilters.persona || (d.persona && d.persona.toLowerCase().includes(deliveryFilters.persona.toLowerCase()));
        const matchSeccion = !deliveryFilters.seccion || d.seccion === deliveryFilters.seccion;
        const matchDepto = !deliveryFilters.departamento || d.departamento === deliveryFilters.departamento;
        const itemDate = getNormalizedTimestamp(d.fecha);
        if (!itemDate) return matchPersona && matchSeccion && matchDepto;
        const start = deliveryFilters.fechaInicio ? new Date(deliveryFilters.fechaInicio).getTime() : null;
        const end = deliveryFilters.fechaFin ? new Date(deliveryFilters.fechaFin).getTime() : null;
        return matchPersona && matchSeccion && matchDepto && (!start || itemDate >= start) && (!end || itemDate <= end);
      })
      .sort((a, b) => (getNormalizedTimestamp(b.fecha) || 0) - (getNormalizedTimestamp(a.fecha) || 0));
  }, [deliveryData, deliveryFilters]);

  const isDeliveryFilterActive = useMemo(() => {
    return !!(deliveryFilters.persona.trim() || deliveryFilters.seccion || deliveryFilters.departamento || deliveryFilters.fechaInicio || deliveryFilters.fechaFin);
  }, [deliveryFilters]);

  const handleSolicitantePersonaChange = (val: string) => {
    const trimmedVal = val.trim();
    setSolicitudFilters(prev => {
      const newState = { ...prev, persona: val };
      if (trimmedVal !== '') {
        const match = [...deliveryData].reverse().find(d => 
          d.persona && d.persona.trim().toLowerCase() === trimmedVal.toLowerCase()
        );
        if (match) {
          newState.departamento = match.departamento || prev.departamento;
          newState.seccion = match.seccion || prev.seccion;
        }
      }
      return newState;
    });
  };

  const clearTemporaryOrders = async () => {
    try {
      const itemsRef = ref(db, "pedidos_temporales");
      await remove(itemsRef);
    } catch (err) {
      console.error("Error clearing orders:", err);
    }
  };

  const loadPreviousOrder = async () => {
    const personName = solicitudFilters.persona.trim().toLowerCase();
    if (!personName) return;
    const personDeliveries = deliveryData.filter(d => d.persona.trim().toLowerCase() === personName);
    if (personDeliveries.length === 0) return;
    const sorted = [...personDeliveries].sort((a, b) => (getNormalizedTimestamp(b.fecha) || 0) - (getNormalizedTimestamp(a.fecha) || 0));
    const latestDate = sorted[0].fecha;
    const lastOrderItemsRaw = sorted.filter(d => d.fecha === latestDate);
    await clearTemporaryOrders();
    const itemsRef = ref(db, "pedidos_temporales");
    const addPromises = lastOrderItemsRaw.map(item => push(itemsRef, {
      producto: item.producto,
      cantidad: item.cantidad,
      persona: solicitudFilters.persona,
      departamento: solicitudFilters.departamento,
      seccion: solicitudFilters.seccion
    }));
    await Promise.all(addPromises);
  };

  const addItemToOrder = async (p: Product) => {
    const { persona, departamento, seccion } = solicitudFilters;
    try {
      const existing = currentOrderItems.find(item => 
        item.producto === p.name && 
        item.persona === persona
      );
      if (existing && existing.id) {
        const itemRef = ref(db, `pedidos_temporales/${existing.id}`);
        await update(itemRef, { cantidad: existing.cantidad + 1 });
      } else {
        const itemsRef = ref(db, "pedidos_temporales");
        await push(itemsRef, { producto: p.name, cantidad: 1, persona, departamento, seccion });
      }
    } catch (err) {
      console.error("Add item error:", err);
    }
  };

  const updateItemQuantity = async (idx: number, delta: number) => {
    try {
      const item = currentOrderItems[idx];
      if (!item || !item.id) return;
      const newVal = item.cantidad + delta;
      const itemRef = ref(db, `pedidos_temporales/${item.id}`);
      if (newVal <= 0) { await remove(itemRef); }
      else { await update(itemRef, { cantidad: newVal }); }
    } catch (err) {
      console.error("Update item error:", err);
    }
  };

  const finalizarPedido = async () => {
    const { persona, departamento, seccion } = solicitudFilters;
    if (!persona.trim() || !departamento.trim() || !seccion.trim()) return;
    const userItems = currentOrderItems.filter(i => i.persona === persona);
    if (userItems.length === 0) return;
    const fechaActual = new Date().toLocaleDateString('es-ES');
    const newRequestData = {
      persona: persona.trim(),
      departamento: departamento.trim(),
      seccion: seccion.trim(),
      fecha: fechaActual,
      items: userItems.map(i => ({ producto: i.producto, cantidad: i.cantidad }))
    };
    try {
      const finalizedRef = ref(db, "solicitudes_finalizadas");
      await push(finalizedRef, newRequestData);
      for (const item of userItems) {
        if (item.id) { await remove(ref(db, `pedidos_temporales/${item.id}`)); }
      }
      setSolicitudFilters({ persona: '', departamento: '', seccion: '' });
      setSolicitudStep('cerrar');
    } catch (err) {
      console.error("Error al finalizar:", err);
    }
  };

  const handleConfirmOk = async (req: FinalizedRequest) => {
    try {
      const dataToSend = { persona: req.persona, departamento: req.departamento, seccion: req.seccion, items: req.items };
      await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(dataToSend) });
      const reqRef = ref(db, `solicitudes_finalizadas/${req.id}`);
      await remove(reqRef);
    } catch (e) {
      console.error("Error procesando acción OK:", e);
    }
  };

  const askAi = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const query = new FormData(form).get('ai-query') as string;
    if (!query) return;
    const newUserMsg: ChatMessage = { role: 'user', text: query, timestamp: new Date() };
    setChatMessages(prev => [...prev, newUserMsg]);
    form.reset();
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextText = inventory.slice(0, 30).map(i => `${i.name}: ${i.quantity} en ${i.location}`).join(' | ');
      const res = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `Contexto: ${contextText}\nPregunta: ${query}`,
        config: { systemInstruction: "Asistente logístico. Respuestas muy cortas y directas." }
      });
      setChatMessages(prev => [...prev, { role: 'ai', text: res.text || 'Sin respuesta.', timestamp: new Date() }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'system', text: 'Error IA.', timestamp: new Date() }]);
    } finally { setAiLoading(false); }
  };

  const navItems = [
    { id: AppSection.DASHBOARD, icon: <ICONS.Dashboard />, label: 'Inicio' },
    { id: AppSection.QUERY, icon: <ICONS.Search />, label: 'Buscar' },
    { id: AppSection.SOLICITUD, icon: <ICONS.Solicitud />, label: 'Solicitud' },
    { id: AppSection.ENTREGA, icon: <ICONS.Delivery />, label: 'Entrega' },
    { id: AppSection.SETTINGS, icon: <ICONS.Settings />, label: 'Ajustes' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] pb-24 md:pb-0 font-['Plus_Jakarta_Sans']">
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-20 shadow-sm">
        <div className="p-8 flex items-center gap-4"><CustomLogo /><h1 className="font-black text-base text-slate-800 tracking-tight leading-none uppercase">Stock<br/><span className="text-blue-600 text-sm">Bodega</span></h1></div>
        <nav className="flex-1 px-5 space-y-2 mt-2">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-black text-xs uppercase tracking-widest ${activeSection === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-100 scale-[1.02]' : 'text-slate-400 hover:bg-slate-50'}`}>
              {item.icon} <span>{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className={`flex-1 md:ml-64 p-4 md:p-12 max-w-6xl mx-auto w-full`}>
        <header className="flex flex-col mb-6 md:mb-10">
          <div className="flex justify-between items-center mb-6">
            <div className="hidden md:block">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-800 tracking-tighter uppercase leading-none">
                {activeSection === AppSection.DASHBOARD && 'Vista General'}
                {activeSection === AppSection.QUERY && 'Consultas de Activos'}
                {activeSection === AppSection.SOLICITUD && 'Gestión de Solicitudes'}
                {activeSection === AppSection.ENTREGA && 'Control de Historial'}
                {activeSection === AppSection.SETTINGS && 'Configuración'}
              </h2>
            </div>
            <div className="md:hidden flex items-center gap-3"><CustomLogo /><h1 className="font-black text-sm text-slate-800 tracking-tight leading-none uppercase">Stock<br/><span className="text-blue-600 text-[10px]">Bodega</span></h1></div>
          </div>
        </header>

        {activeSection === AppSection.DASHBOARD && (
          <div className="space-y-6 md:space-y-10 animate-fade-in">
            <div className="bg-white p-6 md:p-12 rounded-[40px] shadow-sm border border-slate-100">
               <h3 className="text-xs font-black text-slate-800 mb-10 uppercase tracking-widest flex items-center gap-3">
                 <div className="w-2 h-6 bg-blue-600 rounded-full"></div>
                 Top 5 Productos Solicitados
               </h3>
               {deliveryStats.top5.length > 0 ? ( 
                 <PieChart3D data={deliveryStats.top5} globalTotal={deliveryStats.globalTotal} /> 
               ) : (
                 <div className="py-20 text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">No hay datos aún.</div>
               )}
            </div>
            {!isChatOpen ? (
              <button onClick={() => setIsChatOpen(true)} className="w-full bg-blue-600 p-8 md:p-10 rounded-[32px] md:rounded-[40px] shadow-2xl text-white flex items-center justify-between group hover:bg-blue-700 transition-all active:translate-y-1"><div className="text-left"><h4 className="text-lg md:text-2xl font-black uppercase tracking-tighter leading-none mb-2 md:mb-3">Asistente Logístico IA</h4><p className="text-blue-100 text-[11px] md:text-[13px] opacity-90 uppercase tracking-widest font-bold">Resuelve dudas sobre stock.</p></div><div className="bg-white/20 p-4 md:p-5 rounded-2xl group-hover:scale-110 transition-transform"><ICONS.Search /></div></button>
            ) : (
              <div className="bg-white rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden flex flex-col h-[400px] md:h-[500px] animate-fade-in"><div className="p-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><span className="font-black text-[10px] uppercase tracking-widest text-slate-500">IA Bodega</span><button onClick={() => setIsChatOpen(false)} className="text-slate-400 p-2 hover:bg-slate-200 rounded-xl"><ICONS.ExternalLink /></button></div><div className="flex-1 overflow-y-auto p-4 space-y-4">{chatMessages.map((msg, i) => (<div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] px-4 py-2 rounded-2xl text-[13px] font-bold ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>{msg.text}</div></div>))}<div ref={chatEndRef} /></div><form onSubmit={askAi} className="p-4 border-t border-slate-100 flex gap-2"><input name="ai-query" placeholder="Pregunta algo..." className="flex-1 bg-slate-50 border rounded-xl px-4 py-3 outline-none text-sm font-bold uppercase" /><button className="bg-blue-600 text-white px-4 rounded-xl shadow-xl"><ICONS.Search /></button></form></div>
            )}
          </div>
        )}

        {activeSection === AppSection.QUERY && (
          <div className="animate-fade-in space-y-6 md:space-y-10">
            <div className="bg-white p-6 md:p-10 rounded-[24px] md:rounded-[32px] shadow-sm border border-slate-100">
               <h3 className="text-sm font-black text-slate-800 mb-6 uppercase tracking-widest text-center">Buscador de Productos</h3>
               <AutocompleteSearch products={inventory} onSelect={setSelectedProduct} />
            </div>
            {selectedProduct && (
              <div className="max-w-3xl mx-auto animate-fade-in">
                <div className="bg-white rounded-[40px] shadow-2xl border border-slate-100 p-8 md:p-12">
                   {selectedProduct.imageUrl && (
                     <div className="w-full mb-8 flex justify-center">
                       <img 
                        src={formatImageUrl(selectedProduct.imageUrl)} 
                        alt={selectedProduct.name} 
                        className="max-h-64 md:max-h-80 w-auto rounded-3xl shadow-lg border border-slate-100 object-contain"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                       />
                     </div>
                   )}
                   <span className="text-[10px] font-black text-blue-600 uppercase bg-blue-50 px-4 py-2 rounded-full mb-6 inline-block">Ficha de Producto</span>
                   <h4 className="text-2xl md:text-4xl font-black text-slate-800 uppercase leading-none mb-8">{selectedProduct.name}</h4>
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                      <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ubicación</p><p className="text-lg text-slate-800 font-bold uppercase">{selectedProduct.location}</p></div>
                      <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">SKU</p><p className="text-lg text-slate-800 font-bold uppercase">#{selectedProduct.sku}</p></div>
                   </div>
                   <div className="bg-blue-600 p-10 rounded-[32px] text-white flex justify-between items-center shadow-2xl border-b-8 border-blue-800">
                      <div><p className="text-blue-100 font-black uppercase text-xs tracking-widest mb-1">Cantidad Actual</p><p className="text-sm text-blue-200 opacity-80 uppercase font-black">Stock disponible</p></div>
                      <h5 className="text-5xl md:text-7xl font-black">{selectedProduct.quantity}</h5>
                   </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.SOLICITUD && (
          <div className="animate-fade-in space-y-4">
            <div className="bg-white p-4 md:p-6 rounded-[24px] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-4">
                 <h3 className="font-black text-slate-800 text-[10px] md:text-xs uppercase tracking-widest">Solicitante</h3>
                 <button onClick={() => setSolicitudFilters({ persona: '', departamento: '', seccion: '' })} className="text-rose-500 font-bold text-[8px] uppercase hover:underline">LIMPIAR</button>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Persona</label>
                    <input type="text" list="personas-list-smart" value={solicitudFilters.persona} onChange={(e) => handleSolicitantePersonaChange(e.target.value)} placeholder="Nombre..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <datalist id="personas-list-smart">{allPossiblePersonas.map(p => <option key={p} value={p} />)}</datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Departamento</label>
                    <input type="text" list="deptos-list-smart" value={solicitudFilters.departamento} onChange={(e) => setSolicitudFilters({...solicitudFilters, departamento: e.target.value})} placeholder="Depto..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <datalist id="deptos-list-smart">{allPossibleDeptos.map(d => <option key={d} value={d} />)}</datalist>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Sección</label>
                    <input type="text" list="secciones-list-smart" value={solicitudFilters.seccion} onChange={(e) => setSolicitudFilters({...solicitudFilters, seccion: e.target.value})} placeholder="Sección..." className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500 transition-all" />
                    <datalist id="secciones-list-smart">{allPossibleSecciones.map(s => <option key={s} value={s} />)}</datalist>
                  </div>
               </div>
               {solicitudFilters.persona.trim() !== '' && (
                 <div className="mt-3">
                   <button onClick={loadPreviousOrder} className="bg-blue-50 text-blue-600 font-black px-4 py-2 rounded-lg text-[8px] uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-100 shadow-sm flex items-center gap-2"><ICONS.Delivery /> PEDIDO ANTERIOR</button>
                 </div>
               )}
            </div>

            <div className="flex gap-2">
              <button onClick={() => setSolicitudStep('crear')} className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all ${solicitudStep === 'crear' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>Crear Pedido</button>
              <button onClick={() => setSolicitudStep('cerrar')} className={`flex-1 py-2 rounded-xl font-black text-[9px] uppercase tracking-[0.15em] transition-all relative ${solicitudStep === 'cerrar' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border'}`}>Cerrar Pedido {finalizedRequests.length > 0 && <span className="ml-1 bg-rose-500 text-white px-1.5 rounded-full text-[8px]">{finalizedRequests.length}</span>}</button>
            </div>

            {solicitudStep === 'crear' && (
              <div className="space-y-4 animate-fade-in">
                <div className="bg-white p-4 md:p-6 rounded-[24px] border border-slate-100 shadow-sm">
                  <h4 className="text-[9px] font-black text-slate-800 uppercase mb-3 tracking-widest">Añadir Productos</h4>
                  <AutocompleteSearch products={inventory} onSelect={addItemToOrder} placeholder="Escribe para añadir rápido..." />
                </div>
                {currentOrderItems.filter(i => i.persona === solicitudFilters.persona).length > 0 && (
                  <div className="bg-white rounded-[24px] border shadow-sm overflow-hidden animate-fade-in">
                    <div className="p-4 bg-slate-50 border-b flex justify-between items-center"><h4 className="font-black text-slate-800 text-[9px] uppercase tracking-widest">Lista Temporal</h4><button onClick={clearTemporaryOrders} className="text-rose-500 font-bold text-[8px] uppercase">LIMPIAR LISTA</button></div>
                    <div className="divide-y divide-slate-50">
                      {currentOrderItems.filter(i => i.persona === solicitudFilters.persona).map((item, i) => (
                        <div key={item.id || i} className="p-3 md:p-4 flex justify-between items-center">
                          <div className="flex items-center gap-3"><span className="font-bold text-slate-800 text-xs uppercase">{item.producto}</span></div>
                          <div className="flex items-center gap-3">
                             <button onClick={() => updateItemQuantity(currentOrderItems.indexOf(item), -1)} className="bg-slate-100 p-1.5 rounded-lg hover:bg-rose-100 transition-colors scale-90"><ICONS.Minus /></button>
                             <span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg font-black text-xs w-10 text-center">{item.cantidad}</span>
                             <button onClick={() => updateItemQuantity(currentOrderItems.indexOf(item), 1)} className="bg-slate-100 p-1.5 rounded-lg hover:bg-blue-100 transition-colors scale-90"><ICONS.Plus /></button>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-4 bg-slate-50 border-t"><button onClick={finalizarPedido} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl text-[9px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all flex items-center justify-center gap-2">FINALIZAR PEDIDO</button></div>
                  </div>
                )}
              </div>
            )}

            {solicitudStep === 'cerrar' && (
              <div className="space-y-4 animate-fade-in">
                {finalizedRequests.length === 0 ? (
                  <div className="bg-white p-10 rounded-[24px] border text-center flex flex-col items-center"><div className="bg-slate-50 p-4 rounded-full mb-4"><ICONS.Solicitud /></div><p className="font-black text-slate-300 text-[8px] uppercase tracking-widest">No hay pedidos pendientes</p></div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {finalizedRequests.map((req) => (
                      <div key={req.id} className="bg-white rounded-[24px] border shadow-md overflow-hidden flex flex-col animate-fade-in">
                        <div className="p-4 bg-blue-50 border-b"><div className="flex justify-between items-center mb-2"><span className="bg-white px-2 py-0.5 rounded-full font-black text-[7px] text-blue-600 uppercase tracking-widest">#{req.id.split('-').pop()}</span><span className="text-[8px] font-bold text-slate-400">{req.fecha}</span></div><h4 className="font-black text-slate-800 text-sm uppercase leading-none tracking-tight">{req.persona}</h4><p className="text-[7px] font-bold text-blue-600 uppercase tracking-widest mt-1 truncate">{req.departamento} | {req.seccion}</p></div>
                        <div className="p-4 flex-1 space-y-2">{req.items.map((item, idx) => ( <div key={idx} className="flex justify-between items-center text-[10px] font-bold border-b border-dashed pb-1"><span className="text-slate-800 uppercase truncate pr-2">{item.producto}</span><span className="text-blue-600 font-black">x{item.cantidad}</span></div> ))}</div>
                        <div className="p-4 bg-slate-50"><button onClick={() => handleConfirmOk(req)} className="w-full bg-blue-600 text-white font-black py-3 rounded-lg text-[9px] uppercase tracking-widest shadow-md flex items-center justify-center gap-2 border-b-2 border-blue-800 active:scale-95 transition-all">OK</button></div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.ENTREGA && (
          <div className="animate-fade-in space-y-6 md:space-y-10">
            <div className="bg-white p-5 md:p-10 rounded-[32px] shadow-sm border border-slate-100">
               <div className="flex justify-between items-center mb-8"><h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-widest">Búsqueda en Historial</h3><button onClick={() => syncData('delivery')} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg">{isSyncing ? '...' : 'Actualizar'}</button></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Persona</label><input type="text" list="personas-entrega-list" value={deliveryFilters.persona} onChange={(e) => setDeliveryFilters({...deliveryFilters, persona: e.target.value})} placeholder="Buscar..." className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold uppercase outline-none focus:ring-2 focus:ring-blue-500" /><datalist id="personas-entrega-list">{allPossiblePersonas.map(p => <option key={p} value={p} />)}</datalist></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Sección</label><select value={deliveryFilters.seccion} onChange={(e) => setDeliveryFilters({...deliveryFilters, seccion: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold uppercase appearance-none"><option value="">TODAS</option>{uniqueSeccionesHistory.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Depto</label><select value={deliveryFilters.departamento} onChange={(e) => setDeliveryFilters({...deliveryFilters, departamento: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-sm font-bold uppercase appearance-none"><option value="">TODOS</option>{uniqueDepartamentosHistory.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-4 md:col-span-2"><div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Desde</label><input type="date" value={deliveryFilters.fechaInicio} onChange={(e) => setDeliveryFilters({...deliveryFilters, fechaInicio: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-xs font-bold" /></div><div className="space-y-2"><label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Hasta</label><input type="date" value={deliveryFilters.fechaFin} onChange={(e) => setDeliveryFilters({...deliveryFilters, fechaFin: e.target.value})} className="w-full px-4 py-3 bg-slate-50 border rounded-xl text-xs font-bold" /></div></div>
                  <div className="flex items-end"><button onClick={() => setDeliveryFilters({persona: '', seccion: '', departamento: '', fechaInicio: '', fechaFin: ''})} className="w-full py-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Limpiar</button></div>
               </div>
            </div>
            
            {isDeliveryFilterActive && (
              <div className="bg-white rounded-[40px] shadow-sm border overflow-hidden animate-fade-in">
                <div className="p-8 border-b bg-blue-50 flex justify-between items-center"><div><h3 className="font-black text-blue-800 text-sm md:text-base uppercase tracking-tight">Registro de Entregas</h3><p className="text-blue-600 text-[10px] font-bold uppercase mt-1 tracking-widest">{filteredDelivery.length} resultados</p></div><div className="bg-white px-5 py-3 rounded-2xl border text-center"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Total</p><p className="text-xl font-black text-blue-600">{filteredDelivery.reduce((acc, curr) => acc + (curr.cantidad || 0), 0)}</p></div></div>
                <div className="overflow-x-auto"><table className="w-full text-left table-fixed min-w-[800px]"><thead className="bg-slate-50 text-slate-400 font-black uppercase text-[10px] tracking-widest"><tr><th className="px-8 py-6 w-20 text-center">Cant.</th><th className="px-8 py-6 w-1/3">Producto</th><th className="px-8 py-6">Persona</th><th className="px-8 py-6">Sección</th><th className="px-8 py-6">Depto</th><th className="px-8 py-6 w-32">Fecha</th></tr></thead><tbody className="text-slate-600 text-[11px] divide-y">{filteredDelivery.map((d, idx) => (<tr key={idx} className="hover:bg-slate-50 transition-colors"><td className="px-8 py-4 text-center font-black text-slate-800 text-sm">{d.cantidad}</td><td className="px-8 py-4 font-bold text-blue-600 uppercase truncate">{d.producto}</td><td className="px-8 py-4 font-black text-slate-800 uppercase tracking-tight truncate">{d.persona}</td><td className="px-8 py-4 font-bold text-slate-800 uppercase truncate">{d.seccion}</td><td className="px-8 py-4 font-bold text-slate-400 uppercase truncate">{d.departamento}</td><td className="px-8 py-4 font-bold text-slate-400">{d.fecha}</td></tr>))}{filteredDelivery.length === 0 && (<tr><td colSpan={6} className="px-8 py-20 text-center"><p className="font-black text-slate-300 text-[12px] uppercase tracking-widest">No hay registros</p></td></tr>)}</tbody></table></div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.SETTINGS && (
          <div className="max-w-2xl bg-white p-10 rounded-[32px] shadow-sm border border-slate-100 animate-fade-in"><h3 className="text-xl font-bold text-slate-800 mb-8 uppercase tracking-widest">Origen de Datos</h3><div className="space-y-6"><div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 text-center"><span className="text-blue-600 font-black text-2xl uppercase tracking-widest">Actualizado</span></div><button onClick={() => { syncData('inventory'); syncData('delivery'); }} disabled={isSyncing} className="w-full bg-blue-600 text-white font-black py-5 rounded-2xl shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 text-[10px] uppercase tracking-widest">{isSyncing ? 'Conectando...' : 'Recargar Datos'}</button></div></div>
        )}
      </main>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t px-2 py-3 flex justify-around items-center z-50 shadow-2xl">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeSection === item.id ? 'text-blue-600 scale-110' : 'text-slate-400'}`}><div className={`${activeSection === item.id ? 'bg-blue-50 p-2 rounded-xl' : ''}`}>{item.icon}</div><span className="text-[10px] font-bold uppercase tracking-tighter">{item.label}</span></button>
        ))}
      </nav>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root')!);
root.render(<React.StrictMode><App /></React.StrictMode>);
