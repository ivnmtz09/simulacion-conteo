import { useState, useEffect } from 'react';
import type { TipoVehiculo, EventoConteo, SesionConteo, VehiculoEnServidor } from './types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from './types/conteo';
import {
  auth,
  db,
  onAuthStateChanged,
  signOut,
  collection,
  doc,
  query,
  where,
  onSnapshot,
  addDoc
} from './lib/firebase';
import { Navbar } from './components/Navbar';
import { BottomNav } from './components/BottomNav';
import { AuthModal } from './components/AuthModal';
import { NuevaSesionModal } from './components/NuevaSesionModal';
import { FinalizarSesionModal } from './components/FinalizarSesionModal';
import { UnirseSesionModal } from './components/UnirseSesionModal';
import { VehiculoBloqueConteo } from './components/VehiculoBloqueConteo';
import { PeatonBloqueConteo } from './components/PeatonBloqueConteo';
import { EventosTablaCRUD } from './components/EventosTablaCRUD';
import { HistorialSesiones } from './components/HistorialSesiones';
import { PapeleraSesiones } from './components/PapeleraSesiones';
import { SemaforoCronometro } from './components/SemaforoCronometro';
import { SplashScreen } from './components/SplashScreen';
import { NotFoundPage } from './components/NotFoundPage';
import { exportarEventosXLSX, exportarEventosCSV } from './lib/exportUtils';
import { esCorreoAutorizado } from './config/equipo';
import { PlusCircle, Activity, StopCircle, Users, MapPin, Clock, Eye } from 'lucide-react';

