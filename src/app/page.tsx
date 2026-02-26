'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase'; // Asegúrate de que esta ruta sea correcta
import { 
  Package, Tag, AlertCircle, ScanBarcode, X, CheckCircle2, 
  PlusCircle, Search, ChevronLeft, ChevronRight, PenSquare, Loader2, ChevronDown
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

// Categorías extraídas de tu base de datos
const CATEGORIAS_BD = [
  "Pantalones", "Camisas", "Zapatos", "Perfumes", "Accesorios", 
  "Tenis", "Shorts", "Gorras", "Texanas", "Sombreros", "Cintos", "Playeras"
];

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Controles de vista
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // Estado del Formulario
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', category: CATEGORIAS_BD[0], price: '', stock: 1, size: ''
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // 1. Cargar productos
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 2. LÓGICA DEL ESCÁNER (MOTOR ORIGINAL)
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (isScannerOpen) {
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        videoConstraints: { facingMode: "environment" }
      };

      scanner = new Html5QrcodeScanner("reader", config, false);

      scanner.render(
        async (decodedText: string) => {
          if (scanner) {
            scanner.pause(); 
            await scanner.clear(); 
          }
          if (navigator.vibrate) navigator.vibrate(200); 
          setIsScannerOpen(false); 
          await handleBarcodeScanned(decodedText);
        }, 
        (error: any) => { /* Ignorar errores de lectura continua */ }
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error(err));
      }
    };
  }, [isScannerOpen]);

  // 3. Procesar SKU (Escáner)
  const handleBarcodeScanned = async (skuScaneado: string) => {
    setErrorMsg(""); setSuccessMsg("");
    setLoading(true);

    try {
      const productoExistente = items.find(item => item.sku === skuScaneado);

      if (productoExistente) {
        // ACTUALIZAR STOCK
        const nuevoStock = productoExistente.stock + 1;
        const { error } = await supabase
          .from('products')
          .update({ stock: nuevoStock })
          .eq('id', productoExistente.id);

        if (error) throw error;

        setItems(prev => prev.map(item => item.id === productoExistente.id ? { ...item, stock: nuevoStock } : item));
        setSearchTerm(skuScaneado);
        setSuccessMsg(`Stock actualizado: ${productoExistente.name} (+1)`);
      } else {
        // NUEVO PRODUCTO
        setNewProduct(prev => ({ ...prev, sku: skuScaneado, name: '', price: '', stock: 1, size: '' }));
        setIsFormOpen(true);
        setErrorMsg(`Código nuevo: ${skuScaneado}. Llena los datos para guardarlo.`);
      }
    } catch (error: any) {
      setErrorMsg("Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Guardar Producto Formulario (CON PROTECCIÓN ANTI-DOBLE CLIC Y LOCAL_ID SECUENCIAL)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Protección anti-doble clic: Si ya está guardando, ignorar nuevos clics
    if (loading) return; 

    setLoading(true); 
    setErrorMsg(""); 
    setSuccessMsg("");
    
    try {
      const existe = items.find(item => item.sku === newProduct.sku);
      if (existe) {
        setErrorMsg(`El SKU ${newProduct.sku} ya existe en "${existe.name}".`);
        setLoading(false);
        return;
      }

      // --- CÁLCULO DE LOCAL_ID SECUENCIAL ---
      // Buscamos el local_id más alto en los productos actuales
      const maxLocalId = items.reduce((max, item) => {
        const currentId = item.local_id ? Number(item.local_id) : 0;
        return currentId > max ? currentId : max;
      }, 0);
      
      const nextLocalId = maxLocalId + 1;

      const { data, error } = await supabase
        .from('products')
        .insert([{
          local_id: nextLocalId, // Guardamos el número secuencial generado
          sku: newProduct.sku,
          name: newProduct.name,
          category: newProduct.category,
          price: Number(newProduct.price),
          stock: Number(newProduct.stock),
          size: newProduct.size
        }])
        .select()
        .single();

      if (error) throw error;

      // Actualizamos la lista local inmediatamente
      setItems(prev => [data, ...prev]); // Lo ponemos al principio de la lista
      setSearchTerm(data.sku); 
      setSuccessMsg(`"${data.name}" agregado con éxito.`);
      setIsFormOpen(false);
      setNewProduct({ sku: '', name: '', category: CATEGORIAS_BD[0], price: '', stock: 1, size: '' });
    } catch (error: any) {
      console.error(error);
      setErrorMsg("Error al guardar el producto.");
    } finally {
      setLoading(false);
    }
  };

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('updated_at', { ascending: false });
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      setErrorMsg("Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  }

  const filteredItems = items.filter(item => {
    const searchLower = searchTerm.toLowerCase();
    return (
      item.name?.toLowerCase().includes(searchLower) ||
      item.sku?.toLowerCase().includes(searchLower) ||
      item.category?.toLowerCase().includes(searchLower)
    );
  });

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const currentItems = filteredItems.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-slate-100 text-slate-900 font-sans pb-24">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6">
        <Package className="text-blue-600 h-10 w-10"/> 
        <h2 className="text-3xl font-black text-slate-800">Inventario</h2>
      </div>

      {/* BOTONES GIGANTES Y CLAROS PARA MÓVIL Y DESKTOP */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        
        {/* BOTÓN 1: AGREGAR MANUAL */}
        <button 
          onClick={() => {
            setIsScannerOpen(false);
            setErrorMsg(""); setSuccessMsg("");
            setNewProduct({ sku: '', name: '', category: CATEGORIAS_BD[0], price: '', stock: 1, size: '' });
            setIsFormOpen(true);
          }}
          className="w-full flex items-center justify-center gap-3 bg-slate-800 text-white p-5 rounded-2xl shadow-lg hover:bg-slate-700 active:scale-95 transition"
        >
          <PenSquare size={28} className="text-blue-400" />
          <span className="text-xl font-black tracking-wide">AGREGAR MANUAL</span>
        </button>

        {/* BOTÓN 2: ESCANEAR */}
        <button 
          onClick={() => {
            setIsFormOpen(false);
            setErrorMsg(""); setSuccessMsg("");
            setIsScannerOpen(true);
          }}
          className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white p-5 rounded-2xl shadow-lg hover:bg-blue-700 active:scale-95 transition"
        >
          <ScanBarcode size={28} className="text-blue-200" />
          <span className="text-xl font-black tracking-wide">ESCANEAR CÓDIGO</span>
        </button>

      </div>

      {/* BUSCADOR */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar producto o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-12 py-4 border-2 border-slate-300 rounded-2xl bg-white focus:outline-none focus:border-blue-600 text-lg font-bold shadow-sm"
        />
        {searchTerm && (
          <button onClick={() => setSearchTerm("")} className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400">
            <X size={24} />
          </button>
        )}
      </div>

      {/* MENSAJES */}
      {errorMsg && (
        <div className="bg-red-50 border-l-8 border-red-600 p-4 mb-6 rounded-xl flex items-start shadow-sm">
          <AlertCircle className="h-6 w-6 text-red-600 mr-3 shrink-0" />
          <p className="text-base font-bold text-red-900">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border-l-8 border-green-600 p-4 mb-6 rounded-xl flex items-start shadow-sm">
          <CheckCircle2 className="h-6 w-6 text-green-600 mr-3 shrink-0" />
          <p className="text-base font-bold text-green-900">{successMsg}</p>
        </div>
      )}

      {/* LISTA DE PRODUCTOS */}
      {loading && !isFormOpen && !isScannerOpen ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* MÓVIL */}
          <div className="flex flex-col gap-4 md:hidden">
            {currentItems.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border-2 border-slate-200">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-black text-slate-900 text-lg uppercase">{item.name}</h3>
                  <span className="text-xl font-black text-emerald-600">${item.price}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-sm text-slate-700 font-mono font-bold bg-slate-100 px-2 py-1 rounded">SKU: {item.sku}</span>
                  {item.local_id && <span className="text-sm text-slate-600 font-bold border border-slate-200 px-2 py-1 rounded">ID: {item.local_id}</span>}
                  {item.size && <span className="text-sm text-slate-600 font-bold border border-slate-200 px-2 py-1 rounded">Talla: {item.size}</span>}
                </div>
                <div className="pt-3 mt-3 border-t border-slate-100 flex justify-between items-center">
                   <div className="flex items-center gap-1.5 text-slate-500 font-bold text-sm"><Tag size={16}/> {item.category || 'N/A'}</div>
                   <div className={`px-3 py-1.5 rounded-lg font-black text-sm shadow-sm border ${item.stock < 5 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>
                      STOCK: {item.stock}
                   </div>
                </div>
              </div>
            ))}
          </div>

          {/* ESCRITORIO */}
          <div className="hidden md:block bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Producto</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-black text-slate-500 uppercase">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-black text-slate-500 uppercase">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <div className="text-base font-bold text-slate-900 uppercase">{item.name}</div>
                      <div className="flex gap-2 mt-0.5">
                        {item.local_id && <span className="text-xs font-bold text-slate-400">ID: {item.local_id}</span>}
                        {item.size && <span className="text-xs font-bold text-slate-500">Talla: {item.size}</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-700 font-mono font-bold">{item.sku}</td>
                    <td className="px-6 py-4"><span className="px-2.5 py-1 text-xs rounded-md bg-slate-100 text-slate-700 font-bold border border-slate-200">{item.category}</span></td>
                    <td className="px-6 py-4"><span className={`px-3 py-1 text-sm rounded-lg font-black border ${item.stock < 5 ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'}`}>{item.stock}</span></td>
                    <td className="px-6 py-4 text-lg text-emerald-600 text-right font-black">${item.price}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          {filteredItems.length > 0 && (
            <div className="mt-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="text-sm font-bold text-slate-500">
                Mostrando <span className="text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> de <span className="text-slate-900">{filteredItems.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 transition"><ChevronLeft size={20} /></button>
                <span className="text-sm font-black text-slate-900 px-3">Pág {currentPage} / {totalPages}</span>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="p-3 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 disabled:opacity-50 transition"><ChevronRight size={20} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ========================================================= */}
      {/* MODAL DEL ESCÁNER (USANDO EL MOTOR ORIGINAL)              */}
      {/* ========================================================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl flex flex-col relative overflow-hidden">
            
            <button 
              onClick={() => setIsScannerOpen(false)} 
              className="absolute top-3 right-3 z-[200] bg-red-600 text-white p-2 rounded-full shadow-lg"
            >
              <X size={24} />
            </button>

            <div className="p-4 bg-slate-900 text-white text-center border-b-4 border-blue-500">
              <h3 className="font-black text-xl pr-8">Escaneando código...</h3>
            </div>
            
            <div id="reader" className="w-full bg-black"></div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE FORMULARIO MANUAL                                */}
      {/* ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl my-auto">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 rounded-t-3xl">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><PlusCircle className="text-blue-600" /> Registrar Producto</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-2"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Código (SKU)</label>
                  <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-mono font-bold" placeholder="Escribe el código..." />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Nombre del Producto</label>
                  <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-bold uppercase" placeholder="Ej: GORRA NY NEGRA" />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Categoría</label>
                  <div className="relative">
                    <select 
                      value={newProduct.category} 
                      onChange={e => setNewProduct({...newProduct, category: e.target.value})} 
                      className="block w-full appearance-none rounded-xl border-2 border-slate-200 bg-white p-4 pr-10 text-base font-bold text-slate-800 focus:border-blue-600 focus:outline-none"
                    >
                      {CATEGORIAS_BD.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                      <ChevronDown size={20} />
                    </div>
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Talla</label>
                  <input type="text" value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-bold uppercase" placeholder="Ej: UNITALLA" />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Stock</label>
                  <input required type="number" min="1" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-bold" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Precio ($)</label>
                  <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-xl text-emerald-700 font-black" placeholder="0.00" />
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-4 bg-slate-200 text-slate-800 hover:bg-slate-300 rounded-xl font-black w-full md:w-auto transition">Cancelar</button>
                
                {/* BOTÓN CON PROTECCIÓN VISUAL ANTI DOBLE CLIC */}
                <button 
                  type="submit" 
                  disabled={loading}
                  className={`px-8 py-4 text-white rounded-xl font-black w-full md:w-auto shadow-md transition flex justify-center items-center gap-2 ${
                    loading ? 'bg-blue-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
                  }`}
                >
                  {loading && <Loader2 className="animate-spin h-5 w-5" />}
                  {loading ? 'Guardando...' : 'Guardar Producto'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}