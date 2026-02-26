'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { 
  Package, Tag, AlertCircle, ScanBarcode, X, CheckCircle2, 
  PlusCircle, Search, ChevronLeft, ChevronRight 
} from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
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

  // --- LÓGICA DEL ESCÁNER ---
  useEffect(() => {
    let scanner: Html5QrcodeScanner | null = null;
    
    if (isScanning) {
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
          setIsScanning(false);
          await handleBarcodeScanned(decodedText);
        }, 
        (error: any) => {}
      );
    }

    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error("Error al limpiar", err));
      }
    };
  }, [isScanning]);

  const handleBarcodeScanned = async (skuScaneado: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setShowAddForm(false);
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

        setItems(prevItems => 
          prevItems.map(item => 
            item.id === productoExistente.id ? { ...item, stock: nuevoStock } : item
          )
        );
        setSearchTerm(skuScaneado);
        setSuccessMsg(`Stock de "${productoExistente.name}" actualizado a ${nuevoStock}.`);
      } else {
        setNewProduct(prev => ({ ...prev, sku: skuScaneado }));
        setShowAddForm(true);
        setErrorMsg(`Código nuevo: "${skuScaneado}". Regístralo abajo.`);
      }
    } catch (error: any) {
      setErrorMsg("Error al actualizar. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");
    
    try {
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
      setSuccessMsg(`"${data.name}" agregado con éxito.`);
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto min-h-screen bg-slate-50 text-slate-900 font-sans">
      
      {/* HEADER MÓVIL Y DESKTOP */}
      <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-black flex items-center gap-2 text-slate-800">
          <Package className="text-blue-600 h-8 w-8"/> 
          Inventario
        </h2>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
          <span className="bg-white text-slate-700 text-sm font-bold px-4 py-3 sm:py-2.5 rounded-xl border border-slate-200 shadow-sm text-center">
            Total: {items.length} productos
          </span>

          <button 
            onClick={() => {
              setIsScanning(!isScanning);
              setShowAddForm(false);
            }}
            className={`flex items-center justify-center gap-2 px-5 py-3.5 sm:py-2.5 rounded-xl font-bold transition shadow-md active:scale-95 ${
              isScanning 
                ? 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isScanning ? <X size={22}/> : <ScanBarcode size={22}/>}
            {isScanning ? 'Cerrar Cámara' : 'Escanear Código'}
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA (Optimizada para dedos) */}
      <div className="mb-6 relative shadow-sm rounded-xl">
        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <input
          type="text"
          placeholder="Buscar por nombre o SKU..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="block w-full pl-11 pr-12 py-3.5 border-2 border-slate-200 rounded-xl leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-0 focus:border-blue-600 text-base md:text-sm font-medium text-slate-800 transition-colors"
        />
        {searchTerm && (
          <button 
            onClick={() => setSearchTerm("")}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-slate-400 hover:text-slate-700 active:scale-90"
          >
            <X size={20} />
          </button>
        )}
      </div>

      {/* ZONA DE CÁMARA */}
      {isScanning && (
        <div className="mb-6 bg-slate-900 rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-800 animate-in fade-in zoom-in-95 duration-300">
          <div id="reader" className="w-full max-w-md mx-auto [&_video]:object-cover"></div>
          <p className="text-white text-center p-4 text-sm font-bold bg-slate-950 tracking-wide">
            ENFOCA EL CÓDIGO DE BARRAS
          </p>
        </div>
      )}

      {/* MENSAJES (Colores fuertes y legibles) */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-600 p-4 mb-6 rounded-r-xl shadow-sm flex items-start">
          <AlertCircle className="h-6 w-6 text-red-600 mr-3 shrink-0 mt-0.5" />
          <p className="text-base font-semibold text-red-900 leading-snug">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-600 p-4 mb-6 rounded-r-xl shadow-sm flex items-start">
          <CheckCircle2 className="h-6 w-6 text-green-600 mr-3 shrink-0 mt-0.5" />
          <p className="text-base font-semibold text-green-900 leading-snug">{successMsg}</p>
        </div>
      )}

      {/* FORMULARIO */}
      {showAddForm && (
        <div className="bg-white p-5 md:p-6 rounded-2xl shadow-md border border-slate-200 mb-6 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-5 border-b border-slate-100 pb-4">
            <PlusCircle className="text-blue-600 h-6 w-6" />
            <h3 className="text-xl font-black text-slate-800">Registrar Producto</h3>
          </div>
          
          <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Código (SKU)</label>
              <input type="text" disabled value={newProduct.sku} className="block w-full rounded-xl border-slate-200 bg-slate-100 shadow-inner p-3.5 text-slate-500 font-mono text-base font-medium" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Nombre</label>
              <input required type="text" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="block w-full rounded-xl border-2 border-slate-200 shadow-sm p-3.5 focus:border-blue-600 focus:ring-0 text-base text-slate-900 font-medium" placeholder="Ej: Playera Negra" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-1">Categoría</label>
              <input type="text" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} className="block w-full rounded-xl border-2 border-slate-200 shadow-sm p-3.5 focus:border-blue-600 focus:ring-0 text-base text-slate-900 font-medium" placeholder="Ej: Ropa" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Talla</label>
                <input type="text" value={newProduct.size} onChange={e => setNewProduct({...newProduct, size: e.target.value})} className="block w-full rounded-xl border-2 border-slate-200 shadow-sm p-3.5 focus:border-blue-600 focus:ring-0 text-base text-slate-900 font-medium" placeholder="Ej: M" />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Stock</label>
                <input required type="number" min="1" value={newProduct.stock} onChange={e => setNewProduct({...newProduct, stock: parseInt(e.target.value)})} className="block w-full rounded-xl border-2 border-slate-200 shadow-sm p-3.5 focus:border-blue-600 focus:ring-0 text-base text-slate-900 font-medium" />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 mb-1">Precio ($)</label>
              <input required type="number" step="0.01" min="0" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="block w-full rounded-xl border-2 border-slate-200 shadow-sm p-3.5 focus:border-blue-600 focus:ring-0 text-base text-slate-900 font-medium" placeholder="0.00" />
            </div>
            
            <div className="md:col-span-2 flex flex-col-reverse sm:flex-row justify-end gap-3 mt-2 pt-5 border-t border-slate-100">
              <button type="button" onClick={() => setShowAddForm(false)} className="px-5 py-3.5 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl font-bold transition w-full sm:w-auto">
                Cancelar
              </button>
              <button type="submit" className="px-6 py-3.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-bold shadow-md transition w-full sm:w-auto">
                Guardar Producto
              </button>
            </div>
          </form>
        </div>
      )}

      {/* LISTADO DE PRODUCTOS */}
      {loading && !isScanning ? (
        <div className="flex justify-center items-center py-24">
          <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL: TARJETAS REDISEÑADAS */}
          <div className="grid grid-cols-1 gap-4 lg:hidden">
            {currentItems.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col gap-3 active:bg-slate-50 transition-colors">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1">
                    <h3 className="font-black text-slate-900 text-lg leading-tight">{item.name}</h3>
                    <p className="text-sm text-slate-600 font-mono mt-1.5 font-bold bg-slate-100 inline-block px-2 py-1 rounded-md">
                      SKU: {item.sku}
                    </p>
                  </div>
                  <span className="text-2xl font-black text-emerald-600 tracking-tight">${item.price}</span>
                </div>
                
                <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-600 mt-1">
                  <span className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                    <Tag size={14}/> {item.category || 'General'}
                  </span>
                  {item.size && (
                    <span className="border-2 border-slate-100 text-slate-700 px-3 py-1.5 rounded-lg">
                      Talla {item.size}
                    </span>
                  )}
                </div>

                <div className="pt-3 mt-1 border-t border-slate-100 flex justify-between items-center">
                   <span className="text-sm font-bold text-slate-500 uppercase tracking-wider">Inventario</span>
                   <span className={`px-4 py-1.5 text-sm rounded-xl font-black shadow-sm ${
                     item.stock < 5 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
                   }`}>
                      {item.stock} UNIDADES
                   </span>
                </div>
              </div>
            ))}
          </div>

          {/* VISTA ESCRITORIO: TABLA (Optimizado contraste) */}
          <div className="hidden lg:block bg-white shadow-sm rounded-2xl overflow-hidden border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Producto</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">SKU</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Categoría</th>
                  <th className="px-6 py-5 text-left text-xs font-black text-slate-500 uppercase tracking-widest">Stock</th>
                  <th className="px-6 py-5 text-right text-xs font-black text-slate-500 uppercase tracking-widest">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {currentItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-base font-bold text-slate-900">{item.name}</div>
                      {item.size && <div className="text-sm font-semibold text-slate-500 mt-1">Talla: {item.size}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-600 font-mono font-bold">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-3 py-1.5 text-xs rounded-lg bg-slate-100 text-slate-700 font-bold border border-slate-200">
                          {item.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-3 py-1.5 text-xs rounded-xl font-black ${
                        item.stock < 5 ? 'bg-red-100 text-red-700 border border-red-200' : 'bg-green-100 text-green-700 border border-green-200'
                      }`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-lg text-emerald-600 text-right font-black">
                      ${item.price}
                    </td>
                  </tr>
                ))}
                {currentItems.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-slate-500 font-medium text-lg">
                      No se encontraron resultados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* PAGINACIÓN (Botones grandes para táctil) */}
          {filteredItems.length > 0 && (
            <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200 pt-6 pb-8">
              <div className="text-sm font-semibold text-slate-500">
                Mostrando <span className="font-black text-slate-800">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> a <span className="font-black text-slate-800">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> de <span className="font-black text-slate-800">{filteredItems.length}</span>
              </div>
              
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="flex-1 sm:flex-none flex justify-center p-3 sm:px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:bg-slate-50 font-bold transition active:scale-95"
                >
                  <ChevronLeft size={22} />
                </button>
                <span className="text-sm font-black text-slate-800 px-2 text-center whitespace-nowrap">
                  Página {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="flex-1 sm:flex-none flex justify-center p-3 sm:px-4 rounded-xl border-2 border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:bg-slate-50 font-bold transition active:scale-95"
                >
                  <ChevronRight size={22} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}