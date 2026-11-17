import React, { useState, useEffect, useRef } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  X,
  Play,
  Zap,
  Activity,
  MapPin,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Sparkles,
  SlidersHorizontal
} from 'lucide-react';
import type { SesionConteo, FaseSemaforo } from '../types/conteo';
import {
  calcularEstadoSemaforo,
  DURACION_CICLO_SEG,
  DURACION_VERDE_SEG,
  DURACION_AMARILLO_SEG,
  DURACION_ROJO_SEG,
  DURACION_AMARILLO_FINAL_SEG,
  CONFIG_SEMAFORO_POR_DEFECTO,
  normalizarTimestampMs
} from '../lib/semaforoUtils';
import { db, doc, updateDoc } from '../lib/firebase';

interface SemaforoCronometroProps {
  sesion: SesionConteo;
  usuario: string;
  onSincronizarLocal?: (inicioMs: number) => void;
}

// Reproductor de tonos web sintéticos (cero assets externos, ultra bajo retardo)
function reproducirTono(frecuencia: number, duracionMs: number = 70, tipo: OscillatorType = 'sine') {
  try {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tipo;
    osc.frequency.setValueAtTime(frecuencia, ctx.currentTime);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duracionMs / 1000);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duracionMs / 1000);
  } catch {
    // Ignorar si el navegador bloquea audio sin interacción previa
  }
}

