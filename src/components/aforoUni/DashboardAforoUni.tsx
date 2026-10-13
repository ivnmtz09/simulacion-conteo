import React, { useState, useEffect, useMemo } from 'react';
import {
  Building2,
  PlusCircle,
  StopCircle,
  FileSpreadsheet,
  Download,
  LogOut,
  Activity,
  ListFilter,
  History,
  ShieldCheck,
  DoorOpen
} from 'lucide-react';
import {
  db,
  collection,
  doc,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc
} from '../../lib/firebase';
import type {
  SesionAforoUni,
  EventoAforoUni,
  TipoTransitoUni,
  MetricasAforoUni
} from '../../types/aforoUniversitario';
import { obtenerPuertasPorBloque } from '../../types/aforoUniversitario';
import { ControlesConteoTouch } from './ControlesConteoTouch';
import { MetricasAforoCards } from './MetricasAforoCards';
import { GraficoFlujoUni } from './GraficoFlujoUni';
import { BitacoraEventosUni } from './BitacoraEventosUni';
import { NuevaSesionUniModal } from './NuevaSesionUniModal';
import { FinalizarSesionUniModal } from './FinalizarSesionUniModal';
import { HistorialSesionesUni } from './HistorialSesionesUni';
import { exportarAforoUniXLSX, exportarAforoUniCSV } from '../../lib/exportAforoUni';

interface DashboardAforoUniProps {
  usuarioActual: string;
  onCerrarSesionAuth: () => void;
}

