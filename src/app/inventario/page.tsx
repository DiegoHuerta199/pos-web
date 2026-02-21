'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase'; // Asegúrate de que esta ruta sea correcta
import { Package, Tag, AlertCircle, ScanBarcode, X, CheckCircle2 } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isScanning, setIsScanning] = useState(false);

  // Cargar productos al iniciar
  useEffect(() => {
    fetchProducts();
  }, []);

  // --- LÓGICA DEL ESCÁNER (Corrección Cámara Trasera) ---
  useEffect(() => {
    let scanner: any;
    
    if (isScanning) {
      // Configuración del escáner
      const config = { 
        fps: 10, 
        qrbox: { width: 250, height: 150 },
        // 👇 ESTO FUERZA LA CÁMARA TRASERA 👇
        videoConstraints: {
          facingMode: "environment" 
        }
      };

      scanner = new Html5QrcodeScanner("reader", config, false);

      scanner.render(
        async (decodedText: string) => {
          // Éxito al leer
          scanner.clear(); 
          setIsScanning(false);
          await handleBarcodeScanned(decodedText);
        }, 
        (error: any) => {
          // Error de lectura continuo (ignorar)
        }
      );
    }

    // Limpieza al desmontar
    return () => {
      if (scanner) {
        scanner.clear().catch((err: any) => console.error("Error al limpiar escáner", err));
      }
    };
  }, [isScanning]);

  // --- PROCESAR EL CÓDIGO ESCANEADO ---
  const handleBarcodeScanned = async (skuScaneado: string) => {
    setErrorMsg("");
    setSuccessMsg("");
    setLoading(true);

    try {
      // 1. Buscamos el producto en la lista local
      const productoExistente = items.find(item => item.sku === skuScaneado);

      if (productoExistente) {
        // 2. Si existe, calculamos nuevo stock
        const nuevoStock = productoExistente.stock + 1;
        
        // 3. Actualizamos en Supabase
        const { error } = await supabase
          .from('products')
          .update({ stock: nuevoStock })
          .eq('id', productoExistente.id);

        if (error) throw error;

        // 4. Actualizamos el estado local (para verlo al instante)
        setItems(prevItems => 
          prevItems.map(item => 
            item.id === productoExistente.id ? { ...item, stock: nuevoStock } : item
          )
        );

        setSuccessMsg(`¡Éxito! Stock de "${productoExistente.name}" actualizado a ${nuevoStock}.`);
      } else {
        // Código no encontrado
        setErrorMsg(`El código "${skuScaneado}" no está registrado en el sistema.`);
      }
    } catch (error: any) {
      console.error('Error:', error);
      setErrorMsg("Error al actualizar el inventario. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // --- CARGAR DATOS DE SUPABASE ---
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
    <div className="p-4 max-w-7xl mx-auto min-h-screen bg-gray-50/50">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-800">
          <Package className="text-blue-600"/> 
          <span className="hidden md:inline">Inventario de</span> Productos
        </h2>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Botón Escanear */}
          <button 
            onClick={() => setIsScanning(!isScanning)}
            className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold transition shadow-sm ${
              isScanning 
                ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {isScanning ? <X size={20}/> : <ScanBarcode size={20}/>}
            {isScanning ? 'Cerrar Cámara' : 'Escanear'}
          </button>
          
          <span className="bg-white text-gray-600 text-sm font-semibold px-3 py-2 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">
            Total: {items.length}
          </span>
        </div>
      </div>

      {/* ZONA DE CÁMARA */}
      {isScanning && (
        <div className="mb-6 bg-black rounded-xl overflow-hidden shadow-2xl border-4 border-gray-800 animate-in fade-in zoom-in-95 duration-300">
          <div id="reader" className="w-full max-w-md mx-auto"></div>
          <p className="text-white/80 text-center p-3 text-sm font-medium bg-gray-900">
            Enfoca el código de barras
          </p>
        </div>
      )}

      {/* MENSAJES DE ESTADO */}
      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-3" />
            <p className="text-sm font-medium text-red-800">{errorMsg}</p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg shadow-sm animate-in slide-in-from-top-2">
          <div className="flex items-center">
            <CheckCircle2 className="h-5 w-5 text-green-500 mr-3" />
            <p className="text-sm font-medium text-green-800">{successMsg}</p>
          </div>
        </div>
      )}

      {/* LISTADO DE PRODUCTOS */}
      {loading && !isScanning ? (
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* MÓVIL: TARJETAS */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-3">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{item.name}</h3>
                    <p className="text-xs text-gray-500 font-mono mt-1 bg-gray-100 inline-block px-1 rounded">
                      {item.sku}
                    </p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">${item.price}</span>
                </div>
                
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="bg-gray-100 px-2 py-1 rounded flex items-center gap-1">
                    <Tag size={12}/> {item.category || 'General'}
                  </span>
                  {item.size && (
                    <span className="border border-gray-200 px-2 py-1 rounded">
                      Talla: {item.size}
                    </span>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-100 flex justify-between items-center">
                   <span className="text-sm text-gray-500">Stock:</span>
                   <span className={`px-3 py-1 text-sm rounded-full font-bold shadow-sm ${
                     item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                   }`}>
                      {item.stock} un.
                   </span>
                </div>
              </div>
            ))}
          </div>

          {/* ESCRITORIO: TABLA */}
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
                      {item.size && <div className="text-xs text-gray-500 mt-0.5">Talla: {item.size}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {item.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-700 font-medium border border-gray-200">
                          {item.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-xs rounded-full font-bold ${
                        item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right font-bold">
                      ${item.price}
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                      No hay productos registrados.
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