export const SemaforoCronometro: React.FC<SemaforoCronometroProps> = ({
  sesion,
  usuario,
  onSincronizarLocal
}) => {
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());
  const [modalResincronizarAbierto, setModalResincronizarAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Preferencia de alertas sonoras y hápticas
  const [alertasHabilitadas, setAlertasHabilitadas] = useState<boolean>(() => {
    try {
      return localStorage.getItem('semaforo_alertas_activas') === 'true';
    } catch {
      return false;
    }
  });

  const toggleAlertas = () => {
    setAlertasHabilitadas((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('semaforo_alertas_activas', String(next));
      } catch {
        // Ignorar
      }
      if (next && navigator.vibrate) {
        navigator.vibrate(40);
        reproducirTono(880, 80);
      }
      return next;
    });
  };

  // Configuración de tiempos semafóricos de la sesión
  const config = sesion.configSemaforo || CONFIG_SEMAFORO_POR_DEFECTO;
  const duracionCiclo = config.cicloTotalSeg || DURACION_CICLO_SEG;
  const duracionVerde = config.verdeSeg ?? DURACION_VERDE_SEG;
  const duracionAmarillo1 = config.amarillo1Seg ?? DURACION_AMARILLO_SEG;
  const duracionRojo = config.rojoSeg ?? DURACION_ROJO_SEG;
  const duracionAmarillo2 = config.amarillo2Seg ?? DURACION_AMARILLO_FINAL_SEG;

  const limVerde = duracionVerde;
  const limAmarillo1 = limVerde + duracionAmarillo1;
  const limRojo = limAmarillo1 + duracionRojo;

  // Estado local inmediato cuando el usuario pulsa sincronizar o calibra (0ms)
  const [inicioCicloLocal, setInicioCicloLocal] = useState<number | null>(null);

  // Tick local a 80ms para suavidad visual continua (rotación analógica fluida)
  useEffect(() => {
    const interval = setInterval(() => {
      setAhoraMs(Date.now());
    }, 80);
    return () => clearInterval(interval);
  }, []);

  const inicioRemoto = normalizarTimestampMs(sesion.inicioCicloSemaforo);
  const inicioEfectivo = inicioCicloLocal ?? inicioRemoto;
  const estado = calcularEstadoSemaforo(ahoraMs, inicioEfectivo, config);

  // Referencias para control de alertas de cambio de fase
  const faseAnteriorRef = useRef<FaseSemaforo | null>(null);
  const ultimoSegundoAlertaRef = useRef<number | null>(null);

  useEffect(() => {
    if (!estado.sincronizado || !alertasHabilitadas) return;

    // Alerta de cambio de fase
    if (faseAnteriorRef.current && faseAnteriorRef.current !== estado.fase) {
      if (estado.fase === 'verde') {
        reproducirTono(880, 100);
        setTimeout(() => reproducirTono(1174, 120), 120);
        if (navigator.vibrate) navigator.vibrate([60, 40, 60]);
      } else if (estado.fase === 'amarillo') {
        reproducirTono(659, 100);
        if (navigator.vibrate) navigator.vibrate(60);
      } else if (estado.fase === 'rojo') {
        reproducirTono(440, 140);
        if (navigator.vibrate) navigator.vibrate([100]);
      }
    }
    faseAnteriorRef.current = estado.fase;

    // Alerta sutil en los últimos 3 segundos (cuenta regresiva sonora)
    if (
      estado.segundosRestantesFase !== null &&
      estado.segundosRestantesFase <= 3 &&
      estado.segundosRestantesFase > 0 &&
      ultimoSegundoAlertaRef.current !== estado.segundosRestantesFase
    ) {
      ultimoSegundoAlertaRef.current = estado.segundosRestantesFase;
      reproducirTono(587, 40, 'triangle');
      if (navigator.vibrate) navigator.vibrate(25);
    }
  }, [estado.fase, estado.segundosRestantesFase, estado.sincronizado, alertasHabilitadas]);

  // Sincronización completa (inicio de verde o fase seleccionada)
  const handleSincronizarPorFase = async (faseDetectada: 'verde' | 'amarillo1' | 'rojo' | 'amarillo2' = 'verde') => {
    const ahora = Date.now();
    let nuevoInicio = ahora;

    if (faseDetectada === 'verde') {
      nuevoInicio = ahora;
    } else if (faseDetectada === 'amarillo1') {
      nuevoInicio = ahora - duracionVerde * 1000;
    } else if (faseDetectada === 'rojo') {
      nuevoInicio = ahora - (duracionVerde + duracionAmarillo1) * 1000;
    } else if (faseDetectada === 'amarillo2') {
      nuevoInicio = ahora - (duracionVerde + duracionAmarillo1 + duracionRojo) * 1000;
    }

    // 1. REFLEJO VISUAL INSTANTÁNEO EN LOCAL (0 ms)
    setInicioCicloLocal(nuevoInicio);
    if (onSincronizarLocal) {
      onSincronizarLocal(nuevoInicio);
    }
    if (navigator.vibrate) navigator.vibrate([80, 40, 80]);

    setModalResincronizarAbierto(false);
    const nombreFase =
      faseDetectada === 'verde'
        ? 'VERDE'
        : faseDetectada === 'amarillo1'
        ? 'ÁMBAR 1'
        : faseDetectada === 'rojo'
        ? 'ROJO'
        : 'ÁMBAR 2';
    setMensajeExito(`¡Semáforo sincronizado en fase ${nombreFase}!`);
    setTimeout(() => setMensajeExito(null), 3500);

    setGuardando(true);
    try {
      // 2. Persistir en Firestore para todo el equipo en campo
      await updateDoc(doc(db, 'sesiones', sesion.id), {
        inicioCicloSemaforo: nuevoInicio,
        ultimaResincronizacionSemaforo: ahora,
        sincronizadoPor: usuario
      });
    } catch (err) {
      console.error('Error al sincronizar semáforo en Firestore:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Ajuste fino / micro-calibración (+1s / -1s / +2s / -2s)
  const handleAjustarOffsetSeg = async (segundosOffset: number) => {
    const actual = inicioEfectivo || Date.now();
    // Para adelantar el temporizador +1s, retrocedemos el tiempo de inicio en 1s (-1000ms)
    const nuevoInicio = actual - segundosOffset * 1000;

    setInicioCicloLocal(nuevoInicio);
    if (onSincronizarLocal) {
      onSincronizarLocal(nuevoInicio);
    }
    if (navigator.vibrate) navigator.vibrate(35);

    const textoSigno = segundosOffset > 0 ? `+${segundosOffset}s` : `${segundosOffset}s`;
    setMensajeExito(`Calibración fina aplicada: ${textoSigno}`);
    setTimeout(() => setMensajeExito(null), 2200);

    try {
      await updateDoc(doc(db, 'sesiones', sesion.id), {
        inicioCicloSemaforo: nuevoInicio,
        ultimaResincronizacionSemaforo: Date.now(),
        sincronizadoPor: `${usuario.split('@')[0]} (offset ${textoSigno})`
      });
    } catch (err) {
      console.error('Error al guardar calibración fina:', err);
    }
  };

  // Parámetros matemáticos para el Tacómetro Circular SVG
  // Radio 92px, centro (120, 120), viewBox "0 0 240 240"
  const SVG_R = 92;
  const SVG_CX = 120;
  const SVG_CY = 120;
  const CIRCUNFERENCIA = 2 * Math.PI * SVG_R; // ~578.05 px

  // Longitudes de arco proporcionales al ciclo configurado
  const arcVerde = (duracionVerde / duracionCiclo) * CIRCUNFERENCIA;
  const arcAmarillo1 = (duracionAmarillo1 / duracionCiclo) * CIRCUNFERENCIA;
  const arcRojo = (duracionRojo / duracionCiclo) * CIRCUNFERENCIA;
  const arcAmarillo2 = (duracionAmarillo2 / duracionCiclo) * CIRCUNFERENCIA;

  const GAP_SEGMENTO = 2.5; // Brecha estética entre segmentos físicos

  // Segundo exacto dentro del ciclo continuo [0, duracionCiclo)
  const secExacto = estado.segundoEnCicloExacto ?? 0;

  // CORRECCIÓN MATEMÁTICA CRÍTICA:
  // Como el elemento <svg> tiene aplicada la clase CSS '-rotate-90' (rotación antihoraria de 90° para que el strokeDashoffset comience arriba en las 12:00),
  // las coordenadas polares interiores (x, y) que inician en ángulo 0 se alinean NATURALMENTE a las 12:00!
  // No se debe restar 90° nuevamente aquí para evitar el desfase de 180°.
  const anguloCursorRad = (secExacto / duracionCiclo) * 2 * Math.PI;
  const cursorX = SVG_CX + SVG_R * Math.cos(anguloCursorRad);
  const cursorY = SVG_CY + SVG_R * Math.sin(anguloCursorRad);

  // Alerta de cambio inminente en los últimos 3 segundos de cualquier fase
  const esAlertaCambio = estado.segundosRestantesFase !== null && estado.segundosRestantesFase <= 3;

  // Determinación de subfase de amarillo (post-verde o pre-verde)
  const esAmarilloPostVerde = estado.fase === 'amarillo' && secExacto >= limVerde && secExacto < limAmarillo1;
  const esAmarilloPreVerde = estado.fase === 'amarillo' && secExacto >= limRojo;

  // Marcas de escala (tick marks) para estética de instrumento de precisión
  const cantidadMarcas = Math.min(26, Math.floor(duracionCiclo / 5));
  const marcasTicks = Array.from({ length: cantidadMarcas }, (_, i) => {
    const s = i * (duracionCiclo / cantidadMarcas);
    const angle = (s / duracionCiclo) * 2 * Math.PI;
    const esMayor = i % 2 === 0;
    const rIn = esMayor ? SVG_R - 16 : SVG_R - 14;
    const rOut = SVG_R - 10;
    return {
      x1: SVG_CX + rIn * Math.cos(angle),
      y1: SVG_CY + rIn * Math.sin(angle),
      x2: SVG_CX + rOut * Math.cos(angle),
      y2: SVG_CY + rOut * Math.sin(angle),
      esMayor
    };
  });

  return (
    <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-700/60 rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
      {/* Resplandor ambiental de fase suave */}
      <div
        className={`absolute -top-24 -right-24 w-80 h-80 rounded-full blur-3xl pointer-events-none transition-all duration-700 ${
          estado.fase === 'verde'
            ? 'bg-emerald-500/15'
            : estado.fase === 'amarillo'
            ? 'bg-amber-500/15'
            : estado.fase === 'rojo'
            ? 'bg-rose-500/15'
            : 'bg-slate-700/10'
        }`}
      />

      {/* ENCABEZADO SUPERIOR */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 relative">
        <div className="flex items-center gap-3">
          {/* Indicador de actividad semafórica */}
          <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
            <Activity
              className={`w-5 h-5 ${
                estado.fase === 'verde'
                  ? 'text-emerald-400 animate-pulse'
                  : estado.fase === 'amarillo'
                  ? 'text-amber-400 animate-pulse'
                  : estado.fase === 'rojo'
                  ? 'text-rose-400 animate-pulse'
                  : 'text-slate-500'
              }`}
            />
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-black text-white tracking-tight">
                Ciclo Semafórico Continuo
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                {duracionCiclo}s ({duracionVerde}V / {duracionAmarillo1}A / {duracionRojo}R / {duracionAmarillo2}A)
              </span>
              {sesion.ubicacion && (
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="truncate max-w-[200px]">{sesion.ubicacion}</span>
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              {estado.sincronizado
                ? 'Sincronizado colaborativamente para todo el equipo en tiempo real'
                : 'Semáforo sin sincronizar. Presiona el botón al inicio de la fase deseada.'}
            </p>
          </div>
        </div>

        {/* ACCIONES SUPERIORES: ALERTAS ACÚSTICAS Y RESINCRONIZACIÓN */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleAlertas}
            className={`touch-btn text-xs font-bold px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
              alertasHabilitadas
                ? 'bg-blue-600/20 text-blue-300 border-blue-500/40 shadow-sm'
                : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
            }`}
            title={alertasHabilitadas ? 'Sonido y vibración activos' : 'Activar avisos sonoros y hápticos de cambio de fase'}
          >
            {alertasHabilitadas ? <Volume2 className="w-3.5 h-3.5 text-blue-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">{alertasHabilitadas ? 'Sonido ON' : 'Sonido OFF'}</span>
          </button>

          {estado.sincronizado ? (
            <button
              type="button"
              onClick={() => setModalResincronizarAbierto(true)}
              className="touch-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer hover:border-slate-500 active:scale-95"
              title="Ajustar el tiempo cero si el semáforo en campo se ha desfasado"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Calibrar Fase</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleSincronizarPorFase('verde')}
              disabled={guardando}
              className="touch-btn text-xs font-black px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border border-emerald-400 shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer active:scale-95 animate-pulse"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{guardando ? 'Sincronizando...' : 'Iniciar en Verde'}</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK DE ÉXITO O CALIBRACIÓN */}
      {mensajeExito && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center justify-between gap-2 animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{mensajeExito}</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
        </div>
      )}

      {/* CONTENIDO PRINCIPAL: HUD TACÓMETRO DINÁMICO */}
      {estado.sincronizado ? (
        <div className="mt-4 space-y-4 relative">
          {/* BANNER DE ALERTA: ÚLTIMOS 3 SEGUNDOS DE CADA FASE */}
          {esAlertaCambio && (
            <div className="p-2.5 rounded-2xl bg-amber-500/20 border border-amber-400/80 text-amber-200 text-xs font-bold flex items-center justify-between shadow-lg shadow-amber-500/15 animate-pulse">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping" />
                <span>
                  {estado.fase === 'verde'
                    ? `⚠️ CAMBIO INMINENTE: Verde finalizando ➔ Fase Ámbar (${duracionAmarillo1}s)`
                    : estado.fase === 'amarillo' && esAmarilloPostVerde
                    ? `🛑 CAMBIO INMINENTE: Ámbar finalizando ➔ Fase Roja (${duracionRojo}s)`
                    : estado.fase === 'rojo'
                    ? `⚡ PREPARACIÓN: Rojo finalizando ➔ Ámbar de arranque (${duracionAmarillo2}s)`
                    : `🟢 CAMBIO INMINENTE: Ámbar finalizando ➔ Fase Verde (${duracionVerde}s)`}
                </span>
              </div>
              <span className="font-mono text-sm font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg">
                {estado.segundosRestantesFase}s
              </span>
            </div>
          )}

          {/* GRID CENTRAL: LENTES LED FÍSICAS + TACÓMETRO CIRCULAR + MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* 1. LENTES LED FÍSICAS CON CAJA REALISTA DE SEMÁFORO */}
            <div className="md:col-span-3 flex md:flex-col items-center justify-around md:justify-center gap-3.5 bg-slate-950/90 border border-slate-800 rounded-2xl p-3.5 shadow-inner">
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest hidden md:block text-center border-b border-slate-800/80 pb-1.5 w-full">
                Semáforo Real
              </div>

              {/* LUZ ROJA */}
              <div className="flex items-center md:flex-col gap-2">
                <div
                  className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all duration-300 ${
                    estado.fase === 'rojo'
                      ? 'bg-rose-500 shadow-[0_0_35px_rgba(244,63,94,1),0_0_60px_rgba(244,63,94,0.6)] ring-4 ring-rose-400/80'
                      : 'bg-rose-950/20 border border-rose-900/40 opacity-25'
                  }`}
                  title={`Luz Roja de Detención (${duracionRojo}s)`}
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/25" />
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-black uppercase ${estado.fase === 'rojo' ? 'text-rose-400' : 'text-slate-500'}`}>
                    Rojo
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">{duracionRojo}s</div>
                </div>
              </div>

              {/* LUZ ÁMBAR */}
              <div className="flex items-center md:flex-col gap-2">
                <div
                  className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all duration-300 ${
                    estado.fase === 'amarillo'
                      ? 'bg-amber-400 shadow-[0_0_35px_rgba(245,158,11,1),0_0_60px_rgba(245,158,11,0.6)] ring-4 ring-amber-300/80'
                      : 'bg-amber-950/20 border border-amber-900/40 opacity-25'
                  }`}
                  title={`Luz Ámbar (${duracionAmarillo1}s post-verde / ${duracionAmarillo2}s pre-verde)`}
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/25" />
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-black uppercase ${estado.fase === 'amarillo' ? 'text-amber-400' : 'text-slate-500'}`}>
                    Ámbar
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    {esAmarilloPreVerde ? `${duracionAmarillo2}s` : `${duracionAmarillo1}s`}
                  </div>
                </div>
              </div>

              {/* LUZ VERDE */}
              <div className="flex items-center md:flex-col gap-2">
                <div
                  className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all duration-300 ${
                    estado.fase === 'verde'
                      ? 'bg-emerald-400 shadow-[0_0_35px_rgba(16,185,129,1),0_0_60px_rgba(16,185,129,0.6)] ring-4 ring-emerald-300/80'
                      : 'bg-emerald-950/20 border border-emerald-900/40 opacity-25'
                  }`}
                  title={`Luz Verde de Paso (${duracionVerde}s)`}
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/25" />
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-black uppercase ${estado.fase === 'verde' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    Verde
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">{duracionVerde}s</div>
                </div>
              </div>
            </div>

            {/* 2. TACÓMETRO CIRCULAR SVG CON ALINEACIÓN PERFECTA */}
            <div className="md:col-span-6 flex flex-col items-center justify-center relative py-2">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                {/* SVG Dial - Rotado -90deg por CSS para que el arco inicie a las 12:00 en punto */}
                <svg
                  className="w-full h-full transform -rotate-90 filter drop-shadow-2xl"
                  viewBox="0 0 240 240"
                  aria-label={`Tacómetro semafórico ciclo de ${duracionCiclo} segundos`}
                  role="img"
                >
                  {/* Pistas base de fondo */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#020617"
                    strokeWidth="16"
                  />
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                    strokeOpacity="0.7"
                  />

                  {/* Marcas de escala (ticks analógicos) */}
                  {marcasTicks.map((t, idx) => (
                    <line
                      key={idx}
                      x1={t.x1}
                      y1={t.y1}
                      x2={t.x2}
                      y2={t.y2}
                      stroke="#475569"
                      strokeWidth={t.esMayor ? 1.5 : 0.8}
                      strokeOpacity={t.esMayor ? 0.6 : 0.3}
                    />
                  ))}

                  {/* 1. Segmento VERDE */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={estado.fase === 'verde' ? 14 : 10}
                    strokeDasharray={`${Math.max(0, arcVerde - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-GAP_SEGMENTO / 2}
                    className={`transition-all duration-300 ${
                      estado.fase === 'verde'
                        ? 'opacity-100 filter drop-shadow-[0_0_12px_rgba(16,185,129,0.9)]'
                        : 'opacity-20'
                    }`}
                  />

                  {/* 2. Segmento AMARILLO 1 (post-verde) */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={esAmarilloPostVerde ? 14 : 10}
                    strokeDasharray={`${Math.max(0, arcAmarillo1 - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-(arcVerde + GAP_SEGMENTO / 2)}
                    className={`transition-all duration-300 ${
                      esAmarilloPostVerde
                        ? 'opacity-100 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                        : 'opacity-20'
                    }`}
                  />

                  {/* 3. Segmento ROJO */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={estado.fase === 'rojo' ? 14 : 10}
                    strokeDasharray={`${Math.max(0, arcRojo - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-(arcVerde + arcAmarillo1 + GAP_SEGMENTO / 2)}
                    className={`transition-all duration-300 ${
                      estado.fase === 'rojo'
                        ? 'opacity-100 filter drop-shadow-[0_0_12px_rgba(244,63,94,0.9)]'
                        : 'opacity-20'
                    }`}
                  />

                  {/* 4. Segmento AMARILLO 2 (pre-verde) */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={esAmarilloPreVerde ? 14 : 10}
                    strokeDasharray={`${Math.max(0, arcAmarillo2 - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-(arcVerde + arcAmarillo1 + arcRojo + GAP_SEGMENTO / 2)}
                    className={`transition-all duration-300 ${
                      esAmarilloPreVerde
                        ? 'opacity-100 filter drop-shadow-[0_0_12px_rgba(245,158,11,0.9)]'
                        : 'opacity-20'
                    }`}
                  />

                  {/* Cursor luminoso - POSICIÓN CORREGIDA: Sincronizado exactamente con el arco */}
                  <circle
                    cx={cursorX}
                    cy={cursorY}
                    r="7"
                    fill="#ffffff"
                    stroke={
                      estado.fase === 'verde'
                        ? '#10b981'
                        : estado.fase === 'amarillo'
                        ? '#f59e0b'
                        : '#f43f5e'
                    }
                    strokeWidth="3.5"
                    className="filter drop-shadow-[0_0_10px_rgba(255,255,255,1)]"
                  />
                </svg>

                {/* CONTENIDO INTERIOR DEL TACÓMETRO: NÚMERO Y FASE */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {/* Badge de Fase Activa */}
                  <div
                    className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider border shadow-md ${
                      estado.fase === 'verde'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-emerald-500/20'
                        : estado.fase === 'amarillo'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-amber-500/20'
                        : estado.fase === 'rojo'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-rose-500/20'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    {estado.fase === 'verde'
                      ? 'Fase Verde'
                      : estado.fase === 'amarillo'
                      ? esAmarilloPostVerde
                        ? 'Ámbar (Hacia Rojo)'
                        : 'Ámbar (Hacia Verde)'
                      : estado.fase === 'rojo'
                      ? 'Fase Roja'
                      : 'Sin fase'}
                  </div>

                  {/* Contador de Segundos Restantes en Fase */}
                  <div className="my-1">
                    <span
                      className={`text-5xl sm:text-6xl font-mono font-black tracking-tighter tabular-nums drop-shadow-md ${
                        estado.fase === 'verde'
                          ? 'text-emerald-400'
                          : estado.fase === 'amarillo'
                          ? 'text-amber-400'
                          : estado.fase === 'rojo'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }`}
                    >
                      {estado.segundosRestantesFase !== null ? estado.segundosRestantesFase : '--'}
                    </span>
                    <span className="text-sm font-sans font-bold text-slate-500 ml-1">s</span>
                  </div>

                  <span className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
                    Resta en Fase
                  </span>

                  {/* Detalle del ciclo actual */}
                  <div className="mt-1.5 px-2.5 py-0.5 rounded-lg bg-slate-950/80 border border-slate-800/80 text-[11px] font-mono text-slate-300">
                    Seg:{' '}
                    <strong className="text-white font-black">{estado.segundoEnCiclo}</strong> /{' '}
                    <span className="text-slate-400">{duracionCiclo}s</span>
                  </div>
                </div>
              </div>

              {/* Leyenda de fases en la base del dial */}
              <div className="flex items-center justify-center gap-3 text-[11px] font-mono text-slate-400 mt-2 flex-wrap">
                <span className="flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" /> Verde {duracionVerde}s
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-amber-400 shadow-sm shadow-amber-400" /> Ám. {duracionAmarillo1}s / {duracionAmarillo2}s
                </span>
                <span className="flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2 h-2 rounded-full bg-rose-400 shadow-sm shadow-rose-400" /> Rojo {duracionRojo}s
                </span>
              </div>
            </div>

            {/* 3. PANELES DE TELEMETRÍA Y CONTROLES DE CALIBRACIÓN RÁPIDA */}
            <div className="md:col-span-3 space-y-2.5">
              {/* Tarjeta Ciclo Actual */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                    Ciclo N°
                  </div>
                  <div className="text-2xl font-mono font-black text-blue-400 mt-0.5">
                    #{estado.numeroCiclo}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/30">
                    Continuo
                  </span>
                </div>
              </div>

              {/* Tarjeta Sincronización y Tiempo */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-black tracking-wider text-slate-400">
                    Sincronización
                  </span>
                  {estado.requiereResincronizacion ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>Calibrar</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Óptimo</span>
                    </span>
                  )}
                </div>

                <div className="text-slate-300 font-semibold text-xs flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Hace {estado.tiempoDesdeSincronizacionMin} min</span>
                </div>

                <div className="text-[10px] text-slate-500 truncate">
                  Por: <strong className="text-slate-400">{(sesion.sincronizadoPor || 'aforador').split('@')[0]}</strong>
                </div>

                {/* CONTROLES DE AJUSTE FINO (MICRO-CALIBRACIÓN EN VIVO) */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between text-[10px] text-slate-400 mb-1.5">
                    <span className="flex items-center gap-1 font-semibold">
                      <SlidersHorizontal className="w-3 h-3 text-blue-400" />
                      Micro-ajuste:
                    </span>
                    <span className="font-mono text-slate-500">±1s o ±2s</span>
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[11px] font-mono font-bold">
                    <button
                      type="button"
                      onClick={() => handleAjustarOffsetSeg(-2)}
                      className="touch-btn py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 hover:border-rose-500/50 flex items-center justify-center transition cursor-pointer"
                      title="Atrasar temporizador 2 segundos"
                    >
                      <Minus className="w-2.5 h-2.5 mr-0.5" />2s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAjustarOffsetSeg(-1)}
                      className="touch-btn py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-rose-300 border border-slate-700 hover:border-rose-500/50 flex items-center justify-center transition cursor-pointer"
                      title="Atrasar temporizador 1 segundo"
                    >
                      <Minus className="w-2.5 h-2.5 mr-0.5" />1s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAjustarOffsetSeg(+1)}
                      className="touch-btn py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 flex items-center justify-center transition cursor-pointer"
                      title="Adelantar temporizador 1 segundo"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" />1s
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAjustarOffsetSeg(+2)}
                      className="touch-btn py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 hover:border-emerald-500/50 flex items-center justify-center transition cursor-pointer"
                      title="Adelantar temporizador 2 segundos"
                    >
                      <Plus className="w-2.5 h-2.5 mr-0.5" />2s
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* BARRA VISUAL HORIZONTAL DE RESPALDO (TIMELINE DE DISTRIBUCIÓN) */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full h-3.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 relative shadow-inner">
              {/* Franja Verde */}
              <div
                style={{ width: `${(duracionVerde / duracionCiclo) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'verde' ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-emerald-950/80'
                }`}
                title={`Tramo Verde: 0 a ${limVerde}s`}
              />
              {/* Franja Amarillo 1 */}
              <div
                style={{ width: `${(duracionAmarillo1 / duracionCiclo) * 100}%` }}
                className={`h-full transition-opacity ${
                  esAmarilloPostVerde ? 'bg-amber-400 shadow-sm shadow-amber-300' : 'bg-amber-950/80'
                }`}
                title={`Tramo Ámbar 1: ${limVerde} a ${limAmarillo1}s`}
              />
              {/* Franja Rojo */}
              <div
                style={{ width: `${(duracionRojo / duracionCiclo) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'rojo' ? 'bg-rose-600 shadow-sm shadow-rose-500' : 'bg-rose-950/80'
                }`}
                title={`Tramo Rojo: ${limAmarillo1} a ${limRojo}s`}
              />
              {/* Franja Amarillo 2 */}
              <div
                style={{ width: `${(duracionAmarillo2 / duracionCiclo) * 100}%` }}
                className={`h-full transition-opacity ${
                  esAmarilloPreVerde ? 'bg-amber-400 shadow-sm shadow-amber-300' : 'bg-amber-950/80'
                }`}
                title={`Tramo Ámbar 2: ${limRojo} a ${duracionCiclo}s`}
              />

              {/* Aguja / Indicador de posición actual con resplandor */}
              {estado.segundoEnCicloExacto !== null && (
                <div
                  className="absolute top-0 bottom-0 w-2 bg-white shadow-[0_0_10px_rgba(255,255,255,1)] z-10 rounded-full transition-all duration-100 -translate-x-1/2"
                  style={{
                    left: `${(estado.segundoEnCicloExacto / duracionCiclo) * 100}%`
                  }}
                />
              )}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
              <span className="text-emerald-400">0s Verde ({duracionVerde}s)</span>
              <span className="text-amber-400">{limVerde}s Ám. ({duracionAmarillo1}s)</span>
              <span className="text-rose-400">{limAmarillo1}s Rojo ({duracionRojo}s)</span>
              <span className="text-amber-400">{limRojo}s Ám. ({duracionAmarillo2}s)</span>
              <span>{duracionCiclo}s</span>
            </div>
          </div>
        </div>
      ) : (
        /* PROMPT INICIAL CUANDO AÚN NO SE HA SINCRONIZADO */
        <div className="mt-4 p-5 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">
              El ciclo de {duracionCiclo} segundos no ha sido iniciado para esta sesión
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Observa el semáforo real de la intersección. Puedes sincronizarlo instantáneamente seleccionando la fase que acaba de comenzar:
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => handleSincronizarPorFase('verde')}
              disabled={guardando}
              className="touch-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/30 border border-emerald-400 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Acaba de pasar a VERDE</span>
            </button>
            <button
              type="button"
              onClick={() => handleSincronizarPorFase('rojo')}
              disabled={guardando}
              className="touch-btn inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-600/30 border border-rose-400 transition active:scale-95 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Acaba de pasar a ROJO</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE CALIBRACIÓN COLABORATIVA POR FASE */}
      {modalResincronizarAbierto && (
        <div
          className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-resinc-title"
        >
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setModalResincronizarAbierto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Cerrar modal de re-sincronización"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 id="modal-resinc-title" className="text-base font-bold text-white">
                  Calibrar y Re-sincronizar
                </h3>
                <p className="text-xs text-slate-400">
                  Alineación colaborativa del ciclo de {duracionCiclo} segundos
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Observa el semáforo real de la calle. Presiona la opción correspondiente al momento en que la luz cambie:
            </p>

            {/* BOTONES DE SINCRONIZACIÓN POR FASE DIRECTA */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => handleSincronizarPorFase('verde')}
                disabled={guardando}
                className="touch-btn w-full p-3 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/50 text-emerald-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
                  <span>Acaba de cambiar a <strong>VERDE</strong></span>
                </div>
                <span className="font-mono text-[10px] bg-emerald-500/30 px-2 py-0.5 rounded">t = 0s</span>
              </button>

              <button
                type="button"
                onClick={() => handleSincronizarPorFase('amarillo1')}
                disabled={guardando}
                className="touch-btn w-full p-3 rounded-2xl bg-amber-600/20 hover:bg-amber-600/30 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-amber-400 shadow-sm shadow-amber-400 shrink-0" />
                  <span>Acaba de cambiar a <strong>ÁMBAR 1</strong></span>
                </div>
                <span className="font-mono text-[10px] bg-amber-500/30 px-2 py-0.5 rounded">t = {limVerde}s</span>
              </button>

              <button
                type="button"
                onClick={() => handleSincronizarPorFase('rojo')}
                disabled={guardando}
                className="touch-btn w-full p-3 rounded-2xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/50 text-rose-300 font-bold text-xs flex items-center justify-between transition cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-3.5 h-3.5 rounded-full bg-rose-400 shadow-sm shadow-rose-400 shrink-0" />
                  <span>Acaba de cambiar a <strong>ROJO</strong></span>
                </div>
                <span className="font-mono text-[10px] bg-rose-500/30 px-2 py-0.5 rounded">t = {limAmarillo1}s</span>
              </button>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 text-blue-400 font-semibold">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Impacto en los datos existentes</span>
              </div>
              <p>
                La calibración sincroniza el tiempo cero hacia adelante para todo el equipo en tiempo real. Todos los aforos y eventos ya registrados previamente <strong>conservan intactos sus cálculos originales</strong>.
              </p>
            </div>

            <div className="flex items-center justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalResincronizarAbierto(false)}
                className="touch-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800 focus:outline-none"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