export const DashboardAforoUni: React.FC<DashboardAforoUniProps> = ({
  usuarioActual,
  onCerrarSesionAuth
}) => {
  const [vistaActiva, setVistaActiva] = useState<'conteo' | 'bitacora' | 'historial'>('conteo');
  const [sesiones, setSesiones] = useState<SesionAforoUni[]>([]);
  const [sesionActiva, setSesionActiva] = useState<SesionAforoUni | null>(null);
  const [eventos, setEventos] = useState<EventoAforoUni[]>([]);
  const [todosLosEventos, setTodosLosEventos] = useState<EventoAforoUni[]>([]);
  const [puertaManual, setPuertaManual] = useState<string | null>(null);

  // Modales
  const [modalNuevaSesionAbierto, setModalNuevaSesionAbierto] = useState(false);
  const [modalFinalizarAbierto, setModalFinalizarAbierto] = useState(false);

  // Derivar puertas disponibles y puerta activa de la sesión activa
  const puertasDisponibles = useMemo(() => {
    return sesionActiva ? obtenerPuertasPorBloque(sesionActiva.bloque) : ['Entrada Frontal', 'Entrada Trasera'];
  }, [sesionActiva]);

  const puertaActiva = useMemo(() => {
    if (puertaManual && puertasDisponibles.includes(puertaManual)) {
      return puertaManual;
    }
    if (sesionActiva?.puertaAcceso && puertasDisponibles.includes(sesionActiva.puertaAcceso)) {
      return sesionActiva.puertaAcceso;
    }
    return puertasDisponibles[0] || 'Entrada Frontal';
  }, [puertaManual, puertasDisponibles, sesionActiva]);

  // 1. Escuchar sesiones de aforo universitario de todo el campus
  useEffect(() => {
    try {
      const q = collection(db, 'sesionesAforoUni');

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const docs: SesionAforoUni[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<SesionAforoUni, 'id'>)
          }));
          docs.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
          setSesiones(docs);

          // Sincronizar sesión activa
          setSesionActiva((prev) => {
            if (prev) {
              const act = docs.find((d) => d.id === prev.id);
              if (act && (act.activa || act.estado === 'abierta') && !act.enPapelera) {
                return act;
              }
              localStorage.removeItem('sesion_activa_uni_id');
              return null;
            }
            const storedId = localStorage.getItem('sesion_activa_uni_id');
            if (storedId) {
              const guardada = docs.find(
                (d) => d.id === storedId && (d.activa || d.estado === 'abierta') && !d.enPapelera
              );
              if (guardada) return guardada;
            }
            // Si hay alguna sesión abierta reciente, tomarla
            const primeraAbierta = docs.find((d) => (d.activa || d.estado === 'abierta') && !d.enPapelera);
            if (primeraAbierta) {
              localStorage.setItem('sesion_activa_uni_id', primeraAbierta.id);
              return primeraAbierta;
            }
            return null;
          });
        },
        (err) => {
          console.warn('Listener sesionesAforoUni (fallback local):', err);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('Error inicializando sesionesAforoUni:', err);
    }
  }, [usuarioActual]);

  const sesionIdActiva = sesionActiva?.id;

  // 2. Escuchar eventos de la sesión activa
  useEffect(() => {
    if (!sesionIdActiva) return;

    try {
      const q = query(
        collection(db, 'eventosAforoUni'),
        where('sesionId', '==', sesionIdActiva)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const docs: EventoAforoUni[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<EventoAforoUni, 'id'>)
          }));
          docs.sort((a, b) => a.timestamp - b.timestamp);
          setEventos(docs);
        },
        (err) => {
          console.warn('Listener eventosAforoUni (fallback local):', err);
        }
      );

      return () => unsub();
    } catch (err) {
      console.warn('Error inicializando eventosAforoUni:', err);
    }
  }, [sesionIdActiva]);

  // 3. Listener global de todos los eventos del aforo universitario (para reportes del historial)
  useEffect(() => {
    try {
      const q = collection(db, 'eventosAforoUni');

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const docs: EventoAforoUni[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<EventoAforoUni, 'id'>)
          }));
          setTodosLosEventos(docs);
        },
        (err) => {
          console.warn('Listener global eventosAforoUni diferido:', err);
        }
      );

      return () => unsub();
    } catch {
      // Ignorar en offline
    }
  }, [usuarioActual]);

  // 4. Cálculo de métricas en tiempo real de la sesión activa
  const metricas: MetricasAforoUni = useMemo(() => {
    const aforoIni = sesionActiva?.aforoInicial || 0;
    let aforo = aforoIni;
    let entradas = 0;
    let salidas = 0;
    let pico = aforoIni;
    let horaPico: string | null = null;
    const entradasPorPuerta: Record<string, number> = {};
    const salidasPorPuerta: Record<string, number> = {};

    const activos = eventos.filter((e) => !e.enPapelera);
    activos.forEach((e) => {
      const p = e.puerta || 'Entrada Frontal';
      if (e.tipo === 'entrada') {
        entradas += e.cantidad;
        aforo += e.cantidad;
        entradasPorPuerta[p] = (entradasPorPuerta[p] || 0) + e.cantidad;
      } else {
        salidas += e.cantidad;
        aforo = Math.max(0, aforo - e.cantidad);
        salidasPorPuerta[p] = (salidasPorPuerta[p] || 0) + e.cantidad;
      }
      if (aforo > pico) {
        pico = aforo;
        horaPico = new Date(e.timestamp).toLocaleTimeString('es-CO', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    });

    return {
      aforoActual: aforo,
      totalEntradas: entradas,
      totalSalidas: salidas,
      volumenTransito: entradas + salidas,
      aforoPico: pico,
      horaPico,
      entradasPorPuerta,
      salidasPorPuerta
    };
  }, [eventos, sesionActiva]);

  // 5. Registrar evento de tránsito con origen de acceso (Optimista <0ms + Firestore)
  const handleRegistrarEvento = async (tipo: TipoTransitoUni, cantidad: number, puerta?: string) => {
    if (!sesionActiva) return;

    const puertaEfectiva = puerta || puertaActiva || 'Entrada Frontal';
    const delta = tipo === 'entrada' ? cantidad : -cantidad;
    const aforoResultante = Math.max(0, metricas.aforoActual + delta);
    const ahora = Date.now();
    const idTemp = 'temp_uni_' + ahora + '_' + Math.random().toString(36).substring(2, 5);

    const eventoData: Omit<EventoAforoUni, 'id'> = {
      sesionId: sesionActiva.id,
      usuario: usuarioActual,
      tipo,
      cantidad,
      puerta: puertaEfectiva,
      aforoMomento: aforoResultante,
      timestamp: ahora,
      fechaHora: new Date(ahora).toISOString()
    };

    // Actualización optimista inmediata
    const eventoOptimista: EventoAforoUni = {
      id: idTemp,
      ...eventoData
    };

    setEventos((prev) => [...prev, eventoOptimista]);
    setTodosLosEventos((prev) => [...prev, eventoOptimista]);

    // Persistir en Firestore
    try {
      const docRef = await addDoc(collection(db, 'eventosAforoUni'), eventoData);
      setEventos((prev) =>
        prev.map((e) => (e.id === idTemp ? { ...e, id: docRef.id } : e))
      );
      setTodosLosEventos((prev) =>
        prev.map((e) => (e.id === idTemp ? { ...e, id: docRef.id } : e))
      );
    } catch (err) {
      console.error('Error al guardar evento de aforo en Firestore:', err);
    }
  };

  // 6. Deshacer último evento registrado (Rollback instantáneo)
  const handleDeshacerUltimo = async () => {
    const activos = eventos.filter((e) => !e.enPapelera);
    if (activos.length === 0) return;

    const ultimo = activos[activos.length - 1];

    setEventos((prev) =>
      prev.map((e) => (e.id === ultimo.id ? { ...e, enPapelera: true } : e))
    );
    setTodosLosEventos((prev) =>
      prev.map((e) => (e.id === ultimo.id ? { ...e, enPapelera: true } : e))
    );

    if (!ultimo.id.startsWith('temp_uni_')) {
      try {
        await updateDoc(doc(db, 'eventosAforoUni', ultimo.id), { enPapelera: true });
      } catch (err) {
        console.error('Error al marcar evento en papelera en Firestore:', err);
      }
    }
  };

  // 7. Eliminar evento específico desde la bitácora
  const handleEliminarEvento = async (eventoId: string) => {
    setEventos((prev) =>
      prev.map((e) => (e.id === eventoId ? { ...e, enPapelera: true } : e))
    );
    setTodosLosEventos((prev) =>
      prev.map((e) => (e.id === eventoId ? { ...e, enPapelera: true } : e))
    );

    if (!eventoId.startsWith('temp_uni_')) {
      try {
        await updateDoc(doc(db, 'eventosAforoUni', eventoId), { enPapelera: true });
      } catch (err) {
        console.error('Error al anular evento en Firestore:', err);
      }
    }
  };

  // 8. Ajustar aforo manual (actualiza aforo inicial o registra delta)
  const handleAjustarAforoManual = async (nuevoAforo: number) => {
    if (!sesionActiva) return;

    const diferencia = nuevoAforo - metricas.aforoActual;
    if (diferencia === 0) return;

    const tipo: TipoTransitoUni = diferencia > 0 ? 'entrada' : 'salida';
    const cant = Math.abs(diferencia);
    const ahora = Date.now();
    const idTemp = 'temp_uni_ajuste_' + ahora;

    const eventoData: Omit<EventoAforoUni, 'id'> = {
      sesionId: sesionActiva.id,
      usuario: usuarioActual,
      tipo,
      cantidad: cant,
      puerta: puertaActiva,
      aforoMomento: nuevoAforo,
      timestamp: ahora,
      fechaHora: new Date(ahora).toISOString(),
      esManual: true,
      nota: `Ajuste manual de aforo a ${nuevoAforo} personas`
    };

    setEventos((prev) => [...prev, { id: idTemp, ...eventoData }]);
    setTodosLosEventos((prev) => [...prev, { id: idTemp, ...eventoData }]);

    try {
      const docRef = await addDoc(collection(db, 'eventosAforoUni'), eventoData);
      setEventos((prev) =>
        prev.map((e) => (e.id === idTemp ? { ...e, id: docRef.id } : e))
      );
      setTodosLosEventos((prev) =>
        prev.map((e) => (e.id === idTemp ? { ...e, id: docRef.id } : e))
      );
    } catch (err) {
      console.error('Error al guardar ajuste manual en Firestore:', err);
    }
  };

  // 9. Crear nueva sesión de aforo en Firestore
  const handleCrearSesion = async (nueva: Omit<SesionAforoUni, 'id'>) => {
    const idTemp = 'ses_uni_' + Date.now();
    const sesionCreada: SesionAforoUni = {
      id: idTemp,
      ...nueva
    };

    setSesiones((prev) => [sesionCreada, ...prev]);
    setSesionActiva(sesionCreada);
    localStorage.setItem('sesion_activa_uni_id', idTemp);
    setVistaActiva('conteo');

    try {
      const docRef = await addDoc(collection(db, 'sesionesAforoUni'), nueva);
      setSesiones((prev) =>
        prev.map((s) => (s.id === idTemp ? { ...s, id: docRef.id } : s))
      );
      setSesionActiva((prev) => (prev?.id === idTemp ? { ...prev, id: docRef.id } : prev));
      localStorage.setItem('sesion_activa_uni_id', docRef.id);
    } catch (err) {
      console.error('Error al persistir sesión de aforo en Firestore:', err);
    }
  };

  // 10. Confirmar finalización de la sesión
  const handleConfirmarFinalizar = async () => {
    if (!sesionActiva) return;

    const ahoraIso = new Date().toISOString();
    const id = sesionActiva.id;

    localStorage.removeItem('sesion_activa_uni_id');
    setSesionActiva(null);
    setEventos([]);

    setSesiones((prev) =>
      prev.map((s) => (s.id === id ? { ...s, activa: false, estado: 'cerrada', fechaCierre: ahoraIso } : s))
    );

    if (!id.startsWith('ses_uni_')) {
      try {
        await updateDoc(doc(db, 'sesionesAforoUni', id), {
          activa: false,
          estado: 'cerrada',
          fechaCierre: ahoraIso
        });
      } catch (err) {
        console.error('Error al cerrar sesión de aforo en Firestore:', err);
      }
    }
  };

  // 11. Eliminar sesión del historial
  const handleEliminarSesion = async (sesionId: string) => {
    setSesiones((prev) =>
      prev.map((s) => (s.id === sesionId ? { ...s, enPapelera: true } : s))
    );
    if (sesionActiva?.id === sesionId) {
      localStorage.removeItem('sesion_activa_uni_id');
      setSesionActiva(null);
      setEventos([]);
    }

    try {
      await updateDoc(doc(db, 'sesionesAforoUni', sesionId), { enPapelera: true });
    } catch (err) {
      console.error('Error al enviar sesión a papelera en Firestore:', err);
    }
  };

  // 12. Exportar sesión activa
  const handleExportarXLSX = () => {
    if (!sesionActiva) return;
    exportarAforoUniXLSX(sesionActiva, eventos, metricas);
  };

  const handleExportarCSV = () => {
    if (!sesionActiva) return;
    exportarAforoUniCSV(sesionActiva, eventos);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-600 selection:text-white">
      {/* HEADER EXCLUSIVO INSTITUCIONAL UNIGUAJIRA */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-md">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            {/* Branding Uniguajira + Aforo de Bloque */}
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-black text-white text-base shadow-sm shrink-0">
                <Building2 className="w-4 h-4 text-white" />
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-extrabold tracking-tight text-sm sm:text-base text-white">
                    Uniguajira
                  </span>
                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">
                    Aforo de Bloque
                  </span>
                </div>

                {sesionActiva ? (
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 truncate max-w-[220px] sm:max-w-md mt-0.5">
                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                    <span className="font-bold text-slate-200 truncate">{sesionActiva.nombre}</span>
                    <span className="text-emerald-400 font-semibold">• {sesionActiva.bloque}</span>
                    {sesionActiva.puertaAcceso && (
                      <span className="hidden md:inline text-[11px] text-slate-500">
                        ({sesionActiva.puertaAcceso})
                      </span>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5">
                    <span>Sin medición en curso</span>
                  </div>
                )}
              </div>
            </div>

            {/* Acciones principales y perfil */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setModalNuevaSesionAbierto(true)}
                className="touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/30 transition cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Nueva Medición</span>
                <span className="sm:hidden">Nueva</span>
              </button>

              {sesionActiva && (
                <div className="hidden sm:flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleExportarXLSX}
                    className="touch-btn p-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 flex items-center gap-1 cursor-pointer"
                    title="Exportar a Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span className="text-[11px]">XLSX</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleExportarCSV}
                    className="touch-btn p-1.5 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 flex items-center gap-1 cursor-pointer"
                    title="Exportar a CSV"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span className="text-[11px]">CSV</span>
                  </button>
                </div>
              )}

              {/* Badge de usuario autorizado */}
              <div className="flex items-center gap-1.5 bg-slate-800/80 border border-slate-700 rounded-xl px-2.5 py-1 text-xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span
                  className="hidden md:inline text-slate-300 font-medium max-w-[130px] truncate font-mono text-[11px]"
                  title={usuarioActual}
                >
                  {usuarioActual}
                </span>
                <button
                  type="button"
                  onClick={onCerrarSesionAuth}
                  title={`Cerrar sesión (${usuarioActual})`}
                  className="touch-btn text-slate-400 hover:text-rose-400 cursor-pointer ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center justify-between border-t border-slate-800/80 pt-1.5">
            <nav className="flex items-center gap-1 sm:gap-2">
              <button
                type="button"
                onClick={() => setVistaActiva('conteo')}
                className={`touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  vistaActiva === 'conteo'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Conteo en Vivo</span>
              </button>

              <button
                type="button"
                onClick={() => setVistaActiva('bitacora')}
                className={`touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  vistaActiva === 'bitacora'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <ListFilter className="w-4 h-4" />
                <span>Bitácora</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                  {eventos.filter((e) => !e.enPapelera).length}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setVistaActiva('historial')}
                className={`touch-btn flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-semibold transition cursor-pointer ${
                  vistaActiva === 'historial'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <History className="w-4 h-4" />
                <span>Historial</span>
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-slate-700 text-slate-300">
                  {sesiones.filter((s) => !s.enPapelera).length}
                </span>
              </button>
            </nav>

            {sesionActiva && (
              <button
                type="button"
                onClick={() => setModalFinalizarAbierto(true)}
                className="touch-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                title="Finalizar medición del bloque"
              >
                <StopCircle className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Finalizar Conteo</span>
                <span className="sm:hidden">Cerrar</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-3 sm:px-6 py-5 space-y-5">
        {vistaActiva === 'conteo' && (
          <>
            {!sesionActiva ? (
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8 sm:p-12 text-center max-w-lg mx-auto shadow-2xl space-y-4 my-8">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto text-emerald-400">
                  <Building2 className="w-8 h-8" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    Sin Medición de Aforo Activa
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-2">
                    Inicia una nueva medición para registrar el tránsito de personas en un bloque de la universidad (entradas, salidas y volumen en tiempo real).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setModalNuevaSesionAbierto(true)}
                  className="touch-btn inline-flex items-center gap-2 px-6 py-3 rounded-2xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-xl shadow-emerald-600/30 transition text-sm cursor-pointer"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Iniciar Conteo de Bloque</span>
                </button>
              </div>
            ) : (
              <>
                {/* Banner de sesión activa */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <h2 className="font-extrabold text-sm sm:text-base text-white">
                          {sesionActiva.nombre}
                        </h2>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-emerald-300 border border-slate-700 font-bold">
                          {sesionActiva.bloque}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <DoorOpen className="w-3.5 h-3.5 text-slate-500" />
                        <span>Acceso: {sesionActiva.puertaAcceso || 'General'}</span>
                        {sesionActiva.capacidadMaxima && (
                          <span>• Capacidad sugerida: {sesionActiva.capacidadMaxima}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setModalFinalizarAbierto(true)}
                    className="touch-btn text-xs font-bold px-3.5 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 flex items-center gap-1.5 transition self-stretch sm:self-auto justify-center cursor-pointer"
                  >
                    <StopCircle className="w-4 h-4" />
                    <span>Finalizar medición</span>
                  </button>
                </div>

                {/* Métricas en vivo (KPIs Cards) */}
                <MetricasAforoCards metricas={metricas} sesion={sesionActiva} />

                {/* Consola de conteo rápido (Botones Masivos Touch) */}
                <ControlesConteoTouch
                  onRegistrar={handleRegistrarEvento}
                  onDeshacerUltimo={handleDeshacerUltimo}
                  onAjustarAforoManual={handleAjustarAforoManual}
                  puedeDeshacer={eventos.filter((e) => !e.enPapelera).length > 0}
                  aforoActual={metricas.aforoActual}
                  bloque={sesionActiva.bloque}
                  puertaActiva={puertaActiva}
                  onCambiarPuerta={setPuertaManual}
                />

                {/* Gráfico de flujo e intervalos de tiempo */}
                <GraficoFlujoUni
                  eventos={eventos}
                  aforoInicial={sesionActiva.aforoInicial || 0}
                />

                {/* Bitácora resumida de los últimos eventos */}
                <BitacoraEventosUni
                  eventos={eventos}
                  onEliminarEvento={handleEliminarEvento}
                  onExportarXLSX={handleExportarXLSX}
                  onExportarCSV={handleExportarCSV}
                />
              </>
            )}
          </>
        )}

        {vistaActiva === 'bitacora' && (
          <BitacoraEventosUni
            eventos={eventos}
            onEliminarEvento={handleEliminarEvento}
            onExportarXLSX={handleExportarXLSX}
            onExportarCSV={handleExportarCSV}
          />
        )}

        {vistaActiva === 'historial' && (
          <HistorialSesionesUni
            sesiones={sesiones}
            todosLosEventos={todosLosEventos}
            sesionActivaId={sesionActiva?.id || null}
            onSeleccionarSesion={(s) => {
              if (s.activa || s.estado === 'abierta') {
                localStorage.setItem('sesion_activa_uni_id', s.id);
                setSesionActiva(s);
                setVistaActiva('conteo');
              } else {
                setSesionActiva(s);
                setVistaActiva('bitacora');
              }
            }}
            onEliminarSesion={handleEliminarSesion}
          />
        )}
      </main>

      {/* MODALES */}
      <NuevaSesionUniModal
        abierto={modalNuevaSesionAbierto}
        usuarioActual={usuarioActual}
        onCerrar={() => setModalNuevaSesionAbierto(false)}
        onCrearSesion={handleCrearSesion}
      />

      <FinalizarSesionUniModal
        abierto={modalFinalizarAbierto}
        sesion={sesionActiva}
        metricas={metricas}
        onCerrar={() => setModalFinalizarAbierto(false)}
        onConfirmarFinalizar={handleConfirmarFinalizar}
      />
    </div>
  );
};
