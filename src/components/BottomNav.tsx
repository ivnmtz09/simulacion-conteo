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

  // Distribución: 2 tabs | FAB central | 2 tabs
  const leftTabs  = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);

  const renderTab = (tab: TabItem) => {
    const isActive = vistaActiva === tab.id;
    const isDanger = tab.danger;
    const activeColor = isDanger ? 'text-rose-400' : 'text-blue-400';
    const activeBg   = isDanger ? 'bg-rose-500/15' : 'bg-blue-500/15';

    return (
      <button
        key={tab.id}
        onClick={() => onCambiarVista(tab.id)}
        className={`touch-btn relative flex flex-col items-center justify-center gap-0.5 flex-1 py-2 min-h-[52px] rounded-xl transition-all ${
          isActive
            ? `${activeColor} ${activeBg} font-semibold`
            : 'text-slate-500 hover:text-slate-300'
        }`}
        aria-current={isActive ? 'page' : undefined}
      >
        <div className="relative">
          <tab.icon className="w-5 h-5" />
          {tab.badge !== undefined && (
            <span
              className={`absolute -top-1.5 -right-2 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-black flex items-center justify-center ${
                isDanger
                  ? 'bg-rose-500 text-white'
                  : 'bg-blue-500 text-white'
              }`}
            >
              {tab.badge > 99 ? '99+' : tab.badge}
            </span>
          )}
        </div>
        <span className="text-[10px] leading-none">{tab.label}</span>
        {isActive && (
          <span
            className={`absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b-full ${
              isDanger ? 'bg-rose-400' : 'bg-blue-400'
            }`}
          />
        )}
      </button>
    );
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      aria-label="Navegación principal"
    >
      <div className="flex items-center px-1 pt-1 pb-1">
        {/* Tabs izquierdos */}
        {leftTabs.map(renderTab)}

        {/* FAB central — Nueva Sesión */}
        <div className="flex flex-col items-center justify-center flex-shrink-0 px-1 sm:px-2">
          <button
            onClick={onAbrirNuevaSesion}
            className="touch-btn flex flex-col items-center justify-center w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/40 transition-all active:scale-90"
            aria-label="Nueva sesión de conteo"
          >
            <PlusCircle className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[9px] font-bold mt-0.5 leading-none">Nueva</span>
          </button>
        </div>

        {/* Tabs derechos */}
        {rightTabs.map(renderTab)}
      </div>
    </nav>
  );
};
