
import React, { useState, useEffect, useRef, useMemo } from 'react';
import './index.css';
import { motion, AnimatePresence } from 'motion/react';
import { createRoot } from 'react-dom/client';
// Fix: Use standard modular named import for Firebase v9+ initializeApp
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
  minStock: number; 
  valor?: string;
}

interface DeliveryRecord {
  id: string;
  fecha: string;
  seccion: string;
  departamento: string;
  producto: string;
  cantidad: number;
}

interface OrderItem {
  id?: string;
  producto: string;
  cantidad: number;
  departamento?: string;
  seccion?: string;
}

interface FinalizedRequest {
  id: string;
  departamento: string;
  seccion: string;
  fecha: string;
  hora?: string;
  items: { producto: string; cantidad: number }[];
}

interface Activo {
  id: string;
  cantidad?: string | number;
  producto: string;
  responsable: string;
  lugar: string;
  documentacion: string;
}

enum AppSection {
  DASHBOARD = 'DASHBOARD',
  QUERY = 'QUERY',
  SOLICITUD = 'SOLICITUD',
  ENTREGA = 'ENTREGA',
  ORDER = 'ORDER',
  ACTIVOS = 'ACTIVOS'
}

// --- 2. CONSTANTES E ICONOS ---
const DEFAULT_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/edit?gid=507872400#gid=507872400';
const DELIVERY_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/edit?usp=sharing';
const ACTIVOS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1JTS32TlyYkWOFrP-v60KSSfZn25uA49KsTGrT6TFFKc/edit?gid=1765471375#gid=1765471375';
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz9R2ocvOKfUpf78kVjZxG9EL5tbGxqtvu2Y-YeM7ADGbA41JdHdJ0GRmCJ3Qh8-LY/exec';

const AnimatedTitle = ({ text }: { text: string }) => {
  const characters = text.split("");
  
  return (
    <motion.span className="inline-flex flex-wrap justify-center">
      <AnimatePresence>
        {characters.map((char, index) => (
          <motion.span
            key={`${char}-${index}`}
            initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.8, filter: "blur(4px)" }}
            transition={{ 
              duration: 0.3, 
              delay: index * 0.03,
              type: "spring",
              stiffness: 200,
              damping: 20
            }}
            className={char === " " ? "w-2" : ""}
          >
            {char}
          </motion.span>
        ))}
      </AnimatePresence>
    </motion.span>
  );
};

const OrderMascot = ({ count, onClick }: { count: number; onClick: () => void }) => {
  if (count === 0) return null;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5, y: 100 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.5, y: 100 }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className="fixed bottom-24 md:bottom-8 right-8 z-[60] cursor-pointer flex flex-col items-center group"
    >
      {/* Burbuja de texto opcional para reforzar el mensaje */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white px-4 py-2 rounded-2xl shadow-xl border border-slate-100 mb-2 relative group-hover:bg-blue-50 transition-colors"
      >
        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
          {count > 5 ? "¡Muchos pedidos!" : `¡Tienes ${count} ${count === 1 ? 'pedido' : 'pedidos'}!`}
        </p>
        <div className="absolute -bottom-1 right-6 w-2 h-2 bg-white border-r border-b border-slate-100 rotate-45 group-hover:bg-blue-50 transition-colors"></div>
      </motion.div>

      <motion.img
        src="https://cdn-icons-png.flaticon.com/512/2666/2666505.png"
        alt="Lista de Pedidos"
        className="w-32 md:w-40 h-32 md:h-40 object-contain scale-110"
        animate={count > 5 ? {
          rotate: [0, -10, 10, -10, 10, 0],
          transition: {
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }
        } : {
          y: [0, -20, 0],
          rotate: [0, -5, 5, 0],
          transition: {
            duration: 1.5,
            repeat: count,
            repeatType: "loop",
            ease: "easeInOut"
          }
        }}
      />
    </motion.div>
  );
};

const CustomLogo = ({ trigger }: { trigger: any }) => (
  <div className="group relative overflow-hidden rounded-none p-0 transition-all duration-500 hover:bg-transparent flex items-center justify-center shrink-0">
    <img 
      key={trigger}
      src="https://appsiomaristas.cl/public/img/logoIOR.png" 
      alt="Logo Maristas IOR"
      referrerPolicy="no-referrer"
      className="relative w-36 h-36 md:w-48 md:h-48 object-contain transform transition-transform duration-500 animate-rotate border-none outline-none shadow-none bg-transparent"
      onError={(e) => {
        e.currentTarget.src = "https://instituto-ohiggins.cl/wp-content/uploads/2021/04/logo-maristas-rancagua.png";
      }}
    />
  </div>
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
  ChevronDown: () => <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" /></svg>,
  ShoppingBag: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>,
  Box: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>,
  Printer: () => <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
};

