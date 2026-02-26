'use client';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../lib/supabase'; // Ajusta la ruta a tu proyecto
import { 
  Package, Tag, AlertCircle, ScanBarcode, X, CheckCircle2, 
  PlusCircle, Search, ChevronLeft, ChevronRight, PenSquare, Loader2, ChevronDown
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

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
  
  // Estados de Modales (Separados explícitamente)
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [scannerStatus, setScannerStatus] = useState<'init' | 'scanning' | 'error'>('init');
  
  // Estado del Formulario
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', category: CATEGORIAS_BD[0], price: '', stock: 1, size: ''
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);

  // 1. Cargar productos
  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // 2. Lógica del Escáner
  useEffect(() => {
    if (!isScannerOpen) return;

    let isMounted = true;
    setScannerStatus('init');

    const startScanner = async () => {
      try {
        html5QrCodeRef.current = new Html5Qrcode("reader");
        await html5QrCodeRef.current.start(
          { facingMode: "environment" }, 
          { fps: 15, qrbox: { width: 250, height: 150 } },
          async (decodedText) => {
            if (isMounted) {
              if (html5QrCodeRef.current?.isScanning) {
                await html5QrCodeRef.current.stop();
              }
              if (navigator.vibrate) navigator.vibrate([200]);
              setIsScannerOpen(false);
              handleBarcodeScanned(decodedText);
            }
          },
          () => {} // Ignorar advertencias
        );
        if (isMounted) setScannerStatus('scanning');
      } catch (err) {
        if (isMounted) {
          setScannerStatus('error');
          setErrorMsg("Error de cámara. Verifica permisos.");
        }
      }
    };

    const timer = setTimeout(startScanner, 200);

    return () => {
      isMounted = false;
      clearTimeout(timer);
      if (html5QrCodeRef.current?.isScanning) {
        html5QrCodeRef.current.stop().catch(() => {});
      }
    };
  }, [isScannerOpen]);

  const closeScanner = async () => {
    if (html5QrCodeRef.current?.isScanning) {
      await html5QrCodeRef.current.stop().catch(() => {});
    }
    setIsScannerOpen(false);
  };

  // 3. Procesar SKU (Escaneado)
  const handleBarcodeScanned = async (skuScaneado: string) => {
    setErrorMsg(""); setSuccessMsg("");
    setLoading(true);

    try {
      const productoExistente = items.find(item => item.sku === skuScaneado);

      if (productoExistente) {
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
        setNewProduct(prev => ({ ...prev, sku: skuScaneado, name: '', price: '', stock: 1, size: '' }));
        setIsFormOpen(true);
        setErrorMsg(`Código nuevo: ${skuScaneado}. Regístralo por favor.`);
      }
    } catch (error: any) {
      setErrorMsg("Error al actualizar la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Guardar Producto (Botón Guardar del Formulario)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setErrorMsg(""); setSuccessMsg("");
    
    try {
      const existe = items.find(item => item.sku === newProduct.sku);
      if (existe) {
        setErrorMsg(`El SKU ${newProduct.sku} ya existe en "${existe.name}".`);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .insert([{
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

      setItems(prev => [...prev, data]);
      setSearchTerm(data.sku); 
      setSuccessMsg(`"${data.name}" registrado con éxito.`);
      setIsFormOpen(false);
      setNewProduct({ sku: '', name: '', category: CATEGORIAS_BD[0], price: '', stock: 1, size: '' });
    } catch (error: any) {
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

  // ACCIONES PRINCIPALES
  const openManualEntry = () => {
    setIsScannerOpen(false);
    setErrorMsg(""); setSuccessMsg("");
    setNewProduct({ sku: '', name: '', category: CATEGORIAS_BD[0], price: '', stock: 1, size: '' });
    setIsFormOpen(true);
  };

  const openScannerModal = () => {
    setIsFormOpen(false);
    setErrorMsg(""); setSuccessMsg("");
    setIsScannerOpen(true);
  };

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-slate-50 text-slate-900 font-sans pb-24">
      
      {/* Estilos para el láser de la cámara */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes scan-laser { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(140px); } }
        .animate-laser { animation: scan-laser 2.5s ease-in-out infinite; }
      `}} />

      {/* HEADER Y BOTONES DE ACCIÓN */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-slate-800">
            <Package className="text-blue-600 h-8 w-8"/> Inventario
          </h2>
        </div>
        
        {/* BOTONES SIEMPRE VISIBLES Y CLAROS */}
        <div className="grid grid-cols-2 md:flex md:flex-row gap-3 w-full md:w-auto">
          <button 
            onClick={openManualEntry}
            className="flex flex-col md:flex-row items-center justify-center gap-2 px-4 py-4 md:py-3 rounded-2xl border-2 border-slate-300 bg-white text-slate-800 font-bold hover:bg-slate-50 shadow-sm transition"
          >
            <PenSquare size={22} className="text-slate-600"/> 
            <span>Ingreso<br className="md:hidden"/> Manual</span>
          </button>

          <button 
            onClick={openScannerModal}
            className="flex flex-col md:flex-row items-center justify-center gap-2 px-4 py-4 md:py-3 rounded-2xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md transition"
          >
            <ScanBarcode size={22} /> 
            <span>Escanear<br className="md:hidden"/> Producto</span>
          </button>
        </div>
      </div>

      {/* BUSCADOR */}
      <div className="mb-6 relative">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar producto, SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-12 py-4 border-2 border-slate-200 rounded-2xl bg-white focus:outline-none focus:border-blue-600 text-base font-bold shadow-sm"
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
      {loading ? (
        <div className="flex justify-center items-center py-24">
          <Loader2 className="h-12 w-12 text-blue-600 animate-spin" />
        </div>
      ) : (
        <>
          {/* MÓVIL */}
          <div className="flex flex-col gap-4 md:hidden">
            {currentItems.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
                <div className="flex justify-between items-start gap-2">
                  <h3 className="font-black text-slate-900 text-lg uppercase">{item.name}</h3>
                  <span className="text-xl font-black text-emerald-600">${item.price}</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="text-sm text-slate-700 font-mono font-bold bg-slate-100 px-2 py-1 rounded">SKU: {item.sku}</span>
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
                    <td className="px-6 py-4"><div className="text-base font-bold text-slate-900 uppercase">{item.name}</div>{item.size && <div className="text-xs font-bold text-slate-500 mt-0.5">Talla: {item.size}</div>}</td>
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
      {/* MODAL DEL ESCÁNER                                         */}
      {/* ========================================================= */}
      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
          <div className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-md shadow-2xl border border-slate-700 relative flex flex-col animate-in zoom-in-95">
            <div className="px-5 py-4 flex justify-between items-center bg-slate-800">
              <h3 className="font-black text-lg text-white flex items-center gap-2"><ScanBarcode className="text-blue-500" /> Escanear Código</h3>
              <button onClick={closeScanner} className="p-2 rounded-full text-slate-400 hover:text-white bg-slate-700"><X size={20} /></button>
            </div>
            
            <div className="relative w-full aspect-square bg-black">
              {scannerStatus === 'init' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-white"><Loader2 className="h-10 w-10 text-blue-500 animate-spin mb-3" /><p>Iniciando cámara...</p></div>
              )}
              {scannerStatus === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 text-red-500 p-6 text-center"><AlertCircle className="h-12 w-12 mb-3" /><p className="font-bold">{errorMsg}</p></div>
              )}
              <div id="reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover border-none"></div>
              {scannerStatus === 'scanning' && (
                <div className="absolute inset-0 pointer-events-none border-[40px] border-slate-900/50 z-10">
                  <div className="w-full h-full border-2 border-blue-500 relative overflow-hidden rounded"><div className="absolute top-0 left-0 w-full h-0.5 bg-red-500 shadow-[0_0_15px_red] animate-laser"></div></div>
                </div>
              )}
            </div>
            <div className="p-4 bg-slate-900 text-center text-slate-400 text-sm font-medium">Apunta la cámara al código.</div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE FORMULARIO MANUAL / PRODUCTO NUEVO               */}
      {/* ========================================================= */}
      {isFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl w-full max-w-xl shadow-2xl my-auto animate-in slide-in-from-bottom-4">
            
            <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><PlusCircle className="text-blue-600" /> Registrar Producto</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-slate-400 hover:text-slate-700 p-2"><X size={24} /></button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Código (SKU)</label>
                  <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-mono font-bold" placeholder="Ingresa o escanea el SKU..." />
                </div>
                
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Nombre del Producto</label>
                  <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-bold uppercase" placeholder="Ej: GORRA NY NEGRA" />
                </div>
                
                {/* SELECT CORREGIDO PARA MÓVIL (appearance-none) */}
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
                  <input type="text" value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-bold uppercase" placeholder="UNITALLA" />
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Stock</label>
                  <input required type="number" min="1" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-base font-bold" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-500 mb-2 uppercase">Precio de Venta ($)</label>
                  <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full rounded-xl border-2 border-slate-200 p-4 focus:border-blue-600 focus:outline-none text-lg text-emerald-700 font-black" placeholder="0.00" />
                </div>
              </div>
              
              <div className="flex flex-col-reverse md:flex-row justify-end gap-3 mt-6 pt-6 border-t border-slate-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-6 py-4 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-xl font-black w-full md:w-auto transition">Cancelar</button>
                <button type="submit" className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-black w-full md:w-auto shadow-md transition">Guardar Producto</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}