export default function App() {
  const [authLoading, setAuthLoading] = useState(true);
  const [rutaInvalida, setRutaInvalida] = useState(() => {
    const path = typeof window !== 'undefined' ? window.location.pathname : '/';
    const validPaths = ['/', '', '/conteo', '/eventos', '/historial', '/sesiones', '/papelera'];
    return !validPaths.includes(path);
  });
  const [usuarioActual, setUsuarioActual] = useState<string | null>(null);
  const [sesionActiva, setSesionActiva] = useState<SesionConteo | null>(null);
  const [sesiones, setSesiones] = useState<SesionConteo[]>([]);
  const [eventos, setEventos] = useState<EventoConteo[]>([]);
  const [todosLosEventos, setTodosLosEventos] = useState<EventoConteo[]>([]);
  const [vistaActiva, setVistaActiva] = useState<'conteo' | 'eventos' | 'historial' | 'papelera'>('conteo');
  const [modoVistaVehiculos, setModoVistaVehiculos] = useState<'mis_roles' | 'todos'>('mis_roles');

  // Colas FIFO en memoria para cada tipo de vehículo (compatibilidad)
  const [colasMemoria, setColasMemoria] = useState<Record<string, number[]>>({
    moto: [],
    carro: [],
    camioneta: [],
    carga: [],
    buses: []
  });

  // Servidor FIFO en memoria para cada tipo de vehículo (compatibilidad)
  const [servidorMemoria, setServidorMemoria] = useState<Record<string, VehiculoEnServidor[]>>({
    moto: [],
    carro: [],
    camioneta: [],
    carga: [],
    buses: []
  });

  // Modales
  const [modalAuthAbierto, setModalAuthAbierto] = useState(false);
  const [modalNuevaSesionAbierto, setModalNuevaSesionAbierto] = useState(false);
  const [modalFinalizarAbierto, setModalFinalizarAbierto] = useState(false);
  const [modalUnirseAbierto, setModalUnirseAbierto] = useState(false);
  const [sesionParaUnirse, setSesionParaUnirse] = useState<SesionConteo | null>(null);

  // Escuchar estado de autenticación en Firebase restringido a lista blanca
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      try {
        if (user && user.email) {
          if (esCorreoAutorizado(user.email)) {
            setUsuarioActual(user.email);
            setModalAuthAbierto(false);
          } else {
            // Si el correo autenticado no pertenece al equipo, cerrar sesión
            await signOut(auth);
            setUsuarioActual(null);
            setModalAuthAbierto(true);
          }
        } else {
          setUsuarioActual(null);
        }
      } finally {
        setAuthLoading(false);
      }
    });

    return () => unsub();
  }, []);

  // Escuchar todas las sesiones disponibles (dependiente del usuario autenticado)
  useEffect(() => {
    if (!usuarioActual) return;

    try {
      const q = query(collection(db, 'sesiones'));
      const unsub = onSnapshot(q, (snapshot) => {
        const docs: SesionConteo[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<SesionConteo, 'id'>)
        }));
        // Ordenar por fecha descendente
        docs.sort((a, b) => new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime());
        setSesiones(docs);

        // Mantener sincronizada la sesión activa (excluyendo papelera)
        setSesionActiva((prev) => {
          if (prev) {
            const actualizada = docs.find((d) => d.id === prev.id);
            if (actualizada && (actualizada.activa || actualizada.estado === 'abierta') && !actualizada.enPapelera) {
              return actualizada;
            }
            // Si la sesión fue cerrada por cualquier usuario o enviada a papelera
            localStorage.removeItem('sesion_activa_id');
            return null;
          }
          const storedId = localStorage.getItem('sesion_activa_id');
          if (storedId) {
            const guardada = docs.find((d) => d.id === storedId && (d.activa || d.estado === 'abierta') && !d.enPapelera);
            if (guardada) return guardada;
          }
          return null;
        });
      }, (err) => {
        console.warn('Error en listener de sesiones (usando local):', err);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Fallback offline para sesiones:', e);
    }
  }, [usuarioActual]);

  const sesionIdActiva = sesionActiva?.id;

  // Escuchar la sesión activa directamente en tiempo real para cambios inmediatos (semáforo, asignaciones, cierre)
  useEffect(() => {
    if (!sesionIdActiva || !usuarioActual) return;

    try {
      const unsub = onSnapshot(doc(db, 'sesiones', sesionIdActiva), (docSnap) => {
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...(docSnap.data() as Omit<SesionConteo, 'id'>) };
          if (data.enPapelera || (!data.activa && data.estado === 'cerrada')) {
            // La sesión fue cerrada o enviada a papelera: limpiar activo inmediatamente sin congelar UI
            localStorage.removeItem('sesion_activa_id');
            setSesionActiva(null);
            setSesiones((prev) =>
              prev.map((s) => (s.id === data.id ? { ...s, ...data } : s))
            );
          } else {
            setSesionActiva((prev) => (prev ? { ...prev, ...data } : data));
          }
        } else {
          localStorage.removeItem('sesion_activa_id');
          setSesionActiva(null);
        }
      }, (err) => {
        console.warn('Error en listener directo de sesionActiva:', err);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Fallback offline para sesionActiva:', e);
    }
  }, [sesionIdActiva, usuarioActual]);

  // Escuchar eventos de la sesión activa en tiempo real (con soporte offline)
  useEffect(() => {
    if (!sesionIdActiva) return;

    try {
      const q = query(
        collection(db, 'eventos'),
        where('sesionId', '==', sesionIdActiva)
      );

      const unsub = onSnapshot(q, (snapshot) => {
        const docs: EventoConteo[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<EventoConteo, 'id'>)
        }));
        docs.sort((a, b) => a.timestampCreacion - b.timestampCreacion);
        setEventos(docs);
      }, (err) => {
        console.warn('Error en listener de eventos (usando estado en memoria):', err);
      });

      return () => unsub();
    } catch (e) {
      console.warn('Firestore offline fallback:', e);
    }
  }, [sesionIdActiva]);

  // Listener para todos los eventos (para reportes de historial)
  useEffect(() => {
    try {
      const unsub = onSnapshot(collection(db, 'eventos'), (snapshot) => {
        const docs: EventoConteo[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<EventoConteo, 'id'>)
        }));
        setTodosLosEventos(docs);
      }, (err) => {
        console.warn('Listener global de eventos diferido:', err);
      });
      return () => unsub();
    } catch {
      // Ignorar en offline
    }
  }, []);

  // Actualizar cola en memoria de un tipo de vehículo
  const handleActualizarCola = (tipo: string, nuevaCola: number[]) => {
    setColasMemoria((prev) => ({
      ...prev,
      [tipo]: nuevaCola
    }));
  };

  // Actualizar vehículos en servidor en memoria de un tipo de vehículo
  const handleActualizarServidor = (tipo: string, nuevoServidor: VehiculoEnServidor[]) => {
    setServidorMemoria((prev) => ({
      ...prev,
      [tipo]: nuevoServidor
    }));
  };

  // Registrar nuevo evento (Optimista + Firestore)
  const handleRegistrarEvento = async (nuevoEventoData: Omit<EventoConteo, 'id'>) => {
    // 1. Actualización optimista inmediata en pantalla
    const idTemp = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    const eventoOptimista: EventoConteo = {
      id: idTemp,
      ...nuevoEventoData
    };
    setEventos((prev) => [...prev, eventoOptimista]);
    setTodosLosEventos((prev) => [...prev, eventoOptimista]);

    // 2. Persistir en Firestore
    try {
      const docRef = await addDoc(collection(db, 'eventos'), nuevoEventoData);
      // Reemplazar el id temporal con el id definitivo de Firestore
      setEventos((prev) =>
        prev.map((e) => (e.id === idTemp ? { ...e, id: docRef.id } : e))
      );
    } catch (err) {
      console.error('Error al guardar en Firestore (se mantiene en local):', err);
    }
  };

  // Actualización optimista inmediata del ciclo semafórico para respuesta a 0ms en pantalla
  const handleActualizarSemaforoOptimista = (inicioMs: number) => {
    setSesionActiva((prev) => (prev ? {
      ...prev,
      inicioCicloSemaforo: inicioMs,
      ultimaResincronizacionSemaforo: inicioMs,
      sincronizadoPor: usuarioActual
    } : null));
    setSesiones((prev) => prev.map((s) => (s.id === sesionActiva?.id ? {
      ...s,
      inicioCicloSemaforo: inicioMs,
      ultimaResincronizacionSemaforo: inicioMs,
      sincronizadoPor: usuarioActual
    } : s)));
  };

  const handleCerrarSesionAuth = async () => {
    try {
      await signOut(auth);
    } catch {
      // Ignorar
    }
    setUsuarioActual(null);
    setSesiones([]);
    setSesionActiva(null);
    setModalAuthAbierto(true);
  };

  const handleCerrarSesionActiva = async () => {
    if (!sesionActiva) return;
    setModalFinalizarAbierto(true);
  };

  const handleFinalizarSesionConfirmada = (idCerrada?: string) => {
    const id = idCerrada || sesionActiva?.id;
    localStorage.removeItem('sesion_activa_id');
    setSesionActiva(null);
    if (id) {
      setSesiones((prev) =>
        prev.map((s) => (s.id === id ? { ...s, activa: false, estado: 'cerrada' } : s))
      );
    }
    setColasMemoria({
      moto: [],
      carro: [],
      camioneta: [],
      carga: [],
      buses: []
    });
    setServidorMemoria({
      moto: [],
      carro: [],
      camioneta: [],
      carga: [],
      buses: []
    });
    setEventos([]);
    setVistaActiva('conteo');
  };

  const handleEliminarSesionLocal = (id: string) => {
    setSesiones((prev) =>
      prev.map((s) => (s.id === id ? { ...s, enPapelera: true } : s))
    );
    if (sesionActiva?.id === id) {
      localStorage.removeItem('sesion_activa_id');
      setSesionActiva(null);
      setEventos([]);
    }
  };

  const handleExportarXLSX = () => {
    if (!sesionActiva) return;
    exportarEventosXLSX(sesionActiva, eventos);
  };

  const handleExportarCSV = () => {
    if (!sesionActiva) return;
    exportarEventosCSV(sesionActiva, eventos);
  };

  // Roles asignados al usuario actual en la sesión activa
  const asignaciones = sesionActiva?.asignaciones || {};
  const misTiposAsignados = LISTA_TIPOS_VEHICULOS.filter(
    (t) => asignaciones[t] === usuarioActual
  );

  // Fallback si la sesión no posee asignaciones registradas aún
  const tiposActivosEnSesion: TipoVehiculo[] =
    modoVistaVehiculos === 'todos'
      ? LISTA_TIPOS_VEHICULOS
      : (Object.keys(asignaciones).length > 0
          ? misTiposAsignados
          : (sesionActiva?.tiposSeleccionados && sesionActiva.tiposSeleccionados.length > 0
              ? sesionActiva.tiposSeleccionados
              : LISTA_TIPOS_VEHICULOS));

  // Sesiones activas del equipo para listar en tiempo real en la pantalla de inicio (excluyendo papelera)
  const sesionesActivasEquipo = sesiones.filter(
    (s) => (s.activa || s.estado === 'abierta') && !s.enPapelera
  );

  // Pantalla Splash mientras Firebase resuelve la autenticación
  if (authLoading) {
    return <SplashScreen />;
  }

  // Manejo de rutas inexistentes (404)
  if (rutaInvalida) {
    return (
      <NotFoundPage
        usuarioActual={usuarioActual}
        onVolverInicio={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/');
          }
          setRutaInvalida(false);
          setVistaActiva('conteo');
        }}
        onAbrirAuth={() => {
          if (typeof window !== 'undefined') {
            window.history.pushState(null, '', '/');
          }
          setRutaInvalida(false);
          setModalAuthAbierto(true);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Barra de navegación superior */}
      <Navbar
        usuarioActual={usuarioActual}
        sesionActiva={sesionActiva}
        totalEventos={eventos.filter((e) => !e.enPapelera).length}
        totalEnPapelera={sesiones.filter((s) => Boolean(s.enPapelera)).length}
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        onAbrirAuth={() => setModalAuthAbierto(true)}
        onCerrarSesion={handleCerrarSesionAuth}
        onAbrirNuevaSesion={() => {
          if (!usuarioActual) {
            setModalAuthAbierto(true);
          } else {
            setModalNuevaSesionAbierto(true);
          }
        }}
        onExportarXLSX={handleExportarXLSX}
        onExportarCSV={handleExportarCSV}
      />

      {/* Contenido principal según la pestaña activa */}
      <main className="flex-1 pb-safe pb-24 md:pb-safe">
        {vistaActiva === 'conteo' && (
          <div className="max-w-7xl mx-auto px-3 sm:px-6 py-4 space-y-4">
            {/* Si no hay sesión activa creada */}
            {!sesionActiva ? (
              <div className="space-y-6">
                {/* Tarjeta de bienvenida y creación de nueva sesión */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 text-center max-w-xl mx-auto shadow-xl">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center mx-auto text-blue-400 mb-4">
                    <Activity className="w-8 h-8" />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-white">
                    No hay una sesión de aforo activa
                  </h2>
                  <p className="text-sm text-slate-400 mt-2 mb-6">
                    Crea una nueva sesión para configurar la intersección o únete a una sesión activa en progreso con tus compañeros del equipo.
                  </p>
                  <button
                    onClick={() => {
                      if (!usuarioActual) {
                        setModalAuthAbierto(true);
                      } else {
                        setModalNuevaSesionAbierto(true);
                      }
                    }}
                    className="touch-btn inline-flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 transition text-sm cursor-pointer"
                  >
                    <PlusCircle className="w-4 h-4" />
                    <span>Crear Nueva Sesión de Conteo</span>
                  </button>
                </div>

                {/* Sección: SESIONES ACTIVAS DEL EQUIPO AHORA MISMO */}
                <div className="max-w-4xl mx-auto">
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <div className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                      </div>
                      <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                        <Users className="w-4 h-4 text-emerald-400" />
                        <span>Sesiones activas del equipo ahora mismo</span>
                      </h3>
                    </div>
                    <span className="text-xs text-slate-400 font-mono">
                      {sesionesActivasEquipo.length} {sesionesActivasEquipo.length === 1 ? 'activa' : 'activas'}
                    </span>
                  </div>

                  {sesionesActivasEquipo.length === 0 ? (
                    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 text-center text-slate-400 text-xs">
                      <Clock className="w-6 h-6 text-slate-500 mx-auto mb-2 opacity-60" />
                      <p className="font-medium text-slate-300">No hay sesiones activas en este momento.</p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Cuando un integrante del equipo inicie un aforo, aparecerá aquí en tiempo real para que puedas unirte y colaborar.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {sesionesActivasEquipo.map((s) => {
                        const participantes = s.participantes || [s.usuario];
                        const asignacionesSesion = s.asignaciones || {};
                        const tiposAsignadosCount = Object.keys(asignacionesSesion).length;
                        const tiposLibresCount = Math.max(0, 6 - tiposAsignadosCount);

                        const fechaObj = new Date(s.fechaCreacion);
                        const horaInicio = !isNaN(fechaObj.getTime())
                          ? fechaObj.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                          : '';
                        const fechaInicio = !isNaN(fechaObj.getTime())
                          ? fechaObj.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })
                          : '';

                        return (
                          <div
                            key={s.id}
                            className="bg-slate-900 border border-slate-800 hover:border-slate-700/80 rounded-2xl p-4 sm:p-5 shadow-lg flex flex-col justify-between transition gap-4"
                          >
                            <div>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                    <h4 className="font-bold text-sm sm:text-base text-white truncate">
                                      {s.nombre}
                                    </h4>
                                  </div>
                                  {s.ubicacion && (
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                                      <span className="truncate">{s.ubicacion}</span>
                                    </div>
                                  )}
                                </div>

                                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 shrink-0">
                                  Abierta
                                </span>
                              </div>

                              {/* Metadatos: creador, fecha y hora */}
                              <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-xs text-slate-400">
                                <div>
                                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                    Creado por
                                  </span>
                                  <span className="font-medium text-slate-300 truncate block" title={s.usuario}>
                                    {s.usuario.split('@')[0]}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                                    Hora de inicio
                                  </span>
                                  <span className="font-mono text-slate-300 block">
                                    {horaInicio} <span className="text-slate-500 text-[10px]">({fechaInicio})</span>
                                  </span>
                                </div>
                              </div>

                              {/* Resumen de roles tomados */}
                              <div className="mt-3 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/70 text-xs">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5">
                                  <span>Aforadores: <strong className="text-slate-200">{participantes.length}</strong></span>
                                  <span className="text-emerald-400 font-semibold">{tiposLibresCount} roles libres</span>
                                </div>
                                <div className="flex items-center gap-1 flex-wrap">
                                  {LISTA_TIPOS_VEHICULOS.map((tipo) => {
                                    const asignadoA = asignacionesSesion[tipo];
                                    const info = TIPOS_VEHICULOS[tipo];
                                    return (
                                      <span
                                        key={tipo}
                                        title={asignadoA ? `${info.nombre}: asignado a ${asignadoA}` : `${info.nombre}: disponible`}
                                        className={`text-xs px-1.5 py-0.5 rounded border inline-flex items-center gap-1 ${
                                          asignadoA
                                            ? 'bg-slate-800 border-slate-700 text-slate-400 line-through opacity-70'
                                            : 'bg-blue-500/15 border-blue-500/30 text-blue-300 font-semibold'
                                        }`}
                                      >
                                        <span>{info.emoji}</span>
                                        <span className="text-[10px]">{info.nombre}</span>
                                      </span>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>

                            {/* Botón de acción: Unirse */}
                            <button
                              type="button"
                              onClick={() => {
                                if (!usuarioActual) {
                                  setModalAuthAbierto(true);
                                  return;
                                }
                                setSesionParaUnirse(s);
                                setModalUnirseAbierto(true);
                              }}
                              className="touch-btn w-full py-2.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 flex items-center justify-center gap-2 transition cursor-pointer"
                            >
                              <Users className="w-4 h-4" />
                              <span>Unirme a esta sesión</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <>
                {/* Banner informativo de la sesión activa */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-md">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-block w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="font-extrabold text-sm sm:text-base text-white">
                        {sesionActiva.nombre}
                      </span>
                      {sesionActiva.ubicacion && (
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{sesionActiva.ubicacion}</span>
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-slate-400 flex-wrap">
                      <span>Creada por: <strong className="text-slate-300">{sesionActiva.usuario.split('@')[0]}</strong></span>
                      <span>•</span>
                      <span>Participantes: <strong className="text-slate-300">{sesionActiva.participantes?.length || 1}</strong></span>
                      <span>•</span>
                      <span>Tus roles asignados: <strong className="text-blue-400">{tiposActivosEnSesion.length}</strong></span>
                    </div>
                  </div>

                  {/* Acciones de la sesión activa */}
                  <div className="flex items-center gap-2 self-stretch md:self-auto justify-end flex-wrap pt-2 md:pt-0 border-t md:border-t-0 border-slate-800">
                    {/* Selector de visualización: Mis roles vs Todos (supervisión PC en tiempo real) */}
                    <div className="flex items-center gap-1 bg-slate-950/80 p-0.5 rounded-xl border border-slate-800 text-xs">
                      <button
                        type="button"
                        onClick={() => setModoVistaVehiculos('mis_roles')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                          modoVistaVehiculos === 'mis_roles'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Mis roles ({misTiposAsignados.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setModoVistaVehiculos('todos')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1 ${
                          modoVistaVehiculos === 'todos'
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'text-slate-400 hover:text-white'
                        }`}
                        title="Ver todos los vehículos de la sesión para supervisión simultánea en tiempo real"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver todos</span>
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSesionParaUnirse(sesionActiva);
                        setModalUnirseAbierto(true);
                      }}
                      className="touch-btn text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Mis roles</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setVistaActiva('eventos')}
                      className="touch-btn text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Bitácora ({eventos.length})</span>
                    </button>

                    {/* BOTÓN VISIBLE: FINALIZAR SESIÓN DE CONTEO */}
                    <button
                      type="button"
                      onClick={() => setModalFinalizarAbierto(true)}
                      className="touch-btn text-xs font-bold px-3.5 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white border border-rose-500/40 hover:border-rose-600 flex items-center gap-1.5 transition shadow-sm cursor-pointer"
                      title="Cerrar esta sesión de aforo para todo el equipo"
                    >
                      <StopCircle className="w-3.5 h-3.5" />
                      <span>Finalizar sesión de conteo</span>
                    </button>
                  </div>
                </div>

                {/* BLOQUE DE CRONOMETRAJE DEL SEMÁFORO (CICLO CONTINUO 93s: 18V / 3A / 72R) */}
                <SemaforoCronometro
                  sesion={sesionActiva}
                  usuario={usuarioActual || 'aforador@aforo.local'}
                  onSincronizarLocal={handleActualizarSemaforoOptimista}
                />

                {/* GRILLA DE BLOQUES INDEPENDIENTES: SOLO LOS ASIGNADOS A ESTE USUARIO */}
                {tiposActivosEnSesion.length === 0 ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-center max-w-lg mx-auto my-6 shadow-xl">
                    <Users className="w-10 h-10 text-blue-400 mx-auto mb-3" />
                    <h3 className="text-base sm:text-lg font-bold text-white">
                      No tienes roles asignados en esta sesión
                    </h3>
                    <p className="text-xs text-slate-400 mt-1 mb-4">
                      Selecciona qué vehículos o peatones vas a contar tú sin interferir con lo que cuentan tus compañeros.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSesionParaUnirse(sesionActiva);
                        setModalUnirseAbierto(true);
                      }}
                      className="touch-btn px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg transition cursor-pointer"
                    >
                      Seleccionar mis roles de conteo
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tiposActivosEnSesion.map((tipo) => {
                      const eventosDelTipo = eventos.filter((e) => e.tipoVehiculo === tipo);

                      if (tipo === 'peaton') {
                        return (
                          <PeatonBloqueConteo
                            key={tipo}
                            sesionId={sesionActiva.id}
                            usuario={usuarioActual || 'aforador@aforo.local'}
                            onRegistrarEvento={handleRegistrarEvento}
                            eventosPeaton={eventosDelTipo}
                          />
                        );
                      }

                      return (
                        <VehiculoBloqueConteo
                          key={tipo}
                          tipo={tipo}
                          sesionId={sesionActiva.id}
                          usuario={usuarioActual || 'aforador@aforo.local'}
                          inicioCicloSemaforo={sesionActiva.inicioCicloSemaforo}
                          colaMemoria={colasMemoria[tipo] || []}
                          servidorMemoria={servidorMemoria[tipo] || []}
                          onActualizarCola={(nuevaCola) => handleActualizarCola(tipo, nuevaCola)}
                          onActualizarServidor={(nuevoServidor) => handleActualizarServidor(tipo, nuevoServidor)}
                          onRegistrarEvento={handleRegistrarEvento}
                          eventosDelTipo={eventosDelTipo}
                        />
                      );
                    })}
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Vista CRUD de eventos */}
        {vistaActiva === 'eventos' && (
          sesionActiva ? (
            <EventosTablaCRUD
              sesion={sesionActiva}
              usuarioActual={usuarioActual || 'aforador@aforo.local'}
              eventos={eventos}
            />
          ) : (
            <div className="p-8 text-center text-slate-500">
              Selecciona o crea una sesión para ver sus eventos.
            </div>
          )
        )}

        {/* Vista Historial de sesiones */}
        {vistaActiva === 'historial' && (
          <HistorialSesiones
            sesiones={sesiones}
            sesionActivaId={sesionActiva?.id || null}
            todosLosEventos={todosLosEventos}
            onSeleccionarSesion={(s) => {
              if (s.activa || s.estado === 'abierta') {
                localStorage.setItem('sesion_activa_id', s.id);
                setSesionActiva(s);
                setVistaActiva('conteo');
              } else {
                setSesionActiva(s);
                setVistaActiva('eventos');
              }
            }}
            onCerrarSesionActiva={handleCerrarSesionActiva}
            onEliminarSesionLocal={handleEliminarSesionLocal}
          />
        )}

        {/* Vista Papelera de sesiones (Soft Delete) */}
        {vistaActiva === 'papelera' && (
          <PapeleraSesiones
            sesiones={sesiones}
            todosLosEventos={todosLosEventos}
          />
        )}
      </main>

      {/* Modal de Autenticación con Google y lista blanca */}
      <AuthModal
        abierto={modalAuthAbierto}
        obligatorio={!usuarioActual}
        onCerrar={() => setModalAuthAbierto(false)}
        onExito={(email) => {
          setUsuarioActual(email);
        }}
      />

      {/* Modal de Nueva Sesión con Checkboxes de los 6 tipos */}
      <NuevaSesionModal
        abierto={modalNuevaSesionAbierto}
        usuarioActual={usuarioActual || 'aforador@aforo.local'}
        onCerrar={() => setModalNuevaSesionAbierto(false)}
        onSesionCreada={(nueva) => {
          setSesiones((prev) => [nueva, ...prev]);
          setSesionActiva(nueva);
          localStorage.setItem('sesion_activa_id', nueva.id);
          setVistaActiva('conteo');
        }}
      />

      {/* Modal de Finalizar Sesión de Conteo */}
      <FinalizarSesionModal
        abierto={modalFinalizarAbierto}
        sesion={sesionActiva}
        onCerrar={() => setModalFinalizarAbierto(false)}
        onSesionFinalizada={handleFinalizarSesionConfirmada}
      />

      {/* Modal de Unirse a Sesión Compartida */}
      <UnirseSesionModal
        abierto={modalUnirseAbierto}
        sesion={sesionParaUnirse}
        usuarioActual={usuarioActual || 'aforador@aforo.local'}
        onCerrar={() => {
          setModalUnirseAbierto(false);
          setSesionParaUnirse(null);
        }}
        onUnirseExitoso={(sesionActualizada) => {
          setSesionActiva(sesionActualizada);
          localStorage.setItem('sesion_activa_id', sesionActualizada.id);
          setVistaActiva('conteo');
          setModalUnirseAbierto(false);
          setSesionParaUnirse(null);
        }}
      />{/* UnirseSesionModal end */}

      {/* Barra de navegación inferior — solo visible en móvil (md:hidden interno) */}
      <BottomNav
        vistaActiva={vistaActiva}
        onCambiarVista={setVistaActiva}
        totalEventos={eventos.filter((e) => !e.enPapelera).length}
        totalEnPapelera={sesiones.filter((s) => Boolean(s.enPapelera)).length}
        onAbrirNuevaSesion={() => {
          if (!usuarioActual) {
            setModalAuthAbierto(true);
          } else {
            setModalNuevaSesionAbierto(true);
          }
        }}
      />
    </div>
  );
}
