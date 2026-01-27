
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
      setSyncStatus({ type: 'error', message: 'Por favor ingresa un enlace válido de Google Sheets.' });
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
      if (!response.ok) throw new Error('No se pudo acceder al servidor de Google. Verifica los permisos.');
      
      const text = await response.text();
      
      if (text.trim().toLowerCase().startsWith('<!doctype html') || text.includes('<html')) {
        throw new Error('El archivo es privado. Cambia el acceso a "Cualquier persona con el enlace".');
      }

      const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
      if (lines.length < 2) throw new Error('El archivo no contiene suficientes datos.');

      const dataRows = lines.slice(1); // Omitir cabecera
      const parsedInventory: Product[] = dataRows
        .map((line, index) => {
          const cols = parseCSVLine(line);
          // Esperamos: Cantidad, Activo Fijo, Lugar, Responsable
          if (cols.length < 2) return null; 

          return {
            id: `item-${Date.now()}-${index}`,
            quantity: parseInt(cols[0].replace(/[^0-9]/g, '')) || 0,
            name: cols[1] || 'Producto sin nombre',
            sku: cols[1]?.substring(0, 10).toUpperCase() || 'S/N',
            location: cols[2] || 'No especificado',
            responsible: cols[3] || 'Sin asignar',
            category: 'Inventario General',
            arrivalDate: new Date().toISOString() // Al no haber fecha en el archivo, usamos la actual
          };
        })
        .filter((item): item is Product => item !== null);

      if (parsedInventory.length === 0) {
        throw new Error('No se pudo extraer ningún producto. Revisa el orden de las columnas.');
      }

      setInventory(parsedInventory);
      setSyncStatus({ type: 'success', message: `¡Sincronizado! Se cargaron ${parsedInventory.length} activos fijos.` });
    } catch (error: any) {
      console.error(error);
      setSyncStatus({ type: 'error', message: error.message || 'Error al procesar el archivo.' });
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-[#f8fafc]">
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col fixed h-full z-10">
        <div className="p-6 flex items-center gap-3">
          <div className="p-2 bg-blue-50 rounded-lg">
            <ICONS.Box />
          </div>
          <h1 className="font-bold text-xl text-slate-800 tracking-tight">StockFlow</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 mt-4">
          <button
            onClick={() => setActiveSection(AppSection.DASHBOARD)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === AppSection.DASHBOARD ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ICONS.Dashboard />
            <span className="font-medium">Panel Control</span>
          </button>
          <button
            onClick={() => setActiveSection(AppSection.QUERY)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === AppSection.QUERY ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ICONS.Search />
            <span className="font-medium">Consultas</span>
          </button>
          <button
            onClick={() => setActiveSection(AppSection.INVENTORY)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === AppSection.INVENTORY ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ICONS.Inventory />
            <span className="font-medium">Inventario</span>
          </button>
          <button
            onClick={() => setActiveSection(AppSection.SETTINGS)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${activeSection === AppSection.SETTINGS ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'text-slate-500 hover:bg-slate-50'}`}
          >
            <ICONS.Settings />
            <span className="font-medium">Configuración</span>
          </button>
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

      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-slate-800">
              {activeSection === AppSection.DASHBOARD && 'Vista General'}
              {activeSection === AppSection.QUERY && 'Consultas de Activos'}
              {activeSection === AppSection.INVENTORY && 'Lista de Inventario'}
              {activeSection === AppSection.SETTINGS && 'Configuración de Origen'}
            </h2>
            <p className="text-slate-500">Sistema de trazabilidad de productos</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-400">Actualizado: {new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
          </div>
        </header>

        {activeSection === AppSection.DASHBOARD && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-400 text-sm font-medium">Activos Diferentes</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">{inventory.length}</h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-400 text-sm font-medium">Cantidad Total</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">
                {inventory.reduce((acc, curr) => acc + (curr.quantity || 0), 0)}
              </h3>
            </div>
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <p className="text-slate-400 text-sm font-medium">Puntos de Control</p>
              <h3 className="text-3xl font-bold text-slate-800 mt-1">
                {new Set(inventory.map(i => i.location)).size}
              </h3>
            </div>

            <div className="md:col-span-3 bg-white p-8 rounded-2xl shadow-sm border border-slate-100 mt-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 bg-purple-100 text-purple-600 flex items-center justify-center rounded-lg">
                  <ICONS.Search />
                </div>
                <h4 className="font-bold text-lg text-slate-800">Consultas con IA</h4>
              </div>
              <form onSubmit={handleAiQuery} className="relative">
                <input 
                  name="ai-query"
                  placeholder="¿Cuántos activos hay en la oficina norte?"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-6 py-4 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                />
                <button 
                  disabled={aiLoading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 bg-purple-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-purple-700 disabled:opacity-50"
                >
                  {aiLoading ? 'Calculando...' : 'Preguntar'}
                </button>
              </form>
              {aiResponse && (
                <div className="mt-6 p-5 bg-purple-50 rounded-xl border border-purple-100 text-slate-700 animate-fade-in">
                  {aiResponse}
                </div>
              )}
            </div>
          </div>
        )}

        {activeSection === AppSection.QUERY && (
          <div className="max-w-4xl animate-fade-in space-y-8">
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6">Buscador de Activos</h3>
              <AutocompleteSearch 
                products={inventory} 
                onSelect={(p) => setSelectedProduct(p)} 
                placeholder="Escribe el nombre del activo fijo..."
              />
            </div>

            {selectedProduct && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
                <div className="bg-white p-8 rounded-3xl shadow-xl border border-blue-50">
                  <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">Activo Fijo</span>
                  <h4 className="text-2xl font-bold text-slate-800 mt-4">{selectedProduct.name}</h4>
                  
                  <div className="mt-8 space-y-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-blue-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Ubicación / Lugar</p>
                        <p className="text-slate-500">{selectedProduct.location}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-orange-400">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" /></svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-800">Antigüedad en sistema</p>
                        <p className="text-slate-500">{calculateTimeInInventory(selectedProduct.arrivalDate)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="bg-emerald-50 p-8 rounded-3xl border border-emerald-100">
                    <p className="text-emerald-600 font-bold uppercase text-xs tracking-widest">Cantidad</p>
                    <h5 className="text-4xl font-bold text-emerald-800 mt-1">{selectedProduct.quantity} Unidades</h5>
                  </div>
                  <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center font-bold text-blue-600 text-xl">
                       {selectedProduct.responsible[0]}
                    </div>
                    <div>
                      <p className="text-slate-400 font-medium text-xs uppercase tracking-widest">Responsable a cargo</p>
                      <h5 className="text-xl font-bold text-slate-800">{selectedProduct.responsible}</h5>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeSection === AppSection.INVENTORY && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden animate-fade-in">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center">
              <h3 className="font-bold text-slate-800">Reporte de Inventario</h3>
              <button onClick={syncWithGoogleSheets} disabled={isSyncing} className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold disabled:opacity-50">
                {isSyncing ? 'Sincronizando...' : 'Sincronizar ahora'}
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                  <tr>
                    <th className="px-6 py-4">Cant.</th>
                    <th className="px-6 py-4">Activo Fijo</th>
                    <th className="px-6 py-4">Lugar</th>
                    <th className="px-6 py-4">Responsable</th>
                  </tr>
                </thead>
                <tbody className="text-slate-600 text-sm">
                  {inventory.map((item, idx) => (
                    <tr key={item.id + idx} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td className="px-6 py-4 font-bold text-blue-600">{item.quantity}</td>
                      <td className="px-6 py-4 font-bold text-slate-800">{item.name}</td>
                      <td className="px-6 py-4">{item.location}</td>
                      <td className="px-6 py-4 font-medium">{item.responsible}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSection === AppSection.SETTINGS && (
          <div className="max-w-2xl bg-white p-10 rounded-3xl shadow-sm border border-slate-100 animate-fade-in">
            <h3 className="text-xl font-bold text-slate-800 mb-6">Vincular Hoja de Google</h3>
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Enlace de Compartir</label>
                <input
                  type="url"
                  value={sourceLink}
                  onChange={(e) => setSourceLink(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/..."
                  className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
              </div>

              {syncStatus.type && (
                <div className={`p-4 rounded-xl border flex items-center gap-3 animate-fade-in ${syncStatus.type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-700' : 'bg-rose-50 border-rose-100 text-rose-700'}`}>
                  <span className="text-sm font-medium">{syncStatus.message}</span>
                </div>
              )}

              <div className="p-6 bg-blue-50 rounded-2xl border border-blue-100">
                <h4 className="text-xs font-bold text-blue-700 uppercase mb-3 tracking-widest">Instrucciones del Formato:</h4>
                <p className="text-sm text-blue-600 mb-4">El archivo de Google Sheets debe tener las columnas en este orden exacto:</p>
                <div className="grid grid-cols-4 gap-2 text-[10px] font-bold text-center text-white">
                  <div className="bg-blue-500 p-2 rounded">CANTIDAD</div>
                  <div className="bg-blue-500 p-2 rounded">ACTIVO FIJO</div>
                  <div className="bg-blue-500 p-2 rounded">LUGAR</div>
                  <div className="bg-blue-500 p-2 rounded">RESPONSABLE</div>
                </div>
                <ul className="text-xs text-blue-600 mt-4 space-y-1 list-disc ml-4">
                  <li>La primera fila se ignora (Cabeceras).</li>
                  <li>Asegúrate de que el acceso sea público ("Cualquier persona con el enlace").</li>
                </ul>
              </div>

              <button 
                onClick={syncWithGoogleSheets}
                disabled={isSyncing || !sourceLink}
                className="w-full bg-blue-600 text-white font-bold py-4 rounded-xl shadow-lg hover:bg-blue-700 transition-all disabled:opacity-50"
              >
                {isSyncing ? 'Sincronizando...' : 'Vincular y Cargar Datos'}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