// --- Shine Effect Component ---
const ShineEffect = () => (
  <div className="absolute inset-0 w-1/2 h-full bg-white/10 skew-x-[45deg] -translate-x-full group-hover:translate-x-[250%] transition-transform duration-1000 pointer-events-none"></div>
);

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
  value: number;
  percent: number;
}
interface ProductStat {
  name: string;
  total: number;
  totalValue: number;
  sections: SectionBreakdown[];
}
const PieChart3D: React.FC<{ data: ProductStat[], globalTotal?: number, globalTotalValue?: number, title?: string, showValues?: boolean }> = ({ data, globalTotal, globalTotalValue, title, showValues }) => {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const localSum = data.reduce((sum, item) => sum + (showValues ? item.totalValue : item.total), 0);
  const displayTotal = (showValues ? globalTotalValue : globalTotal) || localSum;
  const colors = ['#1e40af', '#2563eb', '#3b82f6', '#60a5fa', '#93c5fd'];
  const radiusX = 140;
  const radiusY = 75;
  const depth = 22;
  const centerX = 160;
  const centerY = 110;
  if (localSum === 0) return null;
  let angleSum = 0;
  const slices = data.map((item, i) => {
    const metric = showValues ? item.totalValue : item.total;
    const sliceAngle = (metric / localSum) * 2 * Math.PI;
    const startAngle = angleSum;
    const endAngle = angleSum + sliceAngle;
    angleSum = endAngle;
    const midAngle = startAngle + (sliceAngle / 2);
    return { item, i, startAngle, endAngle, midAngle, sliceAngle };
  });
  const sortedSlices = [...slices].sort((a, b) => Math.sin(a.midAngle) - Math.sin(b.midAngle));
  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 md:p-12 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-200/60 mb-8 overflow-hidden h-full">
      <div className="text-xs font-black text-slate-800 mb-10 uppercase tracking-widest flex items-center gap-3">
        <div className="w-2 h-6 bg-gradient-to-b from-blue-600 to-indigo-600 rounded-full shadow-lg shadow-blue-200"></div>
        {title || "Estadísticas"}
      </div>
      <div className="flex flex-col lg:flex-row items-start justify-between gap-10 animate-fade-in relative min-h-[350px] lg:min-h-0">
        <div className="relative w-full max-w-[320px] lg:max-w-[420px] lg:sticky lg:top-0 flex justify-center">
          <svg viewBox="0 0 400 280" className="w-full drop-shadow-[0_25px_35px_rgba(30,64,175,0.15)] overflow-visible pointer-events-none transform transition-transform duration-700">
            {sortedSlices.map((slice) => {
              const { item, i, startAngle, endAngle, midAngle, sliceAngle } = slice;
              const isHighlighted = highlightedIndex === i;
              const explodeOffset = isHighlighted ? 45 : 0;
              const ox = explodeOffset * Math.cos(midAngle);
              const oy = explodeOffset * Math.sin(midAngle);
              const x1 = centerX + radiusX * Math.cos(startAngle);
              const y1 = centerY + radiusY * Math.sin(startAngle);
              const x2 = centerX + radiusX * Math.cos(endAngle);
              const y2 = centerY + radiusY * Math.sin(endAngle);
              const largeArcFlag = sliceAngle > Math.PI ? 1 : 0;
              return (
                <g key={`slice-group-${i}`} style={{ transform: `translate(${ox}px, ${oy}px)`, transition: 'transform 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)' }}>
                  <path d={`M ${x1} ${y1} L ${x1} ${y1 + depth} A ${radiusX} ${radiusY} 0 ${largeArcFlag} 1 ${x2} ${y2 + depth} L ${x2} ${y2} A ${radiusX} ${radiusY} 0 ${largeArcFlag} 0 ${x1} ${y1}`} fill={colors[i % colors.length]} filter="brightness(0.75)" />
                  <path d={`M ${centerX} ${centerY} L ${x1} ${y1} L ${x1} ${y1 + depth} L ${centerX} ${centerY + depth} Z`} fill={colors[i % colors.length]} filter="brightness(0.55)" />
                  <path d={`M ${centerX} ${centerY} L ${x2} ${y2} L ${x2} ${y2 + depth} L ${centerX} ${centerY + depth} Z`} fill={colors[i % colors.length]} filter="brightness(0.88)" />
                  <path d={`M ${centerX} ${centerY} L ${x1} ${y1} A ${radiusX} ${radiusY} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="flex-1 w-full space-y-3">
          {data.map((item, i) => {
            const metric = showValues ? item.totalValue : item.total;
            return (
            <div key={`legend-${i}`} className="group transition-all" onMouseEnter={() => setHighlightedIndex(i)} onMouseLeave={() => setHighlightedIndex(null)}>
              <button onClick={() => setExpandedIndex(expandedIndex === i ? null : i)} className="w-full flex items-center justify-between p-4 rounded-2xl transition-all duration-300 transform">
                <div className="flex items-center gap-4">
                  <div className="w-4 h-4 rounded-full shadow-inner border-2 border-white/50" style={{ backgroundColor: colors[i % colors.length] }}></div>
                  <span className="text-[11px] font-black text-slate-700 uppercase tracking-tight truncate max-w-[150px] lg:max-w-[200px] text-left">{item.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-slate-400 bg-slate-100/80 px-2 py-1 rounded-md transition-colors group-hover:bg-blue-100 group-hover:text-blue-600">{displayTotal > 0 ? Math.round((metric / displayTotal) * 100) : 0}%</span>
                  <span className="text-[11px] font-black text-blue-600 w-16 text-right">{showValues ? `$${metric.toLocaleString('es-CL')}` : metric}</span>
                  <div className={`transition-transform duration-500 ${expandedIndex === i ? 'rotate-180 text-blue-600' : 'text-slate-300'}`}><ICONS.ChevronDown /></div>
                </div>
              </button>
              <div className={`overflow-hidden transition-all duration-500 ease-in-out ${expandedIndex === i ? 'max-h-[300px] opacity-100 mt-2' : 'max-h-0 opacity-0'}`}>
                <div className="ml-8 px-5 py-4 bg-white/50 backdrop-blur-md border border-blue-50/50 rounded-2xl shadow-inner overflow-hidden">
                  <div className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-50/50 pb-2 flex justify-between"><span>Desglose</span><span>% / {showValues ? 'Valor' : 'Cant.'}</span></div>
                  <div className="space-y-2">
                    {item.sections.map((sec, j) => {
                      const secMetric = showValues ? sec.value : sec.quantity;
                      return (
                      <div key={`sec-${j}`} className="flex justify-between items-center group/item hover:bg-blue-50/40 rounded px-2 py-1 transition-colors cursor-default" onMouseEnter={() => setHighlightedIndex(i)}>
                        <span className="text-[10px] font-bold text-slate-600 uppercase truncate pr-4">{sec.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400">{metric > 0 ? Math.round((secMetric / metric) * 100) : 0}%</span>
                          <span className="text-[10px] font-black text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded shadow-sm">{showValues ? `$${secMetric.toLocaleString('es-CL')}` : secMetric}</span>
                        </div>
                      </div>
                    )})}
                  </div>
                </div>
              </div>
            </div>
          )})}
        </div>
      </div>
    </div>
  );
};

const BarChart: React.FC<{ 
  data: { name: string, quantity: number, value: number, monthKey?: string }[], 
  inventory: Product[],
  searchQuery: string,
  onSearchChange: (val: string) => void,
  onProductSelect: (p: Product | null) => void
}> = ({ data, inventory, searchQuery, onSearchChange, onProductSelect }) => {
  const maxValue = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 md:p-12 pb-64 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-200/60 mb-8 overflow-visible h-full">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-10">
        <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
          <div className="w-2 h-6 bg-gradient-to-b from-emerald-600 to-teal-600 rounded-full shadow-lg shadow-emerald-200"></div>
          Comparación por Meses
        </div>
      </div>
      {data.length === 0 ? (
        <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] opacity-60">No hay datos para este producto</div>
      ) : (
        <div className="flex items-end justify-around h-64 gap-2 md:gap-4 mt-12 relative">
          {data.map((item, i) => {
            const heightPct = (item.value / maxValue) * 100;
            return (
              <div key={i} className="flex flex-col items-center justify-end h-full w-full group relative">
                <div className="mb-2 flex flex-col items-center text-center z-10">
                  <div className="text-[10px] font-black text-emerald-600">${item.value.toLocaleString('es-CL')}</div>
                  <div className="text-[9px] font-bold text-slate-500">{item.quantity} unds.</div>
                </div>
                <div className="w-full max-w-[40px] md:max-w-[60px] bg-slate-100 rounded-t-xl overflow-hidden relative flex items-end h-full">
                  <div 
                    className="w-full bg-gradient-to-t from-emerald-400 to-teal-500 rounded-t-xl transition-all duration-1000" 
                    style={{ height: `${Math.max(heightPct, 2)}%` }}
                  ></div>
                </div>
                <div className="mt-4 text-center text-[10px] md:text-[11px] font-black text-slate-700 uppercase tracking-tight truncate w-full" title={item.name}>
                  {item.name.split(' ')[0]}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="mt-10 w-full flex justify-center">
        <div className="w-full max-w-3xl">
          <AutocompleteSearch 
            products={inventory} 
            onSelect={(p) => onProductSelect(p)} 
            value={searchQuery} 
            onChange={(val) => {
              onSearchChange(val);
              if (val.trim() === '') onProductSelect(null);
            }} 
            placeholder="Buscar producto para comparar..." 
            inputClassName="w-full px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
          />
        </div>
      </div>
    </div>
  );
};

const StockValueCard: React.FC<{ inventory: Product[] }> = ({ inventory }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<'totalValue' | 'unitValue'>('totalValue');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  const stockItems = useMemo(() => {
    return inventory.map(item => {
      const q = item.quantity || 0;
      const v = typeof item.valor === 'string' ? (parseInt(item.valor.replace(/[^0-9]/g, ''), 10) || 0) : 0;
      return { ...item, totalValue: q * v, unitValue: v };
    }).filter(item => item.totalValue > 0 || item.unitValue > 0)
      .sort((a, b) => {
        if (sortField === 'totalValue') {
          return sortOrder === 'desc' ? b.totalValue - a.totalValue : a.totalValue - b.totalValue;
        } else {
          return sortOrder === 'desc' ? b.unitValue - a.unitValue : a.unitValue - b.unitValue;
        }
      });
  }, [inventory, sortField, sortOrder]);

  const totalStockValue = useMemo(() => {
    return stockItems.reduce((acc, curr) => acc + curr.totalValue, 0);
  }, [stockItems]);

  const selectedStockItem = useMemo(() => {
    if (!selectedProduct) return null;
    
    // Aggregating all items with the same name
    const itemsWithName = stockItems.filter(item => item.name.trim().toLowerCase() === selectedProduct.name.trim().toLowerCase());
    
    if (itemsWithName.length === 0) {
      const v = typeof selectedProduct.valor === 'string' ? (parseInt(selectedProduct.valor.replace(/[^0-9]/g, ''), 10) || 0) : 0;
      const q = selectedProduct.quantity || 0;
      return {
        ...selectedProduct,
        quantity: q,
        totalValue: q * v,
        unitValue: v
      };
    }
    
    const totalQty = itemsWithName.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const totalVal = itemsWithName.reduce((acc, curr) => acc + curr.totalValue, 0);
    const firstItem = itemsWithName[0];
    
    return {
      ...firstItem,
      name: selectedProduct.name, // keep original search name casing
      quantity: totalQty,
      totalValue: totalVal,
      unitValue: firstItem.unitValue
    };
  }, [selectedProduct, stockItems]);

  return (
    <div className="bg-white/95 backdrop-blur-sm p-6 md:p-12 pb-8 rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-slate-200/60 overflow-visible h-full flex flex-col min-h-[450px]">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-3">
          <div className="w-2 h-6 bg-gradient-to-b from-indigo-600 to-purple-600 rounded-full shadow-lg shadow-indigo-200"></div>
          Valorización de Inventario
        </div>
        <div className="text-right">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Valor Total Stock</p>
          <div className="text-2xl md:text-3xl font-black text-indigo-700 tracking-tighter">
            ${totalStockValue.toLocaleString('es-CL')}
          </div>
        </div>
      </div>
      
      <div className="mt-6 w-full flex-1 flex flex-col items-center">
        <div className="w-full max-w-3xl mb-6 relative z-20 flex gap-2">
          <div className="flex-1">
            <AutocompleteSearch 
              products={inventory}
              value={searchQuery}
              onSelect={(p) => {
                setSearchQuery(p.name);
                setSelectedProduct(p);
              }}
              onChange={(val) => {
                setSearchQuery(val);
                if (val.trim() === '') setSelectedProduct(null);
              }}
              showValor={true}
              placeholder="Buscar producto..."
              inputClassName="w-full px-6 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-black uppercase outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-sm"
            />
          </div>
          <select 
            value={`${sortField}-${sortOrder}`} 
            onChange={(e) => {
              const [field, order] = e.target.value.split('-');
              setSortField(field as 'totalValue' | 'unitValue');
              setSortOrder(order as 'desc' | 'asc');
            }}
            className="px-4 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-black uppercase text-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 outline-none w-48 truncate"
          >
            <option value="totalValue-desc">Total: Mayor a Menor</option>
            <option value="totalValue-asc">Total: Menor a Mayor</option>
            <option value="unitValue-desc">Unidad: Mayor a Menor</option>
            <option value="unitValue-asc">Unidad: Menor a Mayor</option>
          </select>
        </div>

        {selectedStockItem ? (
          <div className="w-full max-w-3xl bg-slate-50 border border-slate-100 rounded-3xl p-6 md:p-8 animate-fade-in relative z-10">
             <div className="flex justify-between items-start mb-6">
                <div>
                  <h4 className="text-lg md:text-xl font-black text-slate-800 uppercase tracking-tight leading-tight">{selectedStockItem.name}</h4>
                  <p className="text-xs font-bold text-slate-500 tracking-widest uppercase mt-2">SKU: {selectedStockItem.sku}</p>
                </div>
             </div>
             
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
               <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Cantidad</p>
                 <p className="text-xl font-black text-slate-700">{selectedStockItem.quantity || 0}</p>
               </div>
               <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm text-center">
                 <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">Valor Unitario</p>
                 <p className="text-xl font-black text-slate-700">${selectedStockItem.unitValue.toLocaleString('es-CL')}</p>
               </div>
               <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100/50 shadow-sm text-center col-span-2 md:col-span-1">
                 <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Valor Total</p>
                 <p className="text-xl font-black text-indigo-700">${selectedStockItem.totalValue.toLocaleString('es-CL')}</p>
               </div>
             </div>
          </div>
        ) : (
          <div className="w-full flex-1 overflow-auto bg-slate-50 border border-slate-200 rounded-3xl p-4 hide-scrollbar">
            <div className="space-y-2 max-h-96 pr-2">
              {stockItems.slice(0, 50).map((item, idx) => (
                <div key={idx} className="bg-white p-4 rounded-2xl shadow-[0_5px_15px_rgba(0,0,0,0.02)] border border-slate-100 flex justify-between items-center group hover:bg-slate-50 transition-colors">
                  <div className="flex-1 pr-4">
                    <p className="text-sm font-black text-slate-700 uppercase">{item.name}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">{item.quantity} UNDS • VALOR: ${item.unitValue.toLocaleString('es-CL')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total</p>
                    <p className="text-lg font-black text-indigo-700">${item.totalValue.toLocaleString('es-CL')}</p>
                  </div>
                </div>
              ))}
              {stockItems.length === 0 && (
                <div className="py-12 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.4em]">No hay productos con valor registrado</div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const AutocompleteSearch: React.FC<{ products: Product[], onSelect: (p: Product) => void, placeholder?: string, value?: string, onChange?: (val: string) => void, inputClassName?: string, showValor?: boolean }> = ({ products, onSelect, placeholder, value, onChange, inputClassName, showValor }) => {
  const [internalQuery, setInternalQuery] = useState('');
  const query = value !== undefined ? value : internalQuery;
  const setQuery = (val: string) => {
    setInternalQuery(val);
    if (onChange) onChange(val);
  };
  const [suggestions, setSuggestions] = useState<Product[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 0) {
      const filtered = products.filter(p => p.name.toLowerCase().includes(trimmedQuery.toLowerCase()) || (p.sku && p.sku.toLowerCase().includes(trimmedQuery.toLowerCase())));
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
      <div className="relative group">
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => query.trim().length > 0 && setIsOpen(true)} placeholder={placeholder || "¿Qué producto buscas?"} className={inputClassName || "w-full px-4 py-3 md:px-5 md:py-3.5 pl-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-[0_2px_8px_rgba(0,0,0,0.02)] text-sm font-bold uppercase tracking-tight"} />
      </div>
      {isOpen && suggestions.length > 0 && (
        <ul className="absolute z-[100] w-full mt-3 bg-white/95 backdrop-blur-xl border border-slate-100 rounded-2xl shadow-[0_20px_40px_rgba(0,0,0,0.12)] overflow-hidden divide-y divide-slate-50 max-h-[450px] overflow-y-auto animate-fade-in scrollbar-hide">
          {suggestions.map((p) => (
            <li key={p.id} onClick={() => { onSelect(p); if (value !== undefined) { setQuery(p.name); } else { setQuery(''); } setIsOpen(false); }} className="px-5 py-3 hover:bg-blue-50/80 cursor-pointer flex justify-between items-center transition-all i-active:bg-blue-100 group">
              <div className="flex items-center gap-4 flex-1 pr-3 truncate">
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-sm uppercase tracking-tight truncate group-hover:text-blue-600 transition-colors">{p.name}</p>
                  {showValor && <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mt-0.5">Valor: {p.valor || 'N/A'}</p>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0"><span className={`text-[10px] font-black px-3 py-1.5 rounded-lg shadow-sm shrink-0 ${p.quantity <= 0 ? 'text-rose-600 bg-rose-100/50' : 'text-blue-600 bg-blue-100/50'}`}>STOCK: {p.quantity}</span><div className={`text-white p-2 rounded-xl shadow-md transition-transform duration-300 ${p.quantity <= 0 ? 'bg-rose-500' : 'bg-blue-600 group-hover:rotate-90'}`}><ICONS.Plus /></div></div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

const CustomDatePicker = ({ deliveryData, seccion, onSelectDate }: { deliveryData: DeliveryRecord[], seccion: string, onSelectDate: (date: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  const deliveryDates = useMemo(() => {
    const dates = new Map<string, string>();
    deliveryData.forEach(d => {
      if (d.seccion.trim().toLowerCase() === seccion.trim().toLowerCase()) {
        const ts = getNormalizedTimestamp(d.fecha);
        if (ts) {
          const dt = new Date(ts);
          dates.set(`${dt.getFullYear()}-${dt.getMonth()}-${dt.getDate()}`, d.fecha);
        }
      }
    });
    return dates;
  }, [deliveryData, seccion]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  
  const days = [];
  for (let i = 0; i < firstDayOfMonth; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

  return (
    <div className="relative" ref={containerRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="group relative overflow-hidden text-blue-600 font-black text-[9px] md:text-[10px] uppercase tracking-widest bg-white px-4 md:px-6 py-2 md:py-3 rounded-xl transition-all hover:bg-slate-50 active:scale-95 border border-slate-200 flex items-center gap-2 shadow-md"
      >
        <ShineEffect />
        <div className="relative z-10 flex items-center gap-2">
          <ICONS.Delivery /> CARGAR PEDIDO ANTERIOR
        </div>
      </button>

      {isOpen && (
        <div className="absolute top-full mt-2 left-0 md:left-auto md:right-0 z-50 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 w-64 animate-fade-in">
          <div className="flex justify-between items-center mb-4">
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg">&lt;</button>
            <span className="font-bold text-sm text-slate-800">{monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}</span>
            <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-1 hover:bg-slate-100 rounded-lg">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-2">
            {['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sa'].map(d => <div key={d} className="text-[10px] font-bold text-slate-400">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) return <div key={`empty-${idx}`} className="h-8"></div>;
              const dateKey = `${currentDate.getFullYear()}-${currentDate.getMonth()}-${day}`;
              const hasDelivery = deliveryDates.has(dateKey);
              const originalDateStr = deliveryDates.get(dateKey);
              
              return (
                <button
                  key={idx}
                  disabled={!hasDelivery}
                  onClick={() => {
                    if (hasDelivery && originalDateStr) {
                      onSelectDate(originalDateStr);
                      setIsOpen(false);
                    }
                  }}
                  className={`h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all ${
                    hasDelivery 
                      ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-500 hover:text-white cursor-pointer shadow-sm border border-emerald-200' 
                      : 'text-slate-300 cursor-not-allowed hover:bg-slate-50'
                  }`}
                  title={hasDelivery ? 'Cargar pedido de este día' : 'Sin entregas'}
                >
                  {day}
                </button>
              );
            })}
          </div>
          <div className="mt-4 flex items-center gap-2 text-[9px] font-bold text-slate-500 uppercase">
            <div className="w-3 h-3 bg-emerald-100 border border-emerald-200 rounded-sm"></div>
            <span>Días con entregas</span>
          </div>
        </div>
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
  const [activosData, setActivosData] = useState<Activo[]>(() => {
    const saved = localStorage.getItem('activos_v1');
    return saved ? JSON.parse(saved) : [];
  });
  const [sourceLink, setSourceLink] = useState(() => localStorage.getItem('inv_link_v4_final') || DEFAULT_SHEET_URL);
  const [activosFilter, setActivosFilter] = useState('');
  const [deliveryData, setDeliveryData] = useState<DeliveryRecord[]>(() => {
    const saved = localStorage.getItem('del_v4_final');
    return saved ? JSON.parse(saved) : [];
  });
  const [deliveryFilters, setDeliveryFilters] = useState({ seccion: '', departamento: '', fechaInicio: '', fechaFin: '', producto: '' });
  const [solicitudStep, setSolicitudStep] = useState<'crear' | 'cerrar'>('crear');
  const [solicitudFilters, setSolicitudFilters] = useState(() => {
    const saved = localStorage.getItem('solicitud_filters_v14');
    return saved ? JSON.parse(saved) : { departamento: '', seccion: '' };
  });
  const [currentOrderItems, setCurrentOrderItems] = useState<OrderItem[]>([]);
  const [finalizedRequests, setFinalizedRequests] = useState<FinalizedRequest[]>([]);
  const [expandedRequestId, setExpandedRequestId] = useState<string | null>(null);
  const [expandedDeliveryGroupIds, setExpandedDeliveryGroupIds] = useState<Set<string>>(new Set());
  const [processingRequests, setProcessingRequests] = useState<Set<string>>(new Set());
  useEffect(() => {
    if (expandedRequestId && !finalizedRequests.some(r => r.id === expandedRequestId)) {
      setExpandedRequestId(null);
    }
  }, [finalizedRequests, expandedRequestId]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [hasInitializedMonth, setHasInitializedMonth] = useState(false);
  const [dashboardFilterType, setDashboardFilterType] = useState<'cantidad' | 'gastos'>('cantidad');
  const [showDeliveryValues, setShowDeliveryValues] = useState(false);
  const [dashboardSearchQuery, setDashboardSearchQuery] = useState('');
  const [dashboardSelectedProduct, setDashboardSelectedProduct] = useState<Product | null>(null);

  const [frozenMonthlyPrices, setFrozenMonthlyPrices] = useState<Record<string, Record<string, number>>>({});
  const [docUrl, setDocUrl] = useState<string | null>(null);

  const parseValor = (valorStr?: string) => {
    if (!valorStr) return 0;
    return parseInt(valorStr.replace(/[^0-9]/g, ''), 10) || 0;
  };

  const sanitizeFirebaseKey = (key: string) => {
    return key.replace(/[.#$\[\]\/]/g, '_');
  };

  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    const now = new Date();
    const currentYearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    deliveryData.forEach(d => {
      const ts = getNormalizedTimestamp(d.fecha);
      if (ts) {
        const date = new Date(ts);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const ym = `${yyyy}-${mm}`;
        if (ym <= currentYearMonth) {
          months.add(ym);
        }
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a));
  }, [deliveryData]);

  useEffect(() => {
    if (!hasInitializedMonth && availableMonths.length > 0) {
      setSelectedMonth(availableMonths[0]);
      setHasInitializedMonth(true);
    }
  }, [availableMonths, hasInitializedMonth]);

  useEffect(() => {
    if (activeSection !== AppSection.QUERY) {
      setSelectedProduct(null);
    }
  }, [activeSection]);

  useEffect(() => {
    if (stockError) {
      const timer = setTimeout(() => setStockError(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [stockError]);
  useEffect(() => { localStorage.setItem('inv_v4_final', JSON.stringify(inventory)); }, [inventory]);
  useEffect(() => { localStorage.setItem('inv_link_v4_final', sourceLink); }, [sourceLink]);
  useEffect(() => { localStorage.setItem('del_v4_final', JSON.stringify(deliveryData)); }, [deliveryData]);
  useEffect(() => { localStorage.setItem('solicitud_filters_v14', JSON.stringify(solicitudFilters)); }, [solicitudFilters]);
  useEffect(() => {
    const itemsRef = ref(db, "pedidos_temporales");
    const unsubscribeItems = onValue(itemsRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const itemsList: OrderItem[] = Object.keys(data).map(key => ({ id: key, producto: data[key].producto, cantidad: data[key].cantidad, departamento: data[key].departamento, seccion: data[key].seccion }));
        setCurrentOrderItems(itemsList);
      } else { setCurrentOrderItems([]); }
    });
    const finalizedRef = ref(db, "solicitudes_finalizadas");
    const unsubscribeFinalized = onValue(finalizedRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list: FinalizedRequest[] = Object.keys(data).map(key => ({ id: key, ...data[key] }));
        setFinalizedRequests(list);
      } else { setFinalizedRequests([]); }
    });
    const frozenRef = ref(db, "frozen_monthly_prices");
    const unsubscribeFrozen = onValue(frozenRef, (snapshot) => {
      setFrozenMonthlyPrices(snapshot.val() || {});
    });
    return () => { unsubscribeItems(); unsubscribeFinalized(); unsubscribeFrozen(); };
  }, []);
  useEffect(() => {
    if (inventory.length === 0 || deliveryData.length === 0 || availableMonths.length === 0) return;

    const currentYearMonth = (() => {
      const date = new Date();
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    })();

    let hasNewFrozen = false;
    const newFrozenPrices = { ...frozenMonthlyPrices };

    availableMonths.forEach(monthKey => {
      if (monthKey < currentYearMonth && !newFrozenPrices[monthKey]) {
        const pricesForMonth: Record<string, number> = {};
        inventory.forEach(p => {
          pricesForMonth[sanitizeFirebaseKey(p.name.trim().toLowerCase())] = parseValor(p.valor);
        });
        newFrozenPrices[monthKey] = pricesForMonth;
        hasNewFrozen = true;
      }
    });

    if (hasNewFrozen) {
      set(ref(db, "frozen_monthly_prices"), newFrozenPrices).catch(console.error);
    }
  }, [availableMonths, inventory, deliveryData, frozenMonthlyPrices]);

  const deliveryStats = useMemo(() => {
    const productDataMap: Record<string, { total: number, totalValue: number, sections: Record<string, { quantity: number, value: number }> }> = {};
    let globalTotal = 0;
    let globalTotalValue = 0;
    deliveryData.forEach(d => {
      const ts = getNormalizedTimestamp(d.fecha);
      let recordMonthKey = '';
      if (ts) {
        const date = new Date(ts);
        const yyyy = date.getFullYear();
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        recordMonthKey = `${yyyy}-${mm}`;
      }

      if (recordMonthKey && selectedMonth && recordMonthKey !== selectedMonth) return;
      if (!recordMonthKey && selectedMonth) return;

      const pName = d.producto?.trim();
      if (pName) {
        const qty = (d.cantidad || 0);
        let unitValue = 0;
        
        const sanitizedPName = sanitizeFirebaseKey(pName.toLowerCase());
        if (recordMonthKey && frozenMonthlyPrices[recordMonthKey] && typeof frozenMonthlyPrices[recordMonthKey][sanitizedPName] !== 'undefined') {
          unitValue = frozenMonthlyPrices[recordMonthKey][sanitizedPName];
        } else {
          const invProduct = inventory.find(p => p.name.toLowerCase() === pName.toLowerCase());
          unitValue = parseValor(invProduct?.valor);
        }
        
        const val = qty * unitValue;

        if (!productDataMap[pName]) { productDataMap[pName] = { total: 0, totalValue: 0, sections: {} }; }
        productDataMap[pName].total += qty;
        productDataMap[pName].totalValue += val;
        
        if (!productDataMap[pName].sections[d.seccion]) {
          productDataMap[pName].sections[d.seccion] = { quantity: 0, value: 0 };
        }
        productDataMap[pName].sections[d.seccion].quantity += qty;
        productDataMap[pName].sections[d.seccion].value += val;
        
        globalTotal += qty;
        globalTotalValue += val;
      }
    });
    const top5 = Object.entries(productDataMap).sort(([, a], [, b]) => {
      if (dashboardFilterType === 'gastos') {
        return b.totalValue - a.totalValue;
      } else {
        return b.total - a.total;
      }
    }).slice(0, 5).map(([name, data]) => ({ 
      name, 
      total: data.total, 
      totalValue: data.totalValue,
      sections: Object.entries(data.sections).map(([sec, stats]) => ({ 
        name: sec || 'N/A', 
        quantity: stats.quantity, 
        value: stats.value,
        percent: globalTotal > 0 ? Math.round((stats.quantity / globalTotal) * 100) : 0 
      })).sort((a,b) => {
        if (dashboardFilterType === 'gastos') {
          return b.value - a.value;
        } else {
          return b.quantity - a.quantity;
        }
      }) 
    }));
    return { top5, globalTotal, globalTotalValue };
  }, [deliveryData, selectedMonth, inventory, dashboardFilterType, frozenMonthlyPrices]);

  const barChartData = useMemo(() => {
    const monthDataMap: Record<string, { quantity: number, value: number }> = {};
    
    deliveryData.forEach(d => {
      const ts = getNormalizedTimestamp(d.fecha);
      if (!ts) return;
      
      const date = new Date(ts);
      const yyyy = date.getFullYear();
      const mm = String(date.getMonth() + 1).padStart(2, '0');
      const monthKey = `${yyyy}-${mm}`;

      const pName = d.producto?.trim();
      if (!pName) return;

      if (dashboardSelectedProduct && pName.toLowerCase() !== dashboardSelectedProduct.name.toLowerCase()) {
        return;
      }

      const qty = (d.cantidad || 0);
      let unitValue = 0;
      const sanitizedPName = sanitizeFirebaseKey(pName.toLowerCase());
      if (frozenMonthlyPrices[monthKey] && typeof frozenMonthlyPrices[monthKey][sanitizedPName] !== 'undefined') {
        unitValue = frozenMonthlyPrices[monthKey][sanitizedPName];
      } else {
        const invProduct = inventory.find(p => p.name.toLowerCase() === pName.toLowerCase());
        unitValue = parseValor(invProduct?.valor);
      }
      
      if (!monthDataMap[monthKey]) { monthDataMap[monthKey] = { quantity: 0, value: 0 }; }
      monthDataMap[monthKey].quantity += qty;
      monthDataMap[monthKey].value += (qty * unitValue);
    });

    let dataList = Object.entries(monthDataMap).map(([monthKey, data]) => {
      const [yyyy, mm] = monthKey.split('-');
      const date = new Date(parseInt(yyyy), parseInt(mm) - 1, 1);
      const monthName = date.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
      return {
        name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
        monthKey,
        quantity: data.quantity,
        value: data.value
      };
    });

    dataList = dataList.sort((a, b) => a.monthKey.localeCompare(b.monthKey));

    return dataList;
  }, [deliveryData, inventory, dashboardSelectedProduct, frozenMonthlyPrices]);
  const syncData = async (type: 'inventory' | 'delivery' | 'activos' = 'inventory', silent = false) => {
    let link = type === 'inventory' ? sourceLink : (type === 'activos' ? ACTIVOS_SHEET_URL : DELIVERY_SHEET_URL);
    if (!link || !link.includes('docs.google.com/spreadsheets')) return;
    if (!silent) setIsSyncing(true);
    try {
      let url = link;
      if (url.includes('/edit')) { const baseUrl = url.split('/edit')[0]; const gidMatch = url.match(/[?#&]gid=([0-9]+)/); const gid = gidMatch ? gidMatch[1] : ''; url = `${baseUrl}/export?format=csv${gid ? `&gid=${gid}` : ''}`; }
      else if (!url.includes('/export')) { url = url.replace(/\/$/, '') + '/export?format=csv'; }
      const res = await fetch(url);
      const text = await res.text();
      if (text.includes('<html') || text.trim() === '') throw new Error("Hoja no pública");
      const colsData = parseCSV(text);
      if (colsData.length < 2) throw new Error("Sin datos suficientes");
      const rows = colsData.slice(1);
      if (type === 'inventory') {
        const newInv = rows.map((cols, i) => {
          let parsedQty = parseInt(cols[0]?.replace(/[^0-9-]/g, ''), 10);
          return { id: `item-${i}-${Date.now()}`, quantity: isNaN(parsedQty) ? 0 : parsedQty, name: cols[1] || 'Sin nombre', sku: cols[1]?.substring(0, 10).toUpperCase() || 'S/N', location: cols[2] || 'No especificado', responsible: cols[3] || 'Sin asignar', minStock: parseInt(cols[4]?.replace(/[^0-9]/g, '')) || 0, valor: cols[5] || '', link: cols[6] || '', imageUrl: cols[7] || '', category: cols[8] || 'General', arrivalDate: new Date().toISOString() };
        });
        setInventory(newInv);
      } else if (type === 'activos') {
        const newActivos = rows.map((cols, i) => {
          return { id: `activo-${i}-${Date.now()}`, cantidad: cols[0]?.trim() || '', producto: cols[1]?.trim() || '', responsable: cols[2]?.trim() || '', lugar: cols[3]?.trim() || '', documentacion: cols[4]?.trim() || '' };
        }).filter(a => a.producto);
        setActivosData(newActivos);
      } else {
        const newDel = rows.map((cols, i) => { const isExtended = cols.length >= 6; const fechaIdx = isExtended ? 5 : 4; const deptoIdx = isExtended ? 3 : 2; const seccionIdx = isExtended ? 4 : 3; return { id: `del-${i}-${Date.now()}`, cantidad: parseInt(cols[0]?.replace(/[^0-9]/g, '') || '0') || 0, producto: cols[1]?.trim() || '', seccion: cols[seccionIdx]?.trim() || '', departamento: cols[deptoIdx]?.trim() || '', fecha: cols[fechaIdx]?.trim() || '' }; });
        setDeliveryData(newDel);
      }
    } catch (e: any) { if (!silent) console.error(`Error Sincronización ${type}:`, e); }
    finally { if (!silent) setIsSyncing(false); }
  };
  useEffect(() => {
    syncData('inventory', true); syncData('delivery', true); syncData('activos', true);
    const syncInterval = setInterval(() => { syncData('inventory', true); syncData('delivery', true); syncData('activos', true); }, 30000);
    const handleFocus = () => { syncData('inventory', true); syncData('delivery', true); syncData('activos', true); };
    window.addEventListener('focus', handleFocus);
    return () => { clearInterval(syncInterval); window.removeEventListener('focus', handleFocus); };
  }, [sourceLink]);
  const consolidatedInventory = useMemo(() => {
    const uniqueProducts = new Map<string, Product>();
    inventory.forEach(p => {
      const key = p.name.trim().toLowerCase();
      if (uniqueProducts.has(key)) {
        const existing = uniqueProducts.get(key)!;
        existing.quantity += p.quantity;
      } else {
        uniqueProducts.set(key, { ...p });
      }
    });
    return Array.from(uniqueProducts.values());
  }, [inventory]);

  const availableInventory = useMemo(() => {
    const pendingQuantities: Record<string, number> = {};
    
    currentOrderItems.forEach(item => {
      const key = item.producto.trim().toLowerCase();
      pendingQuantities[key] = (pendingQuantities[key] || 0) + item.cantidad;
    });

    finalizedRequests.forEach(req => {
      req.items.forEach(item => {
        const key = item.producto.trim().toLowerCase();
        pendingQuantities[key] = (pendingQuantities[key] || 0) + item.cantidad;
      });
    });

    return consolidatedInventory.map(p => {
      const key = p.name.trim().toLowerCase();
      const currentPending = pendingQuantities[key] || 0;
      return {
        ...p,
        quantity: Math.max(0, p.quantity - currentPending)
      };
    });
  }, [consolidatedInventory, currentOrderItems, finalizedRequests]);

  const lowStockItems = useMemo(() => { const filtered = availableInventory.filter(p => p.minStock > 0 && p.quantity <= p.minStock); const getWeight = (p: Product) => { if (p.quantity === 0) return 0; if (p.quantity < p.minStock) return 1; return 2; }; return filtered.sort((a, b) => getWeight(a) - getWeight(b)); }, [availableInventory]);
  const allPossibleDeptos = useMemo(() => { const set = new Set<string>(); deliveryData.forEach(d => { if(d.departamento) set.add(d.departamento); }); return Array.from(set).filter(Boolean).sort(); }, [deliveryData]);
  const allPossibleSecciones = useMemo(() => { const set = new Set<string>(); deliveryData.forEach(d => { if(d.seccion) set.add(d.seccion); }); return Array.from(set).filter(Boolean).sort(); }, [deliveryData]);
  const filteredDelivery = useMemo(() => { return deliveryData.filter(d => { const matchSeccion = !deliveryFilters.seccion || (d.seccion && d.seccion.toLowerCase() === deliveryFilters.seccion.toLowerCase()); const matchDepto = !deliveryFilters.departamento || d.departamento === deliveryFilters.departamento; const matchProducto = !deliveryFilters.producto || (d.producto && d.producto.toLowerCase().includes(deliveryFilters.producto.toLowerCase())); const itemDate = getNormalizedTimestamp(d.fecha); if (!itemDate) return matchSeccion && matchDepto && matchProducto; const start = deliveryFilters.fechaInicio ? new Date(deliveryFilters.fechaInicio + 'T00:00:00').getTime() : null; const end = deliveryFilters.fechaFin ? new Date(deliveryFilters.fechaFin + 'T23:59:59').getTime() : null; return matchSeccion && matchDepto && matchProducto && (!start || itemDate >= start) && (!end || itemDate <= end); }).sort((a, b) => (getNormalizedTimestamp(b.fecha) || 0) - (getNormalizedTimestamp(a.fecha) || 0)); }, [deliveryData, deliveryFilters]);
  const isDeliveryFilterActive = useMemo(() => { return !!(deliveryFilters.seccion.trim() || deliveryFilters.departamento || deliveryFilters.producto || deliveryFilters.fechaInicio || deliveryFilters.fechaFin); }, [deliveryFilters]);
  const clearTemporaryOrders = async () => { try { const itemsRef = ref(db, "pedidos_temporales"); await remove(itemsRef); } catch (err) { console.error("Error clearing orders:", err); } };
  const loadOrderFromDate = async (dateStr: string) => { const seccionName = solicitudFilters.seccion.trim().toLowerCase(); if (!seccionName) return; const seccionDeliveries = deliveryData.filter(d => d.seccion.trim().toLowerCase() === seccionName && d.fecha === dateStr); if (seccionDeliveries.length === 0) return; await clearTemporaryOrders(); const itemsRef = ref(db, "pedidos_temporales"); const addPromises = seccionDeliveries.map(item => push(itemsRef, { producto: item.producto, cantidad: item.cantidad, departamento: solicitudFilters.departamento, seccion: solicitudFilters.seccion })); await Promise.all(addPromises); };
  const addItemToOrder = async (p: Product) => { if (p.quantity <= 0) { setStockError(p.name); return; } const { departamento, seccion } = solicitudFilters; try { const existing = currentOrderItems.find(item => item.producto === p.name && item.seccion === seccion); if (existing && existing.id) { const itemRef = ref(db, `pedidos_temporales/${existing.id}`); await update(itemRef, { cantidad: existing.cantidad + 1 }); } else { const itemsRef = ref(db, "pedidos_temporales"); await push(itemsRef, { producto: p.name, cantidad: 1, departamento, seccion }); } } catch (err) { console.error("Add item error:", err); } };
  const updateItemQuantity = async (idx: number, delta: number) => { try { const item = currentOrderItems[idx]; if (!item || !item.id) return; if (delta > 0) { const productInInventory = availableInventory.find(p => p.name === item.producto); if (productInInventory && productInInventory.quantity <= 0) { setStockError(item.producto); return; } } const newVal = item.cantidad + delta; const itemRef = ref(db, `pedidos_temporales/${item.id}`); if (newVal <= 0) { await remove(itemRef); } else { await update(itemRef, { cantidad: newVal }); } } catch (err) { console.error("Update item error:", err); } };
  const finalizarPedido = async (e: React.MouseEvent) => { const { departamento, seccion } = solicitudFilters; if (!departamento.trim() || !seccion.trim()) return; const userItems = currentOrderItems.filter(i => i.seccion === seccion); if (userItems.length === 0) return; const fechaActual = new Date().toLocaleDateString('es-ES'); const horaActual = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }); const newRequestData = { departamento: departamento.trim(), seccion: seccion.trim(), fecha: fechaActual, hora: horaActual, items: userItems.map(i => ({ producto: i.producto, cantidad: i.cantidad })) }; try { const finalizedRef = ref(db, "solicitudes_finalizadas"); await push(finalizedRef, newRequestData); for (const item of userItems) { if (item.id) { await remove(ref(db, `pedidos_temporales/${item.id}`)); } } setSolicitudFilters({ departamento: '', seccion: '' }); setSolicitudStep('cerrar'); } catch (err) { console.error("Error al finalizar:", err); } };
  const handleConfirmOk = async (req: FinalizedRequest) => { 
    if (!req.id || processingRequests.has(req.id)) return;
    setProcessingRequests(prev => new Set(prev).add(req.id!));
    try { 
      const dataToSend = { departamento: req.departamento, seccion: req.seccion, items: req.items }; 
      await fetch(APPS_SCRIPT_URL, { method: 'POST', mode: 'no-cors', body: JSON.stringify(dataToSend) }); 
      const reqRef = ref(db, `solicitudes_finalizadas/${req.id}`); 
      await remove(reqRef); 
      setExpandedRequestId(null);
    } catch (e) { 
      console.error("Error procesando acción OK:", e); 
    } finally {
      setProcessingRequests(prev => {
        const next = new Set(prev);
        next.delete(req.id!);
        return next;
      });
    }
  };
  const handleCancelRequest = async (reqId: string) => { 
    if (!reqId) return;
    try { 
      const reqRef = ref(db, `solicitudes_finalizadas/${reqId}`); 
      await remove(reqRef); 
      setExpandedRequestId(null);
    } catch (e) { console.error("Error cancelando pedido:", e); } 
  };
  const handlePrint = () => {
    try {
      if (window.top !== window.self) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          const tableRows = activosData.filter(a => {
            const f = activosFilter.toLowerCase();
            return a.lugar.toLowerCase().includes(f) || a.producto.toLowerCase().includes(f) || a.responsable.toLowerCase().includes(f);
          }).map(item => `
            <tr>
              <td>${item.cantidad || '-'}</td>
              <td>${item.producto}</td>
              <td>${item.responsable || 'N/A'}</td>
              <td>${item.lugar || 'N/A'}</td>
            </tr>
          `).join('');

          printWindow.document.write(`
            <html>
              <head>
                <title>INVENTARIO</title>
                <style>
                  body { font-family: sans-serif; padding: 20px; }
                  table { width: 100%; border-collapse: collapse; }
                  th, td { border: 1px solid #000; padding: 4px; text-align: left; font-size: 10px; text-transform: uppercase; font-weight: bold; }
                  th { background-color: #f2f2f2; color: #475569; }
                  td { color: #1e293b; }
                  h2 { font-size: 16px; margin-bottom: 20px; text-transform: uppercase; font-family: sans-serif; }
                </style>
              </head>
              <body>
                <h2>INVENTARIO</h2>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 50px;">Cant</th>
                      <th>Producto</th>
                      <th>Responsable</th>
                      <th>Lugar</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${tableRows}
                  </tbody>
                </table>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => { printWindow.print(); printWindow.close(); }, 250);
          return;
        }
      }
      window.print();
    } catch (e) {
      window.print();
    }
  };
  const navItems = [ { id: AppSection.DASHBOARD, icon: <ICONS.Dashboard />, label: 'Inicio' }, { id: AppSection.QUERY, icon: <ICONS.Search />, label: 'Buscar' }, { id: AppSection.SOLICITUD, icon: <ICONS.Solicitud />, label: 'Solicitud' }, { id: AppSection.ENTREGA, icon: <ICONS.Delivery />, label: 'Historial' }, { id: AppSection.ORDER, icon: <ICONS.ShoppingBag />, label: 'PEDIR' }, { id: AppSection.ACTIVOS, icon: <ICONS.Box />, label: 'INVENTARIO' } ];
  const hasSolicitudFilters = !!(solicitudFilters.seccion && solicitudFilters.departamento);
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f2f2f2] pb-24 md:pb-0 font-['Plus_Jakarta_Sans'] selection:bg-blue-100 selection:text-blue-900 relative">
      {/* Banner Superior Decorativo - Fijo y sin degradado de opacidad */}
      <div className="fixed top-0 left-0 right-0 h-40 md:h-64 z-0 overflow-hidden pointer-events-none">
        <img 
          src="https://io.maristas.cl/public/img/ioh/background-seccion1.jpg" 
          alt="Banner Decorativo"
          className="w-full h-full object-cover object-top"
          onError={(e) => {
            e.currentTarget.style.display = 'none';
          }}
        />
      </div>
      <aside className="hidden md:flex w-72 bg-transparent flex-col fixed h-full z-40 print:hidden">
        <div className="flex justify-center -mt-12">
          <CustomLogo trigger={activeSection} />
        </div>
        <nav className="flex-1 px-6 space-y-2 mt-8">
          {navItems.map((item) => (
            <button key={item.id} onClick={() => setActiveSection(item.id)} className={`group relative overflow-hidden w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all duration-300 font-black text-xs uppercase tracking-widest ${activeSection === item.id ? 'bg-blue-600 text-white shadow-[0_10px_25px_rgba(37,99,235,0.3)] scale-[1.03]' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'}`}>
              <ShineEffect /><div className="flex items-center gap-5 relative z-10"><span className={`transition-transform duration-500 ${activeSection === item.id ? 'scale-110' : 'group-hover:scale-110'}`}>{item.icon}</span><span>{item.label}</span></div>
              {item.id === AppSection.SOLICITUD && finalizedRequests.length > 0 && (
                <span className={`relative z-10 px-2 py-1 rounded-lg text-[9px] font-black leading-none flex items-center justify-center transition-colors ${activeSection === item.id ? 'bg-white text-blue-600' : 'bg-rose-500 text-white animate-pulse'}`}>{finalizedRequests.length}</span>
              )}
            </button>
          ))}
        </nav>
        <div className="p-8 mt-auto"><div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center shadow-sm"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Sistema</p><div className="flex items-center justify-center gap-2"><div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></div><span className="text-[9px] font-black text-emerald-600 uppercase">En Línea</span></div></div></div>
      </aside>
      <main className={`flex-1 md:ml-72 p-6 md:p-8 md:pt-10 max-w-7xl mx-auto w-full relative z-10 print:m-0 print:p-0 print:max-w-none`}>
        <header className={`flex flex-col ${solicitudStep === 'cerrar' ? 'mb-1' : 'mb-4 md:mb-6'} relative z-50 print:hidden`}>
          <div className={`flex flex-col md:flex-row justify-between items-center gap-4 ${solicitudStep === 'cerrar' ? 'mb-1' : 'mb-4'}`}>
            <div className="block animate-fade-in w-full order-2 md:order-1">
              <div className="flex flex-col items-center text-center md:-ml-36">
                <h2 className={`text-2xl md:text-4xl font-black text-white tracking-tighter uppercase leading-none ${solicitudStep === 'cerrar' ? 'mb-2' : 'mb-6'} min-h-[1.2em] flex items-center justify-center`}>
                  {activeSection === AppSection.DASHBOARD && <AnimatedTitle text="Vista General" />}
                  {activeSection === AppSection.QUERY && <AnimatedTitle text="Consultas" />}
                  {activeSection === AppSection.SOLICITUD && (
                    <AnimatedTitle 
                      text={
                        solicitudStep === 'cerrar'
                          ? 'LISTA DE PEDIDOS'
                          : (hasSolicitudFilters 
                              ? `SOLICITUD ${solicitudFilters.departamento.toUpperCase()} ${solicitudFilters.seccion.toUpperCase()}` 
                              : 'SOLICITUD')
                      } 
                    />
                  )}
                  {activeSection === AppSection.ENTREGA && <AnimatedTitle text="Historial" />}
                  {activeSection === AppSection.ORDER && <AnimatedTitle text="LISTA PRIORITARIA" />}
                  {activeSection === AppSection.ACTIVOS && <AnimatedTitle text="INVENTARIO" />}
                </h2>
                {activeSection === AppSection.SOLICITUD && hasSolicitudFilters && solicitudStep === 'crear' && (
                  <div className="flex flex-wrap justify-center gap-2 md:gap-4 mb-4">
                    <CustomDatePicker deliveryData={deliveryData} seccion={solicitudFilters.seccion} onSelectDate={loadOrderFromDate} />
                    <button onClick={() => setSolicitudFilters({ departamento: '', seccion: '' })} className="group relative overflow-hidden text-rose-500 font-black text-[9px] md:text-[10px] uppercase hover:underline tracking-widest bg-white px-4 md:px-6 py-2 md:py-3 rounded-xl transition-all hover:bg-slate-50 active:scale-95 border border-slate-200 flex flex-col items-center justify-center leading-none shadow-md"><ShineEffect /><div className="relative z-10 flex flex-col items-center"><span>VOLVER</span><span className="text-[7px] mt-0.5 opacity-60">FILTROS</span></div></button>
                  </div>
                )}
              </div>
            </div>
            <div className="md:hidden flex items-center justify-center w-full order-1 md:order-2"><CustomLogo trigger={activeSection} /></div>
          </div>
        </header>
        {activeSection === AppSection.DASHBOARD && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex justify-end gap-4 mb-4">
              <div className="flex items-center gap-4">
                <div className="flex bg-slate-100 p-1 rounded-xl">
                  <button 
                    onClick={() => setDashboardFilterType('cantidad')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${dashboardFilterType === 'cantidad' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Cantidad
                  </button>
                  <button 
                    onClick={() => setDashboardFilterType('gastos')}
                    className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all ${dashboardFilterType === 'gastos' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    Gastos
                  </button>
                </div>
                <select value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black uppercase text-slate-700 shadow-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">TODOS LOS MESES</option>
                  {availableMonths.map(m => <option key={m} value={m}>{new Date(m + '-01T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-8 animate-fade-in">
              {deliveryStats.top5.length > 0 ? (
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-6 pb-4 hide-scrollbar items-stretch">
                  <div className="min-w-full snap-center h-full">
                    <PieChart3D data={deliveryStats.top5} globalTotal={deliveryStats.globalTotal} globalTotalValue={deliveryStats.globalTotalValue} showValues={dashboardFilterType === 'gastos'} title="Top 5 Productos Solicitados" />
                  </div>
                  <div className="min-w-full snap-center h-full">
                    <BarChart 
                      data={barChartData} 
                      inventory={consolidatedInventory}
                      searchQuery={dashboardSearchQuery}
                      onSearchChange={setDashboardSearchQuery}
                      onProductSelect={setDashboardSelectedProduct}
                    />
                  </div>
                  <div className="min-w-full snap-center h-full">
                    <StockValueCard inventory={consolidatedInventory} />
                  </div>
                </div>
              ) : (
                <div className="py-24 text-center text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] bg-white border border-dashed border-slate-200 rounded-[48px] opacity-60">No hay datos suficientes para visualizar el gráfico.</div>
              )}
            </div>
          </div>
        )}
        {activeSection === AppSection.QUERY && ( <div className="animate-fade-in space-y-4 md:space-y-6"><div className="bg-white p-4 md:p-6 rounded-[32px] shadow-[0_30px_60px_rgba(0,0,0,0.04)] border border-slate-100 transition-all"><AutocompleteSearch products={consolidatedInventory} showValor={true} onSelect={(p) => { if (p.quantity <= 0) setStockError(p.name); setSelectedProduct(p); }} placeholder="Escribe el nombre del producto..." /></div>{selectedProduct && ( <div className="max-w-4xl mx-auto animate-fade-in"><div className="bg-white rounded-[32px] shadow-[0_20px_40px_rgba(0,0,0,0.05)] border border-slate-100 p-5 md:p-8 overflow-hidden relative"><div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-[#00732e] via-[#004894] to-[#00732e]"></div><div className="flex flex-col md:flex-row gap-6 items-center md:items-start">{selectedProduct.imageUrl && ( <div className="shrink-0 relative"><div className="absolute -inset-4 bg-[#00732e]/5 rounded-[40px] blur-2xl opacity-0 hover:opacity-100 transition-opacity duration-700"></div><img src={formatImageUrl(selectedProduct.imageUrl)} alt={selectedProduct.name} className="relative w-32 h-32 md:w-44 md:h-44 rounded-2xl shadow-lg border border-slate-50 object-contain transform transition-transform duration-700 hover:scale-[1.03]" onError={(e) => (e.currentTarget.parentElement!.style.display = 'none')} /></div> )}<div className="flex-1 w-full"><div className="flex justify-between items-start w-full"><div className="flex-1 pr-4"><h4 className="text-xl md:text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight mb-4">{selectedProduct.name}</h4></div><div className="shrink-0 text-right"><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Identificador SKU</p><p className="text-sm font-black text-slate-700 bg-slate-100 px-3 py-1 rounded-lg border border-slate-200 shadow-sm mb-2">#{selectedProduct.sku}</p><p className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-0.5">Valor</p><p className="text-sm font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200 shadow-sm">{selectedProduct.valor || 'N/A'}</p></div></div><div className="mt-4 flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100"><div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-lg border ${selectedProduct.quantity <= 0 ? 'bg-rose-100 text-rose-600 border-rose-200' : 'bg-emerald-100 text-[#1b5e20] border-emerald-200'}`}><svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg></div><div className="flex flex-col"><span className={`text-[10px] font-black uppercase tracking-widest opacity-70 ${selectedProduct.quantity <= 0 ? 'text-rose-600' : 'text-[#1b5e20]'}`}>Existencia en Bodega:</span><span className={`text-2xl font-black leading-none mt-1 ${selectedProduct.quantity <= 0 ? 'text-rose-600' : 'text-[#1b5e20]'}`}>{selectedProduct.quantity}</span></div></div></div></div></div></div> )}</div> )}
        {activeSection === AppSection.SOLICITUD && (
          <div className="animate-fade-in space-y-3 md:space-y-4 max-w-4xl mx-auto">
            {solicitudStep === 'crear' ? (
              <>
                {!hasSolicitudFilters ? (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white p-3 md:p-4 rounded-[32px] shadow-[0_15px_40px_rgba(0,0,0,0.03)] border border-slate-200 transition-all">
                       <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2 mb-2">
                         <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Identificación de Solicitante</h4>
                         {finalizedRequests.length > 0 && (
                           <button onClick={() => setSolicitudStep('cerrar')} className="group relative overflow-hidden text-blue-600 font-black text-[8px] uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-lg transition-colors hover:bg-blue-100 flex items-center gap-2">
                             <ShineEffect />
                             <span className="relative z-10">VER PEDIDOS LISTOS</span>
                             <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[7px]">{finalizedRequests.length}</span>
                           </button>
                         )}
                       </div>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Sección</label><input type="text" list="secciones-list-smart" value={solicitudFilters.seccion} onChange={(e) => setSolicitudFilters({...solicitudFilters, seccion: e.target.value})} placeholder="" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm" /><datalist id="secciones-list-smart">{allPossibleSecciones.map(s => <option key={s} value={s} />)}</datalist></div>
                          <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Departamento</label><input type="text" list="deptos-list-smart" value={solicitudFilters.departamento} onChange={(e) => setSolicitudFilters({...solicitudFilters, departamento: e.target.value})} placeholder="" className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm" /><datalist id="deptos-list-smart">{allPossibleDeptos.map(d => <option key={d} value={d} />)}</datalist></div>
                       </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4 animate-fade-in">
                    <div className="bg-white p-4 rounded-[28px] border border-slate-200 shadow-sm"><h4 className="text-[9px] font-black text-slate-800 uppercase mb-3 tracking-[0.2em] opacity-60">Añadir Productos</h4><AutocompleteSearch products={availableInventory} onSelect={addItemToOrder} placeholder="Escribe el nombre del producto..." /></div>
                    {currentOrderItems.filter(i => i.seccion === solicitudFilters.seccion).length > 0 && (
                      <div className="bg-white rounded-[32px] border border-slate-200 shadow-xl overflow-hidden animate-fade-in transition-all">
                        <div className="p-4 bg-slate-100 border-b flex flex-col md:flex-row md:justify-between items-start md:items-center gap-2"><h4 className="font-black text-slate-800 text-[9px] uppercase tracking-[0.3em]">Lista Temporal de Carga</h4><button onClick={clearTemporaryOrders} className="group relative overflow-hidden text-rose-500 font-black text-[8px] uppercase tracking-widest bg-white px-2 py-1 rounded-md border border-rose-100 shadow-sm transition-all hover:bg-rose-500 hover:text-white"><ShineEffect /><span className="relative i-active:z-10">LIMPIAR TODO</span></button></div>
                        <div className="divide-y divide-slate-100">
                          {currentOrderItems.filter(i => i.seccion === solicitudFilters.seccion).slice().reverse().map((item, i) => (
                            <div key={item.id || i} className="p-2 md:p-3 flex justify-between items-center group transition-colors hover:bg-slate-50">
                              <div className="flex items-center gap-3 min-w-0 flex-1 pr-2"><div className="w-1.5 h-1.5 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shrink-0"></div><span className="font-black text-slate-800 text-xs uppercase tracking-tight truncate">{item.producto}</span></div>
                              <div className="flex items-center gap-2 md:gap-3 shrink-0"><button onClick={() => updateItemQuantity(currentOrderItems.indexOf(item), -1)} className="bg-white p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-rose-50 hover:text-rose-500 hover:border-rose-100 shadow-sm active:scale-90 transition-all"><ICONS.Minus /></button><span className="bg-[#2e7d32] text-white px-3 py-1 rounded-lg font-black text-xs w-10 text-center shadow-lg shadow-emerald-100">{item.cantidad}</span><button onClick={() => updateItemQuantity(currentOrderItems.indexOf(item), 1)} className="bg-white p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-blue-50 hover:text-blue-500 hover:border-blue-100 shadow-sm active:scale-90 transition-all"><ICONS.Plus /></button></div>
                            </div>
                          ))}
                        </div>
                        <div className="p-4 bg-slate-100 border-t"><button onClick={(e) => finalizarPedido(e)} className="relative overflow-hidden group w-full bg-gradient-to-r from-[#2e7d32] to-[#1b5e20] hover:from-[#1b5e20] hover:to-[#0d3b10] text-white font-black py-4 rounded-[20px] text-[10px] uppercase tracking-[0.4em] shadow-2xl shadow-emerald-200 active:scale-[0.98] transition-all flex items-center justify-center gap-3"><ShineEffect /><span className="relative z-10 flex items-center gap-3">FINALIZAR PEDIDO <ICONS.Check /></span></button></div>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3 animate-fade-in">
                <div className="flex justify-start">
                  <button onClick={() => { setSolicitudStep('crear'); setSolicitudFilters({ departamento: '', seccion: '' }); }} className="group relative overflow-hidden text-blue-600 font-black text-[10px] uppercase tracking-widest bg-white px-6 py-3 rounded-2xl transition-all hover:bg-slate-50 active:scale-95 border border-slate-200 flex items-center gap-2 shadow-md">
                    <ShineEffect />
                    <div className="relative z-10 flex items-center gap-2">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
                      VOLVER AL INICIO
                    </div>
                  </button>
                </div>
                {finalizedRequests.length === 0 ? ( <div className="bg-white p-20 rounded-[48px] border border-slate-200 shadow-inner text-center flex flex-col items-center opacity-80"><div className="bg-slate-100 p-6 rounded-full mb-6 border border-slate-200 animate-pulse"><ICONS.Solicitud /></div><p className="font-black text-slate-400 text-[10px] uppercase tracking-[0.3em]">No hay pedidos pendientes de entrega</p></div> ) : (
                  <div className={`grid gap-6 md:gap-8 ${expandedRequestId !== null ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                    {finalizedRequests.map((req) => {
                      // Focus mode: if something is expanded, hide others
                      if (expandedRequestId !== null && expandedRequestId !== req.id) return null;
                      
                      const isExpanded = expandedRequestId === req.id;
                      
                      return (
                        <div key={req.id} className={`group bg-white rounded-[40px] border border-slate-200 shadow-[0_15px_35px_rgba(0,0,0,0.04)] overflow-hidden flex flex-col animate-fade-in transition-all duration-500 ${!isExpanded ? 'hover:shadow-[0_25px_50px_rgba(0,0,0,0.08)]' : ''}`}>
                          <div 
                            onClick={() => setExpandedRequestId(isExpanded ? null : req.id)}
                            className="p-6 md:p-8 bg-emerald-50 border-b border-slate-100 relative overflow-hidden cursor-pointer group/header"
                          >
                            <div className="absolute top-0 left-0 w-full h-1.5 bg-[#2e7d32]"></div>
                            <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-3 mb-4">
                              <span className="bg-white px-3 py-1 rounded-lg font-black text-[9px] text-[#2e7d32] uppercase tracking-widest shadow-sm border border-emerald-100">#{req.id.split('-').pop()}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter bg-white/80 px-2 py-1 rounded-md">{req.fecha}{req.hora ? ` - ${req.hora}` : ''}</span>
                                <motion.div 
                                  animate={{ rotate: isExpanded ? 180 : 0 }}
                                  className="text-emerald-600"
                                >
                                  <ICONS.ChevronDown />
                                </motion.div>
                              </div>
                            </div>
                            <h4 className="font-black text-slate-800 text-lg md:text-xl uppercase leading-none tracking-tighter mb-1">{req.seccion}</h4>
                            <p className="text-[10px] font-black text-[#2e7d32] uppercase tracking-widest opacity-80 truncate">{req.departamento}</p>
                          </div>
                          
                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
                                <div className="p-6 md:p-8 space-y-3 bg-white border-t border-slate-100">
                                  {req.items.map((item, i) => ( 
                                    <div key={i} className="flex justify-between items-center text-[11px] font-black border-b border-slate-200 pb-3 last:border-0 last:pb-0 group/item">
                                      <span className="text-slate-600 uppercase truncate pr-4 transition-colors group-hover/item:text-slate-900">{item.producto}</span>
                                      <span className="text-[#2e7d32] bg-emerald-50 px-2.5 py-1 rounded-lg shadow-sm">x{item.cantidad}</span>
                                    </div> 
                                  ))}
                                </div>
                                <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
                                  <button onClick={(e) => { e.stopPropagation(); handleCancelRequest(req.id); }} className="group relative overflow-hidden flex-1 bg-white text-rose-500 font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-sm hover:bg-rose-500 hover:text-white transition-all duration-300 border border-rose-200 active:scale-95">
                                    <ShineEffect /><span className="relative z-10">CANCELAR</span>
                                  </button>
                                  <button disabled={processingRequests.has(req.id)} onClick={(e) => { e.stopPropagation(); handleConfirmOk(req); }} className={`relative overflow-hidden group flex-1 bg-[#2e7d32] text-white font-black py-4 rounded-2xl text-[10px] uppercase tracking-widest shadow-xl shadow-emerald-200 transition-all duration-300 ${processingRequests.has(req.id) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[#1b5e20] active:scale-95'}`}>
                                    <ShineEffect /><span className="relative z-10">{processingRequests.has(req.id) ? 'ENVIANDO...' : 'OK'}</span>
                                  </button>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {activeSection === AppSection.ENTREGA && (
          <div className="animate-fade-in space-y-6 md:space-y-8">
            <div className="bg-white p-3 md:p-4 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.03)] border border-slate-200 transition-all hover:shadow-[0_25px_50px_rgba(0,0,0,0.06)]">
               <div className="flex justify-between items-center mb-3 border-b border-slate-100 pb-2"><h3 className="font-black text-slate-800 text-[10px] uppercase tracking-[0.3em] opacity-70">Panel de Filtrado Avanzado</h3></div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Producto</label><AutocompleteSearch products={consolidatedInventory} onSelect={(p) => setDeliveryFilters({...deliveryFilters, producto: p.name})} value={deliveryFilters.producto} onChange={(val) => setDeliveryFilters({...deliveryFilters, producto: val})} placeholder="Buscar producto..." inputClassName="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm" /></div>
                  <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Sección</label><select value={deliveryFilters.seccion} onChange={(e) => setDeliveryFilters({...deliveryFilters, seccion: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"><option value="">TODAS LAS SECCIONES</option>{allPossibleSecciones.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                  <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Departamento Destino</label><select value={deliveryFilters.departamento} onChange={(e) => setDeliveryFilters({...deliveryFilters, departamento: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black uppercase appearance-none cursor-pointer focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all shadow-sm"><option value="">TODOS LOS DEPTOS</option>{allPossibleDeptos.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                  <div className="grid grid-cols-2 gap-4 md:col-span-3">
                    <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Fecha Inicial</label><input type="date" value={deliveryFilters.fechaInicio} onChange={(e) => setDeliveryFilters({...deliveryFilters, fechaInicio: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                    <div className="space-y-1 group"><label className="text-[7.5px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1 group-focus-within:text-blue-500 transition-colors">Fecha Límite</label><input type="date" value={deliveryFilters.fechaFin} onChange={(e) => setDeliveryFilters({...deliveryFilters, fechaFin: e.target.value})} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm" /></div>
                  </div>
                  <div className="md:col-span-3 pt-2 flex gap-4">
                    <button onClick={() => setShowDeliveryValues(!showDeliveryValues)} className={`relative overflow-hidden group flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all shadow-sm active:scale-[0.99] border ${showDeliveryValues ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}><ShineEffect /><span className="relative z-10">{showDeliveryValues ? 'OCULTAR VALORES' : 'MOSTRAR VALORES'}</span></button>
                    <button onClick={() => setDeliveryFilters({seccion: '', departamento: '', fechaInicio: '', fechaFin: '', producto: ''})} className="relative overflow-hidden group flex-1 py-3 bg-rose-50 border border-rose-200 text-rose-600 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all hover:bg-rose-500 hover:text-white shadow-sm active:scale-[0.99]"><ShineEffect /><span className="relative z-10">REINICIAR FILTROS</span></button>
                  </div>
               </div>
            </div>
            {isDeliveryFilterActive && (
              <div className="bg-white rounded-[32px] md:rounded-[48px] shadow-[0_30px_70px_rgba(0,0,0,0.05)] border border-slate-200 overflow-hidden animate-fade-in transition-all">
                <div className="p-6 md:p-10 border-b bg-emerald-50 flex flex-col md:flex-row justify-between items-center gap-4 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-[#2e7d32]/5 rounded-full -mr-20 -mt-20 blur-3xl"></div>
                  <div className="relative"><h3 className="font-black text-[#1b5e20] text-lg md:text-xl uppercase tracking-tighter mb-1">Historial de Transacciones</h3><div className="text-[#2e7d32]/80 text-[8px] md:text-[9px] font-black uppercase tracking-[0.4em] flex items-center gap-2"><div className="w-1.5 h-1.5 bg-[#2e7d32] rounded-full animate-pulse"></div>{filteredDelivery.length} Registros Encontrados</div></div>
                  <div className="flex gap-4 relative">
                    <div className="group bg-white px-6 py-4 rounded-[24px] border border-emerald-100 shadow-xl text-center transform transition-transform hover:scale-105 duration-500"><p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Total Unidades</p><p className="text-xl md:text-2xl font-black text-[#2e7d32] tracking-tighter group-hover:scale-110 transition-transform">{filteredDelivery.reduce((acc, curr) => acc + (curr.cantidad || 0), 0)}</p></div>
                    {showDeliveryValues && (
                      <div className="group bg-white px-6 py-4 rounded-[24px] border border-emerald-100 shadow-xl text-center transform transition-transform hover:scale-105 duration-500">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.3em] mb-1">Valor Acumulado</p>
                        <p className="text-xl md:text-2xl font-black text-[#2e7d32] tracking-tighter group-hover:scale-110 transition-transform">
                          ${filteredDelivery.reduce((acc, curr) => {
                            const ts = getNormalizedTimestamp(curr.fecha);
                            let recordMonthKey = '';
                            if (ts) {
                              const date = new Date(ts);
                              recordMonthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                            }
                            
                            const pName = curr.producto?.trim().toLowerCase() || '';
                            let unitValue = 0;
                            const sanitizedPName = sanitizeFirebaseKey(pName);
                            if (recordMonthKey && frozenMonthlyPrices[recordMonthKey] && typeof frozenMonthlyPrices[recordMonthKey][sanitizedPName] !== 'undefined') {
                              unitValue = frozenMonthlyPrices[recordMonthKey][sanitizedPName];
                            } else {
                              const invProduct = inventory.find(p => p.name.toLowerCase() === pName);
                              unitValue = parseValor(invProduct?.valor);
                            }
                            
                            return acc + ((curr.cantidad || 0) * unitValue);
                          }, 0).toLocaleString('es-CL')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="overflow-x-auto scrollbar-hide">
                  <table className="w-full text-left table-fixed min-w-[800px]">
                    <thead className="bg-slate-100 text-slate-500 font-black uppercase text-[9px] tracking-[0.2em] border-b border-slate-200"><tr><th className="px-6 md:px-10 py-5 w-24 text-center">Cant.</th><th className="px-6 md:px-10 py-5 w-1/3">Producto</th><th className="px-6 md:px-10 py-5">Sección</th><th className="px-6 md:px-10 py-5">Departamento</th><th className="px-6 md:px-10 py-5 w-44">Fecha</th></tr></thead>
                    <tbody className="text-slate-600 text-[11px] divide-y divide-slate-100">
                      {Object.values(filteredDelivery.reduce((acc, d) => {
                        const key = d.producto;
                        if (!acc[key]) acc[key] = { key, producto: d.producto, cantidad: 0, items: [] };
                        acc[key].cantidad += (d.cantidad || 0);
                        acc[key].items.push(d);
                        return acc;
                      }, {} as Record<string, any>)).map((group: any, idx) => {
                        const isRepeated = group.items.length > 1;
                        const latestItem = group.items[0];
                        const allSameSeccion = group.items.every((i: any) => i.seccion === latestItem.seccion);
                        const allSameDepto = group.items.every((i: any) => i.departamento === latestItem.departamento);
                        const allSameFecha = group.items.every((i: any) => i.fecha === latestItem.fecha);
                        
                        return (
                          <React.Fragment key={idx}>
                            <tr onClick={() => { if (isRepeated) setExpandedDeliveryGroupIds(prev => { const next = new Set(prev); if (next.has(group.key)) next.delete(group.key); else next.add(group.key); return next; }) }} className={`hover:bg-emerald-50 transition-all duration-300 group ${isRepeated ? 'cursor-pointer' : ''}`}>
                              <td className="px-6 md:px-10 py-4 text-center"><span className="font-black text-slate-900 text-xs bg-slate-100 px-2.5 py-1 rounded-xl group-hover:bg-emerald-200 transition-colors">{group.cantidad}</span></td>
                              <td className="px-6 md:px-10 py-4"><div className="font-black text-[#2e7d32] uppercase tracking-tight group-hover:translate-x-1 transition-transform truncate flex items-center gap-2">{group.producto} {isRepeated && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md ml-1">{group.items.length} Entregas</span>} {isRepeated && <motion.div animate={{ rotate: expandedDeliveryGroupIds.has(group.key) ? 180 : 0 }} className="text-emerald-600"><ICONS.ChevronDown /></motion.div>}</div></td>
                              <td className="px-6 md:px-10 py-4"><div className="font-black text-slate-800 uppercase tracking-tight truncate bg-slate-50 px-3 py-1.5 rounded-xl inline-block max-w-full group-hover:bg-white transition-colors">{isRepeated && !allSameSeccion ? <span className="text-slate-400 italic">Varias</span> : latestItem.seccion}</div></td>
                              <td className="px-6 md:px-10 py-4"><div className="font-bold text-slate-500 uppercase tracking-widest truncate">{isRepeated && !allSameDepto ? <span className="text-slate-400 italic">Varios</span> : latestItem.departamento}</div></td>
                              <td className="px-6 md:px-10 py-4"><span className="font-black text-[10px] text-slate-400 bg-slate-50 px-2 py-1 rounded-lg uppercase tracking-tighter whitespace-nowrap">{isRepeated && !allSameFecha ? <span className="text-slate-400 italic">Varias fechas</span> : latestItem.fecha}</span></td>
                            </tr>
                            {expandedDeliveryGroupIds.has(group.key) && isRepeated && group.items.map((item: any, i: number) => (
                              <tr key={`${idx}-${i}`} className="bg-slate-50/50 border-l-4 border-emerald-400 text-[10px]">
                                <td className="px-6 md:px-10 py-3 text-center"><span className="font-bold text-slate-700">{item.cantidad}</span></td>
                                <td className="px-6 md:px-10 py-3" colSpan={4}>
                                  <div className="flex justify-between items-center w-full pr-4">
                                    <span className="font-bold text-slate-600 uppercase tracking-tight">Entregado a: {item.departamento} - {item.seccion}</span>
                                    <span className="font-black text-slate-400">{item.fecha}</span>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
        {activeSection === AppSection.ORDER && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-4 md:p-6 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-14 opacity-[0.04] transform scale-[4] rotate-12 pointer-events-none text-blue-600"><ICONS.ShoppingBag /></div>
               <div className="relative"><div className="text-2xl font-black text-slate-800 mb-6 uppercase tracking-[0.4em] opacity-80 flex items-center gap-5"><div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500"><ICONS.ShoppingBag /></div>LISTA PRIORITARIA</div>{lowStockItems.length === 0 ? ( <div className="bg-slate-50 p-6 rounded-[20px] border border-dashed border-slate-300 text-center"><p className="font-black text-slate-400 text-[9px] uppercase tracking-[0.3em]">Todo en orden. No hay productos con stock crítico.</p></div> ) : (
                   <div className="space-y-4">
                     {lowStockItems.map((item, idx) => {
                       let statusLabel = "ATENCIÓN"; let statusColor = "bg-[#0d47a1]";
                       if (item.quantity === 0) { statusLabel = "CRÍTICO"; statusColor = "bg-[#b71c1c]"; } else if (item.quantity < item.minStock) { statusLabel = "URGENTE"; statusColor = "bg-[#e65100]"; }
                       return (
                         <div key={item.id} className="bg-white p-4 md:p-6 rounded-[28px] border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between group hover:shadow-md transition-all gap-4">
                           <div className="flex flex-col md:flex-row items-start md:items-center gap-4 flex-1 w-full"><div className={`${statusColor} text-white text-[9px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest shrink-0 shadow-sm ${statusLabel === 'CRÍTICO' ? 'animate-pulse' : ''}`}>{statusLabel}</div><div className="min-w-0"><h4 className="text-base font-black text-slate-800 uppercase tracking-tight truncate">{item.name}</h4><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">#{item.sku}</p></div></div>
                           <div className="flex items-center justify-between md:justify-end gap-10 w-full md:w-auto pt-3 md:pt-0 border-t md:border-t-0 border-slate-100"><div className="flex flex-col items-center md:items-end"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Actual</p><p className={`text-xl font-black ${item.quantity === 0 ? 'text-[#b71c1c]' : 'text-slate-700'}`}>{item.quantity}</p></div><div className="flex flex-col items-center md:items-end"><p className="text-[8px] font-black text-slate-400 uppercase mb-1">Mínimo</p><p className="text-xl font-black text-slate-400">{item.minStock}</p></div></div>
                         </div>
                       );
                     })}
                   </div>
                 )}</div>
            </div>
          </div>
        )}
        {activeSection === AppSection.ACTIVOS && (
          <div className="animate-fade-in space-y-6">
            <div className="bg-white p-4 md:p-6 rounded-[32px] shadow-[0_30px_70px_rgba(0,0,0,0.05)] border border-slate-200 relative overflow-hidden">
               <div className="absolute top-0 right-0 p-14 opacity-[0.04] transform scale-[4] rotate-12 pointer-events-none text-blue-600 print:hidden"><ICONS.Box /></div>
               <div className="relative">
                 <div className="flex justify-between items-center mb-6">
                   <div className="text-2xl font-black text-slate-800 uppercase tracking-[0.4em] opacity-80 flex items-center gap-5">
                     <div className="w-10 h-10 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-500 print:hidden"><ICONS.Box /></div>
                     INVENTARIO
                   </div>
                   <button onClick={handlePrint} className="print:hidden px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 hover:text-white transition-colors border border-indigo-100 shadow-sm">
                     <ICONS.Printer />
                     IMPRIMIR
                   </button>
                 </div>
                 
                 <div className="mb-6 print:hidden">
                   <input type="text" value={activosFilter} onChange={(e) => setActivosFilter(e.target.value)} placeholder="Filtrar por lugar, producto o responsable..." className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white outline-none transition-all shadow-sm text-sm font-bold uppercase tracking-tight" />
                 </div>

                 {activosData.length === 0 ? ( 
                   <div className="bg-slate-50 p-6 rounded-[20px] border border-dashed border-slate-300 text-center print:hidden">
                     <p className="font-black text-slate-400 text-[9px] uppercase tracking-[0.3em]">No hay activos registrados.</p>
                   </div> 
                 ) : (
                   <div className="w-full overflow-x-auto rounded-[20px] border border-slate-200 shadow-sm print:border-none print:shadow-none print:overflow-visible print:rounded-none">
                     <table className="w-full text-left border-collapse min-w-max print:min-w-0">
                       <thead>
                         <tr className="bg-slate-100 print:bg-transparent border-b-2 border-slate-400 print:border-black">
                           <th className="px-3 py-2 print:px-2 print:py-1 font-black text-slate-700 text-[10px] uppercase tracking-[0.2em] print:text-black w-16 border-r border-slate-300 print:border-black">Cant</th>
                           <th className="px-3 py-2 print:px-2 print:py-1 font-black text-slate-700 text-[10px] uppercase tracking-[0.2em] print:text-black border-r border-slate-300 print:border-black">Producto</th>
                           <th className="px-3 py-2 print:px-2 print:py-1 font-black text-slate-700 text-[10px] uppercase tracking-[0.2em] print:text-black border-r border-slate-300 print:border-black">Responsable</th>
                           <th className="px-3 py-2 print:px-2 print:py-1 font-black text-slate-700 text-[10px] uppercase tracking-[0.2em] print:text-black border-r border-slate-300 print:border-black">Lugar</th>
                           <th className="px-3 py-2 font-black text-slate-700 text-[10px] uppercase tracking-[0.2em] print:hidden text-center">Documentación</th>
                         </tr>
                       </thead>
                       <tbody className="divide-y-0">
                         {activosData.filter(a => {
                           const f = activosFilter.toLowerCase();
                           return a.lugar.toLowerCase().includes(f) || a.producto.toLowerCase().includes(f) || a.responsable.toLowerCase().includes(f);
                         }).map((item) => (
                           <tr key={item.id} className="hover:bg-slate-50 transition-colors print:hover:bg-transparent border-b border-slate-300 print:border-black">
                             <td className="px-3 py-1.5 print:px-2 print:py-1 text-[10px] font-black text-slate-800 print:text-black border-r border-slate-300 print:border-black">{item.cantidad || '-'}</td>
                             <td className="px-3 py-1.5 print:px-2 print:py-1 text-[10px] font-bold text-slate-800 uppercase print:text-black border-r border-slate-300 print:border-black">{item.producto}</td>
                             <td className="px-3 py-1.5 print:px-2 print:py-1 text-[10px] font-bold text-slate-600 uppercase print:text-black border-r border-slate-300 print:border-black">{item.responsable || 'N/A'}</td>
                             <td className="px-3 py-1.5 print:px-2 print:py-1 text-[10px] font-bold text-slate-600 uppercase print:text-black border-r border-slate-300 print:border-black">{item.lugar || 'N/A'}</td>
                             <td className="px-3 py-1.5 print:hidden text-center">
                               {item.documentacion ? (
                                 <button onClick={() => setDocUrl(item.documentacion)} className="inline-flex items-center justify-center gap-1.5 px-4 py-1.5 bg-blue-50 text-blue-600 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all hover:bg-blue-600 hover:text-white border border-blue-100 group shadow-sm">
                                   <span>VER DOC</span>
                                   <ICONS.ExternalLink />
                                 </button>
                               ) : (
                                 <span className="text-[9px] font-bold text-slate-400 uppercase">Sin Doc</span>
                               )}
                             </td>
                           </tr>
                         ))}
                       </tbody>
                     </table>
                   </div>
                 )}
               </div>
            </div>
          </div>
        )}
      </main>
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200 px-2 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] flex justify-around items-center z-50 shadow-[0_-10px_40px_rgba(0,0,0,0.05)] print:hidden">
        {navItems.map((item) => (
          <button key={item.id} onClick={() => setActiveSection(item.id)} className={`group relative overflow-hidden flex flex-col items-center gap-2 min-w-[64px] transition-all duration-300 ${activeSection === item.id ? 'text-[#2e7d32]' : 'text-slate-400 hover:text-slate-600'}`}>
            <ShineEffect /><div className={`relative z-10 p-2.5 rounded-2xl transition-all duration-500 ${activeSection === item.id ? 'bg-[#2e7d32] text-white shadow-lg shadow-emerald-200 scale-110' : 'bg-transparent'}`}>{item.icon}</div><span className={`relative z-10 text-[10px] font-black uppercase tracking-tighter transition-all ${activeSection === item.id ? 'opacity-100 scale-100' : 'opacity-60 scale-95'}`}>{item.label}</span>
            {item.id === AppSection.SOLICITUD && finalizedRequests.length > 0 && ( <span className={`absolute top-0 right-1 bg-rose-500 text-white w-5 h-5 flex items-center justify-center rounded-full text-[9px] font-black border-2 border-white leading-none shadow-md z-20 ${activeSection === item.id ? 'animate-none' : 'animate-bounce'}`}>{finalizedRequests.length}</span> )}
            {item.id === AppSection.ORDER && lowStockItems.length > 0 && ( <span className={`absolute top-0 right-1 bg-rose-500 text-white w-2 h-2 flex items-center justify-center rounded-full border border-white leading-none shadow-md z-20 animate-ping`}></span> )}
          </button>
        ))}
      </nav>
      <AnimatePresence>
        {activeSection === AppSection.SOLICITUD && solicitudStep === 'crear' && !hasSolicitudFilters && finalizedRequests.length > 0 && (
          <OrderMascot 
            count={finalizedRequests.length} 
            onClick={() => setSolicitudStep('cerrar')}
          />
        )}
      </AnimatePresence>
      {docUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/60 backdrop-blur-sm print:hidden" onClick={() => setDocUrl(null)}>
          <div className="bg-white rounded-[32px] w-full max-w-5xl h-[85vh] flex flex-col overflow-hidden shadow-2xl relative animate-fade-in" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center p-5 md:p-6 border-b border-slate-100 bg-slate-50/80 backdrop-blur-md shrink-0">
              <h3 className="font-black text-slate-800 text-xs md:text-sm uppercase tracking-[0.2em] flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-xl flex items-center justify-center"><ICONS.ExternalLink /></div>
                Documentación
              </h3>
              <button onClick={() => setDocUrl(null)} className="p-2 md:p-3 bg-white rounded-xl text-slate-400 hover:text-rose-500 hover:bg-rose-50 shadow-sm border border-slate-200 transition-all flex items-center justify-center gap-2">
                 <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">CERRAR</span>
                 <ICONS.Minus />
              </button>
            </div>
            <div className="flex-1 w-full bg-slate-100/50 p-2 md:p-4">
              <div className="w-full h-full bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden relative">
                <iframe 
                  src={docUrl.includes('drive.google.com') && !docUrl.includes('preview') ? docUrl.replace(/\/view.*$/, '/preview').replace(/\/edit.*$/, '/preview') : docUrl} 
                  className="absolute inset-0 w-full h-full border-none" 
                  title="Documento" 
                />
              </div>
            </div>
          </div>
        </div>
      )}
      <AnimatePresence>
        {stockError && (
          <motion.div
            initial={{ opacity: 0, y: 50, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 50, x: '-50%' }}
            className="fixed bottom-28 md:bottom-10 left-1/2 z-[100] pointer-events-none"
          >
            <div className="bg-rose-500 text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-rose-400">
              <div className="bg-white/20 p-1.5 rounded-lg"><ICONS.ShoppingBag /></div>
              <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">Sin Stock Disponible</span>
                <span className="text-[11px] font-black uppercase tracking-tight mt-1 opacity-90">{stockError}</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
const rootElement = document.getElementById('root');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<React.StrictMode><App /></React.StrictMode>);
}
