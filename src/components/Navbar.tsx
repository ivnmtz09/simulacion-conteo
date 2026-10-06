import React from 'react';
import { User, LogOut, LogIn, PlusCircle, FileSpreadsheet, Download, Activity, ListFilter, History } from 'lucide-react';
import type { SesionConteo } from '../types/conteo';

interface NavbarProps {
  usuarioActual: string | null;
  sesionActiva: SesionConteo | null;
  totalEventos: number;
  vistaActiva: 'conteo' | 'eventos' | 'historial';
  onCambiarVista: (vista: 'conteo' | 'eventos' | 'historial') => void;
  onAbrirAuth: () => void;
  onCerrarSesion: () => void;
  onAbrirNuevaSesion: () => void;
  onExportarXLSX?: () => void;
  onExportarCSV?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  usuarioActual,
  sesionActiva,
  totalEventos,
  vistaActiva,
  onCambiarVista,
  onAbrirAuth,
  onCerrarSesion,
  onAbrirNuevaSesion,
  onExportarXLSX,
  onExportarCSV
}) => {
  return (
    <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 text-slate-100 pt-safe">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col gap-2">
        {/* Top bar: Brand + User actions */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center font-black text-white text-base shadow-sm">
              AV
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold tracking-tight text-sm sm:text-base text-white">
                  Aforo Vial
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  PTV Vissim
                </span>
              </div>
              {sesionActiva ? (
                <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-medium text-slate-200 truncate">{sesionActiva.nombre}</span>
                </div>
              ) : (
                <span className="text-xs text-slate-500">Sin sesión activa</span>
              )}
            </div>
          </div>

          {/* User profile & session action */}
          <div className="flex items-center gap-2">
            <button
              onClick={onAbrirNuevaSesion}
              className="touch-btn hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm transition"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Nueva Sesión
            </button>

            {sesionActiva && (
              <div className="hidden md:flex items-center gap-1">
                {onExportarXLSX && (
                  <button
                    onClick={onExportarXLSX}
                    title="Exportar reporte XLSX"
                    className="touch-btn p-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>XLSX</span>
                  </button>
                )}
                {onExportarCSV && (
                  <button
                    onClick={onExportarCSV}
                    title="Exportar CSV crudo"
                    className="touch-btn p-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 flex items-center gap-1"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                )}
              </div>
            )}

            {usuarioActual ? (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700 rounded-lg px-2.5 py-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-300 font-medium max-w-[110px] sm:max-w-[150px] truncate" title={usuarioActual}>
                  {usuarioActual}
                </span>
                <button
                  onClick={onCerrarSesion}
                  title="Cerrar sesión"
                  className="touch-btn text-slate-400 hover:text-red-400 ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAbrirAuth}
                className="touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white shadow-sm"
              >
                <LogIn className="w-3.5 h-3.5" />
                Acceder
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
          <nav className="flex items-center gap-1 sm:gap-2">
            <button
              onClick={() => onCambiarVista('conteo')}
              className={`touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                vistaActiva === 'conteo'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Conteo en Vivo</span>
            </button>

            <button
              onClick={() => onCambiarVista('eventos')}
              className={`touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                vistaActiva === 'eventos'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Eventos</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                {totalEventos}
              </span>
            </button>

            <button
              onClick={() => onCambiarVista('historial')}
              className={`touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-semibold transition ${
                vistaActiva === 'historial'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Sesiones</span>
            </button>
          </nav>

          <button
            onClick={onAbrirNuevaSesion}
            className="touch-btn sm:hidden flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-600 text-white"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Nueva</span>
          </button>
        </div>
      </div>
    </header>
  );
};
