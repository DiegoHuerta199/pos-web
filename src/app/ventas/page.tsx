'use client';
import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { TrendingUp, CreditCard, Calendar } from 'lucide-react';

export default function Ventas() {
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  async function fetchSales() {
    const { data, error } = await supabase
      .from('sales')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (error) console.error('Error cargando ventas:', error);
    else setSales(data || []);
    setLoading(false);
  }

  // Calcular total
  const totalIngresos = sales.reduce((acc, curr) => acc + (Number(curr.total) || 0), 0);

  return (
    <div>
      <h2 className="text-2xl md:text-3xl font-bold mb-6 flex items-center gap-2 text-gray-800">
        <TrendingUp className="text-green-600"/> Ventas
      </h2>

      {loading ? (
        <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
           {/* Resumen Card (Siempre visible) */}
           <div className="bg-white p-5 rounded-xl shadow-sm border-l-4 border-green-500 flex justify-between items-center">
              <div>
                  <p className="text-gray-500 text-xs md:text-sm uppercase font-bold tracking-wide">Total Ingresos</p>
                  <p className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">
                    ${totalIngresos.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full text-green-600">
                  <TrendingUp size={24} />
              </div>
           </div>

           {/* --- VISTA MÓVIL --- */}
           <div className="grid grid-cols-1 gap-3 md:hidden">
              {sales.map((sale) => (
                <div key={sale.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-gray-400 font-mono">#{sale.id}</span>
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Calendar size={12}/> {new Date(sale.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex justify-between items-end">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <CreditCard size={16}/>
                      <span className="capitalize">{sale.payment_method}</span>
                    </div>
                    <span className="text-xl font-bold text-gray-900">${Number(sale.total).toFixed(2)}</span>
                  </div>
                </div>
              ))}
           </div>

           {/* --- VISTA ESCRITORIO --- */}
           <div className="hidden md:block bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">ID</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Fecha</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Método Pago</th>
                  <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">#{sale.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {new Date(sale.created_at).toLocaleDateString()} <span className="text-xs text-gray-400">{new Date(sale.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <div className="flex items-center gap-2">
                            <CreditCard size={14} className="text-gray-400"/>
                            <span className="capitalize">{sale.payment_method}</span>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-gray-900">
                        ${Number(sale.total).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}