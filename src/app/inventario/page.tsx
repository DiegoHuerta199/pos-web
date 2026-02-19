'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Package, Search, Tag, AlertCircle, ScanBarcode, X, CheckCircle2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Cargar productos al montar el componente
  useEffect(() => {
    fetchProducts();
  }, []);

  // --- LÓGICA DEL ESCÁNER DE CÓDIGO DE BARRAS ---
  useEffect(() => {
    let scanner: any;
    
    if (isScanning) {
      // Configuración del escáner (cámara trasera por defecto en móviles)
      scanner = new Html5QrcodeScanner(
        "reader", 
        { 
          fps: 10, 
          qrbox: { width: 250, height: 150 },
          rememberLastUsedCamera: true
        }, 
        false
      );

      scanner.render(
        async (decodedText: string) => {
          // Cuando detecta un código exitosamente
          scanner.clear(); // Detenemos la cámara temporalmente
          setIsScanning(false);
          await handleBarcodeScanned(decodedText);
        }, 
        (errorMessage: any) => {
          // Ignoramos los errores continuos mientras busca el código
        }
      );
    }

    // Limpieza cuando se desmonta o se cierra el escáner
    return () => {
      if (scanner) {
        scanner.clear().catch(console.error);
      }
    };
  }, [isScanning]);

  // --- FUNCIÓN AL ESCANEAR UN CÓDIGO ---
  const handleBarcodeScanned = async (skuScaneado: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // 1. Buscamos si el producto ya existe en nuestro estado local
      const productoExistente = items.find(item => item.sku === skuScaneado);

      if (productoExistente) {
        // 2. Si existe, le sumamos 1 al stock en Supabase
        const nuevoStock = productoExistente.stock + 1;
        
        const { error } = await supabase
          .from('products')
          .update({ stock: nuevoStock })
          .eq('id', productoExistente.id);

        if (error) throw error;

        // 3. Actualizamos el estado local para que se vea reflejado sin recargar la página
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === productoExistente.id ? { ...item, stock: nuevoStock } : item
          )
        );

        setSuccessMsg(`¡Stock actualizado! ${productoExistente.name} ahora tiene ${nuevoStock} unidades.`);
      } else {
        // Si no existe, puedes redirigir a un formulario de "Crear Producto" 
        // pasándole el SKU por la URL, o abrir un Modal. Por ahora mostramos un mensaje.
        setErrorMsg(`Código no encontrado: ${skuScaneado}. Debes registrar este producto primero.`);
      }
    } catch (error: any) {
      console.error('Error al actualizar inventario:', error);
      setErrorMsg("Error al actualizar el stock en la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // --- FUNCIÓN PARA OBTENER PRODUCTOS ---
  async function fetchProducts() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');

      if (error) throw error;
      setItems(data || []);
    } catch (error: any) {
      console.error('Error cargando productos:', error);
      setErrorMsg(error.message || "Error al conectar con Supabase");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-4 max-w-7xl mx-auto">
      {/* --- CABECERA --- */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-800">
          <Package className="text-blue-600"/> 
          <span className="hidden md:inline">Inventario de</span> Productos
        </h2>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition shadow-sm ${
              isScanning 
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isScanning ? <X size={20}/> : <ScanBarcode size={20}/>}
            {isScanning ? 'Cancelar Escáner' : 'Escanear Código'}
          </button>
          
          <span className="bg-blue-100 text-blue-800 text-sm font-semibold px-3 py-1.5 rounded-lg border border-blue-400 whitespace-nowrap">
            {items.length} Items
          </span>
        </div>
      </div>

      {/* --- CONTENEDOR DEL ESCÁNER --- */}
      {isScanning && (
        <div className="mb-6 bg-gray-900 rounded-xl overflow-hidden shadow-2xl border border-gray-800 animate-in fade-in slide-in-from-top-4">
          {/* El div con id="reader" es donde html5-qrcode inyecta la cámara */}
          <div id="reader" className="w-full max-w-md mx-auto bg-black"></div>
          <p className="text-gray-300 text-center p-4 text-sm font-medium">
            Apunta la cámara al código de barras o código QR del producto
          </p>
        </div>
      )}

      {/* --- MENSAJES DE ALERTA --- */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-red-800">{errorMsg}</p>
            </div>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm">
          <div className="flex">
            <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
            <div className="ml-3">
              <p className="text-sm font-medium text-green-800">{successMsg}</p>
            </div>
          </div>
        </div>
      )}

      {/* --- LISTADO DE PRODUCTOS --- */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* VISTA MÓVIL (TARJETAS) */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1">SKU: {item.sku}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">${item.price}</span>
                </div>
                
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-md flex items-center gap-1 font-medium">
                    <Tag size={12}/> {item.category || 'General'}
                  </span>
                  {item.size && (
                    <span className="px-2.5 py-1 bg-gray-50 text-gray-600 text-xs rounded-md border border-gray-200">
                      Talla: {item.size}
                    </span>
                  )}
                </div>

                <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                   <span className="text-sm text-gray-500">Stock disponible:</span>
                   <span className={`px-3 py-1 text-sm rounded-full font-bold ${item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.stock} un.
                   </span>
                </div>
              </div>
            ))}
          </div>

          {/* VISTA ESCRITORIO (TABLA) */}
          <div className="hidden md:block bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Producto</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-gray-900">{item.name}</div>
                      {item.size && <div className="text-xs text-gray-500 mt-1">Talla: {item.size}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-700 font-medium">
                          {item.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                      ${item.price}
                    </td>
                  </tr>
                ))}
                
                {items.length === 0 && !loading && (
                  <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">
                      No hay productos en el inventario.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}