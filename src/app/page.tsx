'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { 
  Package, Tag, AlertCircle, ScanBarcode, X, CheckCircle2, 
  PlusCircle, Search, ChevronLeft, ChevronRight, PenSquare
} from 'lucide-react';
// IMPORTANTE: Cambiamos Html5QrcodeScanner por Html5Qrcode
import { Html5Qrcode } from 'html5-qrcode';

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  
  // Estados UI
  const [isScanning, setIsScanning] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newProduct, setNewProduct] = useState({
    sku: '', name: '', category: '', price: '', stock: 1, size: ''
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    fetchProducts();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  // --- NUEVA LÓGICA DEL ESCÁNER (MODO INVISIBLE Y DIRECTO) ---
  useEffect(() => {
    let html5QrCode: Html5Qrcode;
    let isComponentMounted = true;

    if (isScanning) {
      // Usamos el modo Core de la librería para evitar su interfaz fea
      html5QrCode = new Html5Qrcode("reader");

      html5QrCode.start(
        { facingMode: "environment" }, // Fuerza la cámara trasera
        { fps: 15, qrbox: { width: 250, height: 150 } },
        (decodedText) => {
          // Éxito al escanear
          if (isComponentMounted) {
            // Detenemos la cámara INMEDIATAMENTE
            html5QrCode.stop().then(() => {
              setIsScanning(false);
              handleBarcodeScanned(decodedText);
            }).catch(err => console.error("Error deteniendo cámara", err));
          }
        },
        (errorMessage) => {
          // Errores continuos de "no se detecta código" (se ignoran silenciosamente)
        }
      ).catch((err) => {
        console.error("Error iniciando escáner:", err);
        setErrorMsg("Error al iniciar la cámara. Verifica los permisos de tu navegador.");
        setIsScanning(false);
      });
    }

    // Limpieza al cerrar el modal o cambiar de página
    return () => {
      isComponentMounted = false;
      if (html5QrCode && html5QrCode.isScanning) {
        html5QrCode.stop().catch(console.error);
      }
    };
  }, [isScanning]);

  // --- PROCESAMIENTO DEL SKU ---
  const handleBarcodeScanned = async (skuScaneado: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setShowAddForm(false);
    setLoading(true);

    try {
      const productoExistente = items.find(item => item.sku === skuScaneado);

      if (productoExistente) {
        // SUMAR STOCK +1
        const nuevoStock = productoExistente.stock + 1;
        const { error } = await supabase
          .from('products')
          .update({ stock: nuevoStock })
          .eq('id', productoExistente.id);

        if (error) throw error;

        setItems(prevItems => 
          prevItems.map(item => 
            item.id === productoExistente.id ? { ...item, stock: nuevoStock } : item
          )
        );
        setSearchTerm(skuScaneado);
        setSuccessMsg(`Stock actualizado: ${productoExistente.name} (+1)`);
      } else {
        // PRODUCTO NUEVO
        setNewProduct(prev => ({ ...prev, sku: skuScaneado }));
        setShowAddForm(true);
        setErrorMsg(`Código nuevo detectado: ${skuScaneado}. Regístralo a continuación.`);
      }
    } catch (error: any) {
      setErrorMsg("Error al actualizar la base de datos. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // --- GUARDADO MANUAL ---
  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    
    try {
      const existe = items.find(item => item.sku === newProduct.sku);
      if (existe) {
        setErrorMsg(`El código ${newProduct.sku} ya existe en "${existe.name}". Búscalo para actualizar stock.`);
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
      setSuccessMsg(`Producto guardado con éxito.`);
      setShowAddForm(false);
      setNewProduct({ sku: '', name: '', category: '', price: '', stock: 1, size: '' });
    } catch (error: any) {
      setErrorMsg("Error al guardar el producto.");
    } finally {
      setLoading(false);
    }
  };

  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase.from('products').select('*').order('name');
      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      setErrorMsg(error.message || "Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const openManualForm = () => {
    setIsScanning(false);
    setErrorMsg("");
    setSuccessMsg("");
    setNewProduct({ sku: '', name: '', category: '', price: '', stock: 1, size: '' });
    setShowAddForm(true);
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
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentItems = filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-slate-100 text-slate-900 font-sans">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-slate-800">
          <Package className="text-blue-600 h-8 w-8"/> 
          Inventario
        </h2>
        
        <div className="flex flex-col md:flex-row w-full md:w-auto gap-3">
          <button 
            onClick={openManualForm}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-5 py-4 md:py-3 rounded-xl border-2 border-slate-800 bg-slate-800 text-white font-bold hover:bg-slate-700 shadow-md active:scale-95 transition"
          >
            <PenSquare size={22}/>
            Ingreso Manual
          </button>

          <button 
            onClick={() => {
              setIsScanning(true);
              setShowAddForm(false);
            }}
            className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 md:py-3 rounded-xl font-bold transition shadow-lg active:scale-95 bg-blue-600 text-white hover:bg-blue-700 border-2 border-blue-700"
          >
            <ScanBarcode size={24}/>
            Escanear Código
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA */}
      <div className="mb-6 relative shadow-sm rounded-xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-6 w-6 text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Buscar producto o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-12 pr-12 py-4 border-2 border-slate-300 rounded-xl bg-white placeholder-slate-500 focus:outline-none focus:ring-0 focus:border-blue-600 text-lg font-medium text-slate-900 shadow-sm"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-800"
          >
            <X size={24} />
          </button>
        )}
      </div>

      {/* ========================================== */}
      {/* MODAL DEL ESCÁNER (DISEÑO PROFESIONAL)     */}
      {/* ========================================== */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl overflow-hidden w-full max-w-md shadow-2xl border border-slate-700">
            {/* Cabecera del Modal */}
            <div className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
              <div className="flex items-center gap-2 text-white">
                <ScanBarcode className="text-blue-500" />
                <h3 className="font-bold text-lg tracking-wide">Escanear Código</h3>
              </div>
              <button 
                onClick={() => setIsScanning(false)}
                className="bg-slate-800 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Contenedor de la Cámara */}
            <div className="relative bg-black w-full aspect-square">
              {/* Aquí se inyecta el video, le quitamos cualquier estilo basura que traiga */}
              <div id="reader" className="w-full h-full [&_video]:w-full [&_video]:h-full [&_video]:object-cover border-none"></div>
              
              {/* Overlay visual para guiar al usuario */}
              <div className="absolute inset-0 pointer-events-none border-[40px] border-black/40">
                <div className="w-full h-full border-2 border-blue-500 rounded-xl relative">
                  <div className="absolute top-1/2 left-0 w-full h-0.5 bg-red-500/50 shadow-[0_0_10px_red] animate-pulse"></div>
                </div>
              </div>
            </div>

            <div className="p-5 bg-slate-900 text-center">
              <p className="text-slate-400 text-sm font-medium">Centra el código de barras en el recuadro para registrarlo automáticamente.</p>
            </div>
          </div>
        </div>
      )}

      {/* MENSAJES DE ESTADO */}
      {errorMsg && (
        <div className="bg-red-100 border-l-8 border-red-600 p-4 mb-6 rounded-r-xl shadow-md flex items-center animate-in slide-in-from-top-2">
          <AlertCircle className="h-8 w-8 text-red-600 mr-3 shrink-0" />
          <p className="text-lg font-bold text-red-900 leading-snug">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-100 border-l-8 border-green-600 p-4 mb-6 rounded-r-xl shadow-md flex items-center animate-in slide-in-from-top-2">
          <CheckCircle2 className="h-8 w-8 text-green-600 mr-3 shrink-0" />
          <p className="text-lg font-bold text-green-900 leading-snug">{successMsg}</p>
        </div>
      )}

      {/* FORMULARIO MANUAL O NUEVO PRODUCTO */}
      {showAddForm && (
        <div className="bg-white p-5 md:p-8 rounded-2xl shadow-lg border-2 border-slate-200 mb-8 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-3 mb-6 border-b-2 border-slate-100 pb-4">
            <PlusCircle className="text-blue-600 h-8 w-8" />
            <h3 className="text-2xl font-black text-slate-800">Datos del Producto</h3>
          </div>
          
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Código (SKU)</label>
              <input required type="text" value={newProduct.sku} onChange={e => setNewProduct({...newProduct, sku: e.target.value})} className="block w-full rounded-xl border-2 border-slate-300 bg-slate-50 p-4 focus:bg-white focus:border-blue-600 focus:ring-0 text-lg text-slate-900 font-mono font-bold transition" placeholder="Escribe o escanea..." />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Nombre</label>
              <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="block w-full rounded-xl border-2 border-slate-300 p-4 focus:border-blue-600 focus:ring-0 text-lg text-slate-900 font-bold transition" placeholder="Ej: Playera Negra" />
            </div>
            <div>
              <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Categoría</label>
              <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="block w-full rounded-xl border-2 border-slate-300 p-4 focus:border-blue-600 focus:ring-0 text-lg text-slate-900 font-bold transition" placeholder="Ej: Ropa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Talla</label>
                <input type="text" value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} className="block w-full rounded-xl border-2 border-slate-300 p-4 focus:border-blue-600 focus:ring-0 text-lg text-slate-900 font-bold transition" placeholder="Ej: M" />
              </div>
              <div>
                <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Stock Inicial</label>
                <input required type="number" min="1" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="block w-full rounded-xl border-2 border-slate-300 p-4 focus:border-blue-600 focus:ring-0 text-lg text-slate-900 font-bold transition" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-black text-slate-700 mb-2 uppercase tracking-wide">Precio ($)</label>
              <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="block w-full rounded-xl border-2 border-slate-300 p-4 focus:border-blue-600 focus:ring-0 text-lg text-slate-900 font-bold transition" placeholder="0.00" />
            </div>
            
            <div className="md:col-span-2 flex flex-col-reverse md:flex-row justify-end gap-4 mt-4 pt-6 border-t-2 border-slate-100">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-6 py-4 text-slate-800 bg-slate-200 hover:bg-slate-300 rounded-xl font-black transition w-full md:w-auto text-lg">
                Cancelar
              </button>
              <button type="submit" className="px-8 py-4 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-black shadow-lg transition w-full md:w-auto text-lg">
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ESTADO DE CARGA */}
      {loading && (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600"></div>
        </div>
      )}

      {/* LISTADO DE PRODUCTOS */}
      {!loading && (
        <>
          {/* MÓVIL */}
          <div className="flex flex-col gap-5 md:hidden">
            {currentItems.map((item) => (
              <div key={item.id} className="bg-white p-6 rounded-2xl shadow-md border-2 border-slate-200 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-3">
                  <h3 className="font-black text-slate-900 text-xl leading-tight flex-1">
                    {item.name}
                  </h3>
                  <span className="text-2xl font-black text-emerald-600 tracking-tight shrink-0">
                    ${item.price}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-base text-slate-700 font-mono font-bold bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
                    SKU: {item.sku}
                  </p>
                  {item.size && (
                    <span className="text-base text-slate-700 font-bold border-2 border-slate-200 px-3 py-1.5 rounded-lg">
                      Talla: {item.size}
                    </span>
                  )}
                </div>

                <div className="pt-4 mt-2 border-t-2 border-slate-100 flex justify-between items-center">
                   <div className="flex items-center gap-2 text-slate-600 font-bold text-base">
                     <Tag size={18}/> 
                     <span className="truncate max-w-[120px]">{item.category || 'General'}</span>
                   </div>
                   
                   <div className={`px-4 py-2 rounded-xl font-black text-base shadow-sm border-2 ${
                     item.stock < 5 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'
                   }`}>
                      STOCK: {item.stock}
                   </div>
                </div>
              </div>
            ))}
            
            {currentItems.length === 0 && (
              <div className="text-center py-12 bg-white rounded-2xl border-2 border-slate-200 shadow-sm">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <p className="text-slate-500 font-bold text-xl">No hay productos.</p>
              </div>
            )}
          </div>

          {/* ESCRITORIO */}
          <div className="hidden md:block bg-white shadow-md rounded-2xl overflow-hidden border-2 border-slate-200">
            <table className="min-w-full divide-y-2 divide-slate-200">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-6 py-5 text-left text-sm font-black text-slate-600 uppercase tracking-widest">Producto</th>
                  <th className="px-6 py-5 text-left text-sm font-black text-slate-600 uppercase tracking-widest">SKU</th>
                  <th className="px-6 py-5 text-left text-sm font-black text-slate-600 uppercase tracking-widest">Categoría</th>
                  <th className="px-6 py-5 text-left text-sm font-black text-slate-600 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-5 text-right text-sm font-black text-slate-600 uppercase tracking-widest">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-5">
                      <div className="text-lg font-bold text-slate-900">{item.name}</div>
                      {item.size && <div className="text-sm font-bold text-slate-500 mt-1">Talla: {item.size}</div>}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-base text-slate-700 font-mono font-bold">
                      {item.sku}
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className="px-3 py-1.5 text-sm rounded-lg bg-slate-100 text-slate-800 font-bold border border-slate-300">
                          {item.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap">
                      <span className={`px-4 py-2 text-sm rounded-xl font-black border-2 ${
                        item.stock < 5 ? 'bg-red-50 text-red-700 border-red-300' : 'bg-green-50 text-green-700 border-green-300'
                      }`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-5 whitespace-nowrap text-xl text-emerald-600 text-right font-black">
                      ${item.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN */}
          {filteredItems.length > 0 && (
            <div className="mt-8 flex flex-col md:flex-row items-center justify-between gap-6 border-t-2 border-slate-200 pt-8 pb-8">
              <div className="text-base font-bold text-slate-600">
                Mostrando <span className="font-black text-slate-900">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-black text-slate-900">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> de <span className="font-black text-slate-900">{filteredItems.length}</span>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-1 md:flex-none flex justify-center p-4 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-50 font-black transition active:scale-95"
                >
                  <ChevronLeft size={24} />
                </button>
                <span className="text-base font-black text-slate-900 px-4 text-center whitespace-nowrap">
                  Pág {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1 md:flex-none flex justify-center p-4 rounded-xl border-2 border-slate-300 bg-white text-slate-800 hover:bg-slate-100 disabled:opacity-50 font-black transition active:scale-95"
                >
                  <ChevronRight size={24} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}