'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { Package, Search, Tag, AlertCircle } from 'lucide-react';

export default function Inventario() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    try {
      // Solicitamos datos a la tabla 'products'
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name'); // Ordenar por nombre

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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl md:text-3xl font-bold flex items-center gap-2 text-gray-800">
            <Package className="text-blue-600"/> 
            <span className="hidden md:inline">Inventario de</span> Productos
        </h2>
        <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded border border-blue-400">
          {items.length} Items
        </span>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">Error: {errorMsg}</p>
              <p className="text-xs text-red-500 mt-1">Revisa que la tabla 'products' tenga RLS desactivado o políticas públicas.</p>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* --- VISTA MÓVIL (TARJETAS) --- */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {items.map((item) => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow border border-gray-100 flex flex-col gap-2">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{item.name}</h3>
                    <p className="text-xs text-gray-500 font-mono">SKU: {item.sku}</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">${item.price}</span>
                </div>
                
                <div className="flex gap-2 mt-2">
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded flex items-center gap-1">
                    <Tag size={12}/> {item.category || 'General'}
                  </span>
                  {item.size && (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded border border-gray-200">
                      Talla: {item.size}
                    </span>
                  )}
                </div>

                <div className="mt-2 pt-2 border-t border-gray-50 flex justify-between items-center">
                   <span className="text-xs text-gray-400">Stock disponible:</span>
                   <span className={`px-3 py-1 text-sm rounded-full font-bold ${item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                      {item.stock} un.
                   </span>
                </div>
              </div>
            ))}
          </div>

          {/* --- VISTA ESCRITORIO (TABLA) --- */}
          <div className="hidden md:block bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Producto</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">SKU</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Categoría</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Stock</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Precio</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                      {item.size && <div className="text-xs text-gray-400">Talla: {item.size}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{item.sku}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800">
                          {item.category || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full font-bold ${item.stock < 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                        {item.stock}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700 text-right font-bold">
                      ${item.price}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}