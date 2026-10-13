import React from 'react';
import {
  User,
  LogOut,
  LogIn,
  PlusCircle,
  FileSpreadsheet,
  Download,
  Activity,
  ListFilter,
  History,
  Trash2,
  Users,
  Car
} from 'lucide-react';
import type { SesionConteo } from '../types/conteo';

interface NavbarProps {
  usuarioActual: string | null;
  sesionActiva: SesionConteo | null;
  totalEventos: number;
  totalEnPapelera?: number;
  vistaActiva: 'conteo' | 'eventos' | 'historial' | 'papelera';
  onCambiarVista: (vista: 'conteo' | 'eventos' | 'historial' | 'papelera') => void;
  onAbrirAuth: () => void;
  onCerrarSesion: () => void;
  onAbrirNuevaSesion: () => void;
  onExportarXLSX?: () => void;
  onExportarCSV?: () => void;
  sesionesActivasCount?: number;
  onAbrirUnirseOVerSesiones?: () => void;
  moduloActivo?: 'vial' | 'universitario';
  onCambiarModulo?: (modulo: 'vial' | 'universitario') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  usuarioActual,
  sesionActiva,
  totalEventos,
  totalEnPapelera,
  vistaActiva,
  onCambiarVista,
  onAbrirAuth,
  onCerrarSesion,
  onAbrirNuevaSesion,
  onExportarXLSX,
  onExportarCSV,
  sesionesActivasCount = 0,
  onAbrirUnirseOVerSesiones,
  moduloActivo = 'vial',
  onCambiarModulo
}) => {
  const participantes = sesionActiva
    ? (sesionActiva.participantes && sesionActiva.participantes.length > 0
        ? sesionActiva.participantes
        : [sesionActiva.usuario])
    : [];

  return (
    <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-slate-800/80 text-slate-100 pt-safe shadow-lg shadow-black/20">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col gap-2">
        {/* Top bar: Brand + Switcher de Módulo + Session info + User actions */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Logo AC Uniguajira */}
            <div className="relative group shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 via-sky-600 to-emerald-500 flex items-center justify-center font-black text-white text-xs shadow-md shadow-sky-950/50 border border-white/20">
                AC
              </div>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black tracking-tight text-sm sm:text-base text-white">
                  Aforo & Conteo
                </span>

                {/* Switcher de Módulos (Vial vs Universitario) */}
                {onCambiarModulo ? (
                  <div className="inline-flex items-center p-0.5 rounded-xl bg-slate-900 border border-slate-800 text-[11px] shadow-inner">
                    <button
                      type="button"
                      onClick={() => onCambiarModulo('vial')}
                      className={`touch-btn flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        moduloActivo === 'vial'
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Car className="w-3 h-3" />
                      <span>Vial</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onCambiarModulo('universitario')}
                      className={`touch-btn flex items-center gap-1 px-2 py-0.5 rounded-lg font-bold transition cursor-pointer ${
                        moduloActivo === 'universitario'
                          ? 'bg-emerald-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Users className="w-3 h-3" />
                      <span>Universitario</span>
                    </button>
                  </div>
                ) : (
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 shrink-0">
                    Módulo Vial
                  </span>
                )}

                <span className="hidden xl:inline text-[10px] text-slate-400 bg-slate-900/90 border border-slate-800 px-2.5 py-0.5 rounded-full">
                  Docente Aforo Vial: <strong className="text-blue-300">Marlyn Aaron</strong>
                </span>
              </div>

              {sesionActiva ? (
                <div className="flex flex-col gap-0.5 min-w-0 mt-0.5">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-[200px] sm:max-w-md">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="font-bold text-slate-200 truncate">{sesionActiva.nombre}</span>
                    {sesionActiva.ubicacion && (
                      <span className="hidden lg:inline text-[11px] text-slate-500 truncate">
                        • {sesionActiva.ubicacion}
                      </span>
                    )}
                  </div>

                  {/* Participantes actuales del equipo */}
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 flex-wrap">
                    <Users className="w-3 h-3 text-emerald-400 shrink-0" />
                    <span className="text-slate-400 font-medium">Equipo ({participantes.length}):</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {participantes.map((p) => {
                        const esYo = usuarioActual && p.toLowerCase() === usuarioActual.toLowerCase();
                        return (
                          <span
                            key={p}
                            title={p}
                            className={`px-1.5 py-0.2 rounded text-[10px] font-semibold border ${
                              esYo
                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                : 'bg-slate-800/80 text-slate-300 border-slate-700/80'
                            }`}
                          >
                            {p.split('@')[0]} {esYo && '(tú)'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-wrap mt-0.5">
                  <span className="text-xs text-slate-500">Sin sesión activa</span>
                  {sesionesActivasCount > 0 && (
                    <button
                      type="button"
                      onClick={onAbrirUnirseOVerSesiones}
                      className="touch-btn flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/40 text-emerald-300 text-[11px] font-bold transition shadow-sm shadow-emerald-500/10 cursor-pointer animate-pulse"
                      title="Haz clic para unirte a una sesión activa del equipo"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                      <span>
                        {sesionesActivasCount} {sesionesActivasCount === 1 ? 'sesión activa' : 'sesiones activas'} del equipo — Unirse
                      </span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Acciones de usuario y controles de cabecera */}
          <div className="flex items-center gap-2 shrink-0">
            {!sesionActiva && sesionesActivasCount > 0 && (
              <button
                type="button"
                onClick={onAbrirUnirseOVerSesiones}
                className="touch-btn hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 shadow-sm transition cursor-pointer"
              >
                <Users className="w-3.5 h-3.5" />
                <span>Unirse al equipo ({sesionesActivasCount})</span>
              </button>
            )}

            <button
              onClick={onAbrirNuevaSesion}
              className="touch-btn hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-md shadow-emerald-950/40 transition cursor-pointer active:scale-95"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Nueva Sesión</span>
            </button>

            {sesionActiva && (
              <div className="hidden md:flex items-center gap-1">
                {onExportarXLSX && (
                  <button
                    onClick={onExportarXLSX}
                    title="Exportar reporte XLSX"
                    className="touch-btn p-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 flex items-center gap-1 cursor-pointer transition"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>XLSX</span>
                  </button>
                )}
                {onExportarCSV && (
                  <button
                    onClick={onExportarCSV}
                    title="Exportar CSV crudo"
                    className="touch-btn p-1.5 rounded-xl text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-800 flex items-center gap-1 cursor-pointer transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>CSV</span>
                  </button>
                )}
              </div>
            )}

            {usuarioActual ? (
              <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl px-2.5 py-1">
                <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span
                  className="hidden sm:inline text-xs text-slate-300 font-medium max-w-[110px] sm:max-w-[150px] truncate"
                  title={usuarioActual}
                >
                  {usuarioActual}
                </span>
                <button
                  onClick={onCerrarSesion}
                  title={`Cerrar sesión (${usuarioActual})`}
                  className="touch-btn text-slate-400 hover:text-red-400 cursor-pointer p-0.5 rounded transition"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onAbrirAuth}
                className="touch-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/30 cursor-pointer transition"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Acceder</span>
              </button>
            )}
          </div>
        </div>

        {/* Pestañas de navegación en Desktop (md+) */}
        <div className="hidden md:flex items-center justify-between border-t border-slate-800/80 pt-1.5">
          <nav className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={() => onCambiarVista('conteo')}
              className={`touch-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                vistaActiva === 'conteo'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <Activity className="w-4 h-4" />
              <span>Conteo en Vivo</span>
            </button>

            <button
              onClick={() => onCambiarVista('eventos')}
              className={`touch-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                vistaActiva === 'eventos'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <ListFilter className="w-4 h-4" />
              <span>Eventos</span>
              <span className="font-tabular px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300">
                {totalEventos}
              </span>
            </button>

            <button
              onClick={() => onCambiarVista('historial')}
              className={`touch-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                vistaActiva === 'historial'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
              }`}
            >
              <History className="w-4 h-4" />
              <span>Sesiones</span>
              {sesionesActivasCount > 0 && (
                <span className="font-tabular px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {sesionesActivasCount} activas
                </span>
              )}
            </button>

            <button
              onClick={() => onCambiarVista('papelera')}
              className={`touch-btn flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition cursor-pointer ${
                vistaActiva === 'papelera'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-600/20'
                  : 'text-slate-400 hover:text-rose-300 hover:bg-slate-900'
              }`}
            >
              <Trash2 className="w-4 h-4" />
              <span>Papelera</span>
              {typeof totalEnPapelera === 'number' && totalEnPapelera > 0 && (
                <span className="font-tabular px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500/30 text-rose-300 border border-rose-500/40">
                  {totalEnPapelera}
                </span>
              )}
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
