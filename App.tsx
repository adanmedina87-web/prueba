
import React, { useState, useEffect } from 'react';
import { Product, AppSection } from './types';
import { INITIAL_INVENTORY, ICONS } from './constants';
import { AutocompleteSearch } from './components/AutocompleteSearch';
import { getInventoryInsights } from './services/gemini';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.DASHBOARD);
  const [inventory, setInventory] = useState<Product[]>(() => {
    const saved = localStorage.getItem('inventory_data');
    return saved ? JSON.parse(saved) : INITIAL_INVENTORY;
  });
  const [sourceLink, setSourceLink] = useState(() => localStorage.getItem('inventory_source_link') || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  useEffect(() => {
    localStorage.setItem('inventory_data', JSON.stringify(inventory));
  }, [inventory]);

  useEffect(() => {
    localStorage.setItem('inventory_source_link', sourceLink);
  }, [sourceLink]);

  const calculateTimeInInventory = (date: string) => {
    if (!date || date === 'N/A') return "Recién ingresado";
    const arrival = new Date(date);
    if (isNaN(arrival.getTime())) return "Fecha no especificada";
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - arrival.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 30) return `${diffDays} días`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} meses`;
    return `${Math.floor(diffDays / 365)} años`;
  };

  const handleAiQuery = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const query = new FormData(form).get('ai-query') as string;
    if (!query) return;

    setAiLoading(true);
    const response = await getInventoryInsights(query, inventory);
    setAiResponse(response);
    setAiLoading(false);
    form.reset();
  };

  const parseCSVLine = (line: string) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const syncWithGoogleSheets = async () => {
    if (!sourceLink || !sourceLink.includes('docs.google.com/spreadsheets')) {
      setSyncStatus({ type: 'error', message: 'Ingresa un enlace válido de Google Sheets.' });
      return;
    }

    setIsSyncing(true);
    setSyncStatus({ type: null, message: '' });

    try {
      let csvUrl = sourceLink;
      if (csvUrl.includes('/edit')) {
        csvUrl = csvUrl.split('/edit')[0] + '/export?format=csv';
      } else if (!csvUrl.includes('/export')) {
        csvUrl = csvUrl.replace(/\/$/, '') + '/export?format=csv';
      }

      const response = await fetch(csvUrl);
      if (!response.ok) throw new Error('Error al acceder. Verifica permisos.');
      
      const text = await response.text();
      
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.includes('<html')) {
        throw new Error('Archivo privado. Cámbialo a "Público".');
      }

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error('Archivo sin datos suficientes.');

      const dataRows = lines.slice(1);
      const parsedInventory: Product[] = dataRows
        .map((line, index) => {
          const cols = parseCSVLine(line);
          if (cols.length < 2) return null; 

          return {
            id: `item-${Date.now()}-${index}`,
            quantity: parseInt(cols[0].replace(/[^0-9]/g, '')) || 0,
            name: cols[1] || 'Producto sin nombre',
            sku: cols[1]?.substring(0, 10).toUpperCase() || 'S/N',
            location: cols[2] || 'No especificado',
            responsible: cols[3] || 'Sin asignar',
            category: 'Inventario General',
            arrivalDate: new Date().toISOString()
          };
        })
        .filter((item): item is Product => item !== null);

      if (parsedInventory.length === 0) {
        throw new Error('No se pudo extraer ningún producto.');
      }

      setInventory(parsedInventory);
      setSyncStatus({ type: 'success', message: `¡Sincronizado! ${parsedInventory.length} activos.` });
    } catch (error: any) {
      console.error(error);
      setSyncStatus({ type: 'error', message: error.message || 'Error al procesar.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: AppSection.DASHBOARD, icon: <ICONS.Dashboard />, label: 'Inicio' },
    { id: AppSection.QUERY, icon: <ICONS.Search />, label: 'Buscar' },
    { id: AppSection.INVENTORY, icon: <ICONS.Inventory />, label: 'Lista' },
    { id: AppSection.SETTINGS, icon: <ICONS.Settings />, label: 'Config' },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#f8fafc] pb-20 md:pb-0">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200 flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <ICONS.Box />
          </div>
          <h1 className="font-bold text-xl text-slate-800 tracking-tight">StockFlow</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveSection(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === item.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              {item.icon}
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 m-4 bg-slate-50 rounded-2xl border border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Archivo Fuente</p>
          <div className="flex flex-col gap-1 overflow-hidden">
            <span className="text-sm font-medium text-slate-700 truncate">
              {sourceLink || 'No vinculado'}
            </span>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-4">
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-slate-800">
              {activeSection === AppSection.DASHBOARD && 'Vista General'}
              {activeSection === AppSection.QUERY && 'Consultas de Activos'}
              {activeSection === AppSection.INVENTORY && 'Lista de Inventario'}
              {activeSection === AppSection.SETTINGS && 'Configuración'}
            </h2>
            <p className="text-sm text-slate-500 hidden md:block">Sistema de trazabilidad de productos</p>
          </div>
          <div className="flex items-center justify-between w-full md:w-auto gap-4">
            <span className="text-xs md:text-sm text-slate-400">Hoy, {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            <div className="md:hidden">
              <div className="p-2 bg-blue-50 rounded-lg">
                <ICONS.Box />
              </div>
            </div>
          </div>
        </header>

        {activeSection === AppSection.DASHBOARD && (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 animate-fade-in">
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs md:text-sm font-medium">Activos</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">{inventory.length}</h3>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-400 text-xs md:text-sm font-medium">Stock Total</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                {inventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0)}
              </h3>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-100 col-span-2 md:col-span-1">
              <p className="text-slate-400 text-xs md:text-sm font-medium">Zonas</p>
              <h3 className="text-2xl md:text-3xl font-bold text-slate-800 mt-1">
                {new Set(inventory.map(i => i.location)).size}
              </h3>
            </div>

            <div className="col-span-2 md:col-span-3 bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100 mt-2 md:mt-6">
              <div className="flex items-center gap-3 mb-4 md:mb-6">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 flex items-center justify-center rounded-lg">
                  <ICONS.Search />
                </div>
                <h4 className="font-bold text-base md:text-lg text-slate-800">Asistente IA</h4>
              </div>
              <form onSubmit={handleAiQuery} className="flex flex-col gap-3">
                <input 
                  name="ai-query"
                  placeholder="¿Dónde está el monitor?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 md:py-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
                />
                <button 
                  disabled={aiLoading}
                  className="w-full md:w-auto bg-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-purple-700 disabled:opacity-50 transition-colors text-sm"
                >
                  {aiLoading ? 'Calculando...' : 'Preguntar'}
                </button>
              </form>
              {aiResponse && (
                <div className="mt-4 p-4 bg-purple-50 rounded-xl border border-purple-100 text-slate-700 animate-fade-in text-sm leading-relaxed">
                  {aiResponse}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === AppSection.QUERY && (
          <div className="max-w-4xl animate-fade-in space-y-6 md:space-y-8">
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 md:mb-6">Buscador Inteligente</h3>
              <AutocompleteSearch 
                products={inventory} 
                onSelect={(p) => setSelectedProduct(p)} 
                placeholder="Escribe el nombre del activo..."
              />
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 animate-fade-in">
                <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-blue-50">
                  <span className="text-[10px] font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Activo Fijo</span>
                  <h4 className="text-xl md:text-2xl font-bold text-slate-800 mt-4">{selectedProduct.name}</h4>
                  
                  <div className="mt-6 md:mt-8 space-y-4 md:space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-500 shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Ubicación</p>
                        <p className="text-sm md:text-base text-slate-800 font-medium">{selectedProduct.location}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-orange-400 shrink-0">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-400 uppercase">Tiempo en sistema</p>
                        <p className="text-sm md:text-base text-slate-800 font-medium">{calculateTimeInInventory(selectedProduct.arrivalDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 md:space-y-6">
                  <div className="bg-emerald-50 p-6 md:p-8 rounded-2xl border border-emerald-100">
                    <p className="text-emerald-600 font-bold uppercase text-[10px] tracking-widest">Cantidad Disponible</p>
                    <h5 className="text-3xl md:text-4xl font-bold text-emerald-800 mt-1">{selectedProduct.quantity}</h5>
                    <p className="text-emerald-600 text-xs mt-1">Unidades físicas</p>
                  </div>
                  <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-lg md:text-xl shrink-0">
                       {selectedProduct.responsible[0]}
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium text-[10px] uppercase tracking-widest">Responsable</p>
                      <h5 className="text-lg md:text-xl font-bold text-slate-800">{selectedProduct.responsible}</h5>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.INVENTORY && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-4 md:p-6 border-b border-slate-50 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
              <h3 className="font-bold text-slate-800 text-sm md:text-base">Listado Completo ({inventory.length})</h3>
              <button onClick={syncWithGoogleSheets} disabled={isSyncing} className="w-full md:w-auto bg-blue-600 text-white px-4 py-2 rounded-lg text-xs font-bold disabled:opacity-50">
                {isSyncing ? 'Actualizando...' : 'Sincronizar ahora'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[9px] md:text-[10px] tracking-widest">
                  <tr>
                    <th className="px-4 md:px-6 py-4">Cant.</th>
                    <th className="px-4 md:px-6 py-4">Activo Fijo</th>
                    <th className="hidden md:table-cell px-6 py-4">Lugar</th>
                    <th className="px-4 md:px-6 py-4">Encargado</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 text-xs md:text-sm">
                  {inventory.map((item, idx) => (
                    <tr key={item.id + idx} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 md:px-6 py-4 font-bold text-blue-600">{item.quantity}</td>
                      <td className="px-4 md:px-6 py-4">
                        <div className="font-bold text-slate-800">{item.name}</div>
                        <div className="md:hidden text-[10px] text-slate-400 mt-0.5">{item.location}</div>
                      </td>
                      <td className="hidden md:table-cell px-6 py-4">{item.location}</td>
                      <td className="px-4 md:px-6 py-4 text-slate-500">{item.responsible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === AppSection.SETTINGS && (
          <div className="max-w-2xl bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-6">Origen de Datos</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-xs md:text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">URL de Google Sheets</label>
                <input
                  type="url"
                  value={sourceLink}
                  onChange={(e) => setSourceLink(e.target.value)}
                  placeholder="Pegar enlace aquí..."
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm"
                />
              </div>

              {syncStatus.type && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in text-sm font-medium ${syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  {syncStatus.message}
                </div>
              )}

              <div className="p-4 md:p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="text-[10px] font-bold text-blue-700 uppercase mb-3 tracking-widest">Estructura requerida (CSV):</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[9px] font-bold text-center text-white">
                  <div className="bg-blue-500 p-2 rounded">CANTIDAD</div>
                  <div className="bg-blue-500 p-2 rounded">ACTIVO FIJO</div>
                  <div className="bg-blue-500 p-2 rounded">LUGAR</div>
                  <div className="bg-blue-500 p-2 rounded">RESPONSABLE</div>
                </div>
                <p className="text-[11px] text-blue-600 mt-4 leading-relaxed italic">
                  * El archivo debe estar compartido públicamente para lectura.
                </p>
              </div>

              <button 
                onClick={syncWithGoogleSheets}
                disabled={isSyncing || !sourceLink}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50 text-sm"
              >
                {isSyncing ? 'Conectando...' : 'Cargar Inventario'}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Bottom Navigation - Mobile Only */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 py-3 flex justify-around items-center z-50 glass-effect">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`flex flex-col items-center gap-1 min-w-[60px] transition-all ${activeSection === item.id ? 'text-blue-600 scale-110' : 'text-slate-400'}`}
          >
            <div className={`${activeSection === item.id ? 'bg-blue-50 p-2 rounded-xl' : ''}`}>
              {item.icon}
            </div>
            <span className="text-[10px] font-bold">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default App;
