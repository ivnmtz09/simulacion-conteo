import React from 'react';
import { Activity, ListFilter, History, Trash2, PlusCircle } from 'lucide-react';

interface BottomNavProps {
  vistaActiva: 'conteo' | 'eventos' | 'historial' | 'papelera';
  onCambiarVista: (vista: 'conteo' | 'eventos' | 'historial' | 'papelera') => void;
  totalEventos: number;
  totalEnPapelera?: number;
  onAbrirNuevaSesion: () => void;
}

interface TabItem {
  id: 'conteo' | 'eventos' | 'historial' | 'papelera';
  label: string;
  icon: React.FC<{ className?: string }>;
  badge?: number;
  danger?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  vistaActiva,
  onCambiarVista,
  totalEventos,
  totalEnPapelera,
  onAbrirNuevaSesion,
}) => {
  const tabs: TabItem[] = [
    { id: 'conteo',   label: 'Conteo',   icon: Activity },
    { id: 'eventos',  label: 'Eventos',  icon: ListFilter, badge: totalEventos > 0 ? totalEventos : undefined },
    { id: 'historial', label: 'Sesiones', icon: History },
    { id: 'papelera', label: 'Papelera', icon: Trash2, badge: totalEnPapelera && totalEnPapelera > 0 ? totalEnPapelera : undefined, danger: true },
  ];

  const triggerHaptic = () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(20);
      }
    } catch {
      // Ignorar si el navegador no soporta vibración
    }
  };

  const handleSelectTab = (id: 'conteo' | 'eventos' | 'historial' | 'papelera') => {
    triggerHaptic();
    onCambiarVista(id);
  };

  const handleNuevaSesion = () => {
    triggerHaptic();
    onAbrirNuevaSesion();
  };

  const leftTabs  = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);

  const renderTab = (tab: TabItem) => {
    const isActive = vistaActiva === tab.id;
    const isDanger = tab.danger;
    const activeColor = isDanger ? 'text-rose-400 font-bold' : 'text-sky-400 font-bold';
    const activeBg   = isDanger ? 'bg-rose-500/15 border-rose-500/30' : 'bg-sky-500/15 border-sky-500/30';

    return (
      <button
        key={tab.id}
        onClick={() => handleSelectTab(tab.id)}
        className={`touch-btn relative flex flex-col items-center justify-center gap-1 flex-1 py-1.5 min-h-[54px] rounded-2xl transition-all duration-150 border cursor-pointer active:scale-90 ${
          isActive
            ? `${activeColor} ${activeBg} shadow-sm`
            : 'text-slate-400 hover:text-slate-200 border-transparent hover:bg-slate-800/40'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <div className="relative">
          <tab.icon className={`w-5 h-5 transition-transform duration-150 ${isActive ? 'scale-110 drop-shadow' : ''}`} />
          {tab.badge !== undefined && (
            <span
              className={`font-tabular absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150 ${
                isDanger
                  ? 'bg-rose-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] leading-tight tracking-tight">{tab.label}</span>
        {isActive && (
          <span
            className={`absolute -bottom-0.5 left-1/2 -translate-x-1/2 h-1 w-6 rounded-full shadow-sm ${
              isDanger ? 'bg-rose-400 shadow-rose-500/50' : 'bg-sky-400 shadow-sky-500/50'
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-950/90 backdrop-blur-xl border-t border-slate-800/90 shadow-[0_-8px_30px_rgba(0,0,0,0.6)]"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2px)' }}
      aria-label="Navegación principal inferior"
    >
      <div className="flex items-center px-2 pt-1.5 pb-1 gap-1">
        {leftTabs.map(renderTab)}

        {/* FAB central — Nueva Sesión destacado */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 px-1">
          <button
            onClick={handleNuevaSesion}
            className="touch-btn flex flex-col items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white shadow-lg shadow-emerald-950/60 transition-all duration-150 active:scale-85 border border-white/20"
            aria-label="Nueva sesión de conteo"
          >
            <PlusCircle className="w-5 h-5 drop-shadow" />
            <span className="text-[9px] font-extrabold mt-0.5 leading-none">Nueva</span>
          </button>
        </div>

        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
};
