'use client'; // Importante para manejar el estado del login y del menú
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { useState, useEffect } from "react";
// 1. IMPORTAMOS LOS ICONOS NUEVOS (Menu, X)
import { Lock, User, Menu, X } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  
  // 2. NUEVO ESTADO PARA EL MENÚ MÓVIL
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Comprobar si ya inició sesión antes
  useEffect(() => {
    const session = localStorage.getItem("pos_session");
    if (session === "active") setIsLoggedIn(true);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "1234") {
      setIsLoggedIn(true);
      localStorage.setItem("pos_session", "active");
      setError("");
    } else {
      setError("Usuario o contraseña incorrectos");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem("pos_session");
    // También cerramos el menú móvil por si acaso
    setIsMobileMenuOpen(false);
  };

  return (
    <html lang="es">
      <body className={inter.className + " bg-gray-50 text-gray-900"}>
        {!isLoggedIn ? (
          // --- PANTALLA DE LOGIN ---
          <div className="flex min-h-screen items-center justify-center bg-slate-900">
            <div className="bg-white p-8 rounded-lg shadow-xl w-96">
              <div className="flex justify-center mb-6">
                <div className="p-4 bg-blue-100 rounded-full text-blue-600">
                  <Lock size={32} />
                </div>
              </div>
              <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Acceso POS</h2>
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Usuario</label>
                  <input 
                    type="text" 
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-1 block w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Usuario"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Contraseña</label>
                  <input 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full p-2 border rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="••••••"
                  />
                </div>
                {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 transition">
                  Ingresar
                </button>
              </form>
            </div>
          </div>
        ) : (
          // --- SISTEMA PRINCIPAL ---
          <div className="flex min-h-screen relative"> {/* relative es importante aquí */}
            
            {/* --- SIDEBAR DE ESCRITORIO (Se oculta en md) --- */}
            <aside className="w-64 bg-slate-900 text-white p-6 hidden md:flex flex-col justify-between h-screen sticky top-0">
              <div>
                <h1 className="text-2xl font-bold mb-8 text-blue-400">POS Web</h1>
                <nav className="space-y-2">
                  <Link href="/" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 transition">📊 Dashboard</Link>
                  <Link href="/ventas" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 transition">💰 Ventas</Link>
                  <Link href="/inventario" className="flex items-center gap-3 p-3 rounded hover:bg-slate-800 transition">📦 Productos</Link>
                </nav>
              </div>
              <button onClick={handleLogout} className="flex items-center gap-2 p-3 text-red-300 hover:text-red-100 transition">
                <User size={18} /> Cerrar Sesión
              </button>
            </aside>
            
            <div className="flex-1 flex flex-col h-screen overflow-auto">
              
              {/* --- HEADER MÓVIL CON HAMBURGUESA (Se muestra solo en md o menor) --- */}
              <header className="bg-white shadow p-4 md:hidden relative z-50">
                <div className="flex justify-between items-center">
                    {/* Botón Hamburguesa / Cerrar */}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="p-2 text-slate-700 hover:bg-slate-100 rounded focus:outline-none"
                    >
                        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>

                    <span className="font-bold text-blue-600 text-lg">POS Web</span>
                    
                    {/* Botón Salir Móvil (Icono pequeño para ahorrar espacio) */}
                    <button onClick={handleLogout} className="text-red-500 p-2 hover:bg-red-50 rounded">
                        <User size={20} />
                    </button>
                </div>

                {/* --- MENÚ DESPLEGABLE MÓVIL --- */}
                {isMobileMenuOpen && (
                    <nav className="absolute top-full left-0 w-full bg-slate-900 text-white shadow-xl flex flex-col border-t border-slate-700 animate-in slide-in-from-top-2">
                        <Link 
                            href="/" 
                            onClick={() => setIsMobileMenuOpen(false)} // Cierra menú al hacer click
                            className="p-4 border-b border-slate-700 hover:bg-slate-800 flex items-center gap-3"
                        >
                            📊 Dashboard
                        </Link>
                        <Link 
                            href="/ventas" 
                            onClick={() => setIsMobileMenuOpen(false)} 
                            className="p-4 border-b border-slate-700 hover:bg-slate-800 flex items-center gap-3"
                        >
                            💰 Ventas
                        </Link>
                        <Link 
                            href="/inventario" 
                            onClick={() => setIsMobileMenuOpen(false)} 
                            className="p-4 border-b border-slate-700 hover:bg-slate-800 flex items-center gap-3"
                        >
                            📦 Productos
                        </Link>
                        <button 
                            onClick={handleLogout}
                            className="p-4 text-red-300 hover:bg-slate-800 text-left flex items-center gap-3"
                        >
                            🚪 Cerrar Sesión
                        </button>
                    </nav>
                )}
              </header>

              {/* Contenido principal */}
              <main className="flex-1 p-4 md:p-8">
                {children}
              </main>
            </div>
          </div>
        )}
      </body>
    </html>
  );
}