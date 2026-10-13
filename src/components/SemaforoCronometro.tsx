import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Info,
  X,
  Play,
  Zap,
  Activity
} from 'lucide-react';
import type { SesionConteo } from '../types/conteo';
import {
  calcularEstadoSemaforo,
  DURACION_CICLO_SEG,
  DURACION_VERDE_SEG,
  DURACION_AMARILLO_SEG,
  DURACION_ROJO_SEG,
  DURACION_AMARILLO_FINAL_SEG,
  normalizarTimestampMs
} from '../lib/semaforoUtils';
import { db, doc, updateDoc } from '../lib/firebase';

interface SemaforoCronometroProps {
  sesion: SesionConteo;
  usuario: string;
  onSincronizarLocal?: (inicioMs: number) => void;
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

  // Estado local inmediato cuando el usuario pulsa sincronizar (0ms)
  const [inicioCicloLocal, setInicioCicloLocal] = useState<number | null>(null);

  // Tick local cada 250ms para refresco visual suave sin peticiones a red
  useEffect(() => {
    const interval = setInterval(() => {
      setAhoraMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const inicioRemoto = normalizarTimestampMs(sesion.inicioCicloSemaforo);
  const inicioEfectivo = inicioCicloLocal ?? inicioRemoto;
  const estado = calcularEstadoSemaforo(ahoraMs, inicioEfectivo);

  // Sincronizar o Re-sincronizar el ciclo semafórico
  const handleSincronizar = async () => {
    const ahora = Date.now();

    // 1. REFLEJO VISUAL INSTANTÁNEO EN LOCAL (0 ms)
    setInicioCicloLocal(ahora);
    if (onSincronizarLocal) {
      onSincronizarLocal(ahora);
    }

    setModalResincronizarAbierto(false);
    setMensajeExito('¡Semáforo sincronizado exitosamente en verde!');
    setTimeout(() => setMensajeExito(null), 4000);

    setGuardando(true);
    try {
      // 2. Persistir en Firestore para todo el equipo
      await updateDoc(doc(db, 'sesiones', sesion.id), {
        inicioCicloSemaforo: ahora,
        ultimaResincronizacionSemaforo: ahora,
        sincronizadoPor: usuario
      });
    } catch (err) {
      console.error('Error al sincronizar semáforo en Firestore:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Parámetros matemáticos para el Tacómetro Circular SVG
  // Radio 92px, centro (120, 120), viewBox "0 0 240 240"
  const SVG_R = 92;
  const SVG_CX = 120;
  const SVG_CY = 120;
  const CIRCUNFERENCIA = 2 * Math.PI * SVG_R; // ~578.05 px

  // Longitudes de arco proporcionales al ciclo de 95s
  const arcVerde = (DURACION_VERDE_SEG / DURACION_CICLO_SEG) * CIRCUNFERENCIA; // 18s -> ~109.5px
  const arcAmarillo1 = (DURACION_AMARILLO_SEG / DURACION_CICLO_SEG) * CIRCUNFERENCIA; // 3s -> ~18.25px
  const arcRojo = (DURACION_ROJO_SEG / DURACION_CICLO_SEG) * CIRCUNFERENCIA; // 72s -> ~436.8px
  const arcAmarillo2 = (DURACION_AMARILLO_FINAL_SEG / DURACION_CICLO_SEG) * CIRCUNFERENCIA; // 2s -> ~12.17px

  const GAP_SEGMENTO = 2.5; // Brecha estética entre segmentos físicos

  // Segundo exacto dentro del ciclo continuo [0, 95)
  const secExacto = estado.segundoEnCicloExacto ?? 0;

  // Ángulo de la aguja / cursor luminoso (0s arriba en -90°)
  const anguloCursorDeg = (secExacto / DURACION_CICLO_SEG) * 360 - 90;
  const anguloCursorRad = (anguloCursorDeg * Math.PI) / 180;
  const cursorX = SVG_CX + SVG_R * Math.cos(anguloCursorRad);
  const cursorY = SVG_CY + SVG_R * Math.sin(anguloCursorRad);

  // Alerta de cambio inminente en los últimos 3 segundos de cualquier fase
  const esAlertaCambio = estado.segundosRestantesFase !== null && estado.segundosRestantesFase <= 3;

  // Determinación de subfase de amarillo (post-verde o pre-verde)
  const esAmarilloPostVerde = estado.fase === 'amarillo' && secExacto < 21;
  const esAmarilloPreVerde = estado.fase === 'amarillo' && secExacto >= 93;

  return (
    <div className="relative bg-gradient-to-b from-slate-900/95 via-slate-900/90 to-slate-950/95 border border-slate-700/60 rounded-3xl p-4 sm:p-5 shadow-2xl overflow-hidden backdrop-blur-xl transition-all">
      {/* Resplandor ambiental suave según la fase activa */}
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
          {/* Mini badge de estado general */}
          <div className="w-10 h-10 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center shadow-inner">
            <Activity className={`w-5 h-5 ${
              estado.fase === 'verde'
                ? 'text-emerald-400 animate-pulse'
                : estado.fase === 'amarillo'
                ? 'text-amber-400 animate-pulse'
                : estado.fase === 'rojo'
                ? 'text-rose-400 animate-pulse'
                : 'text-slate-500'
            }`} />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight">
                Ciclo Semafórico Continuo
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                {DURACION_CICLO_SEG}s (18V / 3A / 72R / 2A)
              </span>
            </div>
            <p className="text-xs text-slate-400">
              {estado.sincronizado
                ? 'Sincronizado colaborativamente para todo el equipo en tiempo real'
                : 'Semáforo sin sincronizar. Presiona el botón al inicio de la fase verde.'}
            </p>
          </div>
        </div>

        {/* ACCIÓN DE SINCRONIZACIÓN / RESINCRONIZACIÓN */}
        <div className="flex items-center gap-2">
          {estado.sincronizado ? (
            <button
              type="button"
              onClick={() => setModalResincronizarAbierto(true)}
              className="touch-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer hover:border-slate-500 active:scale-95"
              title="Ajustar el tiempo cero si el semáforo en campo se ha desfasado"
            >
              <RotateCcw className="w-3.5 h-3.5 text-blue-400" />
              <span>Re-sincronizar</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSincronizar}
              disabled={guardando}
              className="touch-btn text-xs font-black px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white border border-emerald-400 shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition cursor-pointer active:scale-95 animate-pulse"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>{guardando ? 'Sincronizando...' : 'Iniciar ciclo en Verde'}</span>
            </button>
          )}
        </div>
      </div>

      {/* FEEDBACK DE ÉXITO */}
      {mensajeExito && (
        <div className="mt-3 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{mensajeExito}</span>
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
                    ? '⚠️ CAMBIO INMINENTE: Verde finalizando ➔ Fase Amarilla (3s)'
                    : estado.fase === 'amarillo' && esAmarilloPostVerde
                    ? '🛑 CAMBIO INMINENTE: Amarillo finalizando ➔ Fase Roja (72s)'
                    : estado.fase === 'rojo'
                    ? '⚡ PREPARACIÓN: Rojo finalizando ➔ Amarillo de arranque (2s)'
                    : '🟢 CAMBIO INMINENTE: Amarillo finalizando ➔ Fase Verde (18s)'}
                </span>
              </div>
              <span className="font-mono text-sm font-black bg-amber-400 text-slate-950 px-2 py-0.5 rounded-lg">
                {estado.segundosRestantesFase}s
              </span>
            </div>
          )}

          {/* GRID CENTRAL: LENTES LED FÍSICAS + TACÓMETRO CIRCULAR + MÉTRICAS */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
            {/* 1. LENTES LED FÍSICAS CON RESPLANDOR REAL */}
            <div className="md:col-span-3 flex md:flex-col items-center justify-around md:justify-center gap-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-3 shadow-inner">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block text-center">
                Semáforo Real
              </div>

              {/* LUZ ROJA (72s) */}
              <div className="flex items-center md:flex-col gap-2">
                <div
                  className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all duration-300 ${
                    estado.fase === 'rojo'
                      ? 'bg-rose-500 shadow-[0_0_28px_rgba(244,63,94,1),0_0_55px_rgba(244,63,94,0.6)] ring-4 ring-rose-400/80'
                      : 'bg-rose-950/30 border border-rose-900/40 opacity-30'
                  }`}
                  title="Luz Roja de Detención (72 segundos: 21s a 93s)"
                >
                  {/* Textura óptica interior del lente LED */}
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/20" />
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-black uppercase ${estado.fase === 'rojo' ? 'text-rose-400' : 'text-slate-500'}`}>
                    Rojo
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">72s</div>
                </div>
              </div>

              {/* LUZ AMARILLA (3s post-verde / 2s pre-verde) */}
              <div className="flex items-center md:flex-col gap-2">
                <div
                  className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all duration-300 ${
                    estado.fase === 'amarillo'
                      ? 'bg-amber-400 shadow-[0_0_28px_rgba(245,158,11,1),0_0_55px_rgba(245,158,11,0.6)] ring-4 ring-amber-300/80'
                      : 'bg-amber-950/30 border border-amber-900/40 opacity-30'
                  }`}
                  title="Luz Ámbar de Precaución (3s post-verde / 2s pre-verde)"
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/20" />
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-black uppercase ${estado.fase === 'amarillo' ? 'text-amber-400' : 'text-slate-500'}`}>
                    Ámbar
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">
                    {esAmarilloPreVerde ? '2s' : '3s'}
                  </div>
                </div>
              </div>

              {/* LUZ VERDE (18s) */}
              <div className="flex items-center md:flex-col gap-2">
                <div
                  className={`w-14 h-14 rounded-full relative flex items-center justify-center transition-all duration-300 ${
                    estado.fase === 'verde'
                      ? 'bg-emerald-400 shadow-[0_0_28px_rgba(16,185,129,1),0_0_55px_rgba(16,185,129,0.6)] ring-4 ring-emerald-300/80'
                      : 'bg-emerald-950/30 border border-emerald-900/40 opacity-30'
                  }`}
                  title="Luz Verde de Paso (18 segundos: 0s a 18s)"
                >
                  <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center">
                    <span className="w-4 h-4 rounded-full bg-white/20" />
                  </div>
                </div>
                <div className="text-center">
                  <div className={`text-[10px] font-black uppercase ${estado.fase === 'verde' ? 'text-emerald-400' : 'text-slate-500'}`}>
                    Verde
                  </div>
                  <div className="text-[9px] font-mono text-slate-500">18s</div>
                </div>
              </div>
            </div>

            {/* 2. TACÓMETRO CIRCULAR SVG DINÁMICO */}
            <div className="md:col-span-6 flex flex-col items-center justify-center relative py-2">
              <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
                {/* SVG Dial */}
                <svg
                  className="w-full h-full transform -rotate-90 filter drop-shadow-xl"
                  viewBox="0 0 240 240"
                >
                  {/* Track base de fondo */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#0f172a"
                    strokeWidth="14"
                  />
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#1e293b"
                    strokeWidth="12"
                    strokeOpacity="0.8"
                  />

                  {/* 1. Segmento VERDE: [0, 18s] */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={estado.fase === 'verde' ? 14 : 11}
                    strokeDasharray={`${Math.max(0, arcVerde - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-GAP_SEGMENTO / 2}
                    className={`transition-all duration-300 ${
                      estado.fase === 'verde'
                        ? 'opacity-100 filter drop-shadow-[0_0_10px_rgba(16,185,129,0.9)]'
                        : 'opacity-25'
                    }`}
                  />

                  {/* 2. Segmento AMARILLO 1 (post-verde): [18s, 21s] */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={esAmarilloPostVerde ? 14 : 11}
                    strokeDasharray={`${Math.max(0, arcAmarillo1 - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-(arcVerde + GAP_SEGMENTO / 2)}
                    className={`transition-all duration-300 ${
                      esAmarilloPostVerde
                        ? 'opacity-100 filter drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                        : 'opacity-25'
                    }`}
                  />

                  {/* 3. Segmento ROJO: [21s, 93s] */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#f43f5e"
                    strokeWidth={estado.fase === 'rojo' ? 14 : 11}
                    strokeDasharray={`${Math.max(0, arcRojo - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-(arcVerde + arcAmarillo1 + GAP_SEGMENTO / 2)}
                    className={`transition-all duration-300 ${
                      estado.fase === 'rojo'
                        ? 'opacity-100 filter drop-shadow-[0_0_10px_rgba(244,63,94,0.9)]'
                        : 'opacity-25'
                    }`}
                  />

                  {/* 4. Segmento AMARILLO 2 (pre-verde): [93s, 95s] */}
                  <circle
                    cx={SVG_CX}
                    cy={SVG_CY}
                    r={SVG_R}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={esAmarilloPreVerde ? 14 : 11}
                    strokeDasharray={`${Math.max(0, arcAmarillo2 - GAP_SEGMENTO)} ${CIRCUNFERENCIA}`}
                    strokeDashoffset={-(arcVerde + arcAmarillo1 + arcRojo + GAP_SEGMENTO / 2)}
                    className={`transition-all duration-300 ${
                      esAmarilloPreVerde
                        ? 'opacity-100 filter drop-shadow-[0_0_10px_rgba(245,158,11,0.9)]'
                        : 'opacity-25'
                    }`}
                  />

                  {/* Aguja / Marcador luminoso en la posición actual del ciclo */}
                  <circle
                    cx={cursorX}
                    cy={cursorY}
                    r="6.5"
                    fill="#ffffff"
                    stroke={
                      estado.fase === 'verde'
                        ? '#10b981'
                        : estado.fase === 'amarillo'
                        ? '#f59e0b'
                        : '#f43f5e'
                    }
                    strokeWidth="3"
                    className="filter drop-shadow-[0_0_8px_rgba(255,255,255,1)]"
                  />
                </svg>

                {/* CONTENIDO INTERIOR DEL TACÓMETRO: NÚMERO TABULAR GIGANTE */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                  {/* Fase activa en pill */}
                  <div
                    className={`text-[11px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border mb-1 flex items-center gap-1.5 ${
                      estado.fase === 'verde'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : estado.fase === 'amarillo'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        estado.fase === 'verde'
                          ? 'bg-emerald-400 animate-ping'
                          : estado.fase === 'amarillo'
                          ? 'bg-amber-400 animate-ping'
                          : 'bg-rose-400 animate-ping'
                      }`}
                    />
                    <span>
                      {estado.fase === 'verde'
                        ? 'Fase Verde'
                        : estado.fase === 'amarillo'
                        ? (esAmarilloPreVerde ? 'Amarillo Final' : 'Amarillo')
                        : 'Fase Roja'}
                    </span>
                  </div>

                  {/* NÚMERO MONOESPACIADO TABULAR GIGANTE */}
                  <div className="flex items-baseline justify-center">
                    <span
                      className={`font-mono font-tabular text-5xl sm:text-6xl font-black tracking-tight leading-none transition-colors ${
                        estado.fase === 'verde'
                          ? 'text-emerald-400 drop-shadow-[0_0_20px_rgba(16,185,129,0.7)]'
                          : estado.fase === 'amarillo'
                          ? 'text-amber-400 drop-shadow-[0_0_20px_rgba(245,158,11,0.7)]'
                          : 'text-rose-400 drop-shadow-[0_0_20px_rgba(244,63,94,0.7)]'
                      } ${esAlertaCambio ? 'animate-pulse scale-105' : ''}`}
                    >
                      {estado.segundosRestantesFase !== null
                        ? String(estado.segundosRestantesFase).padStart(2, '0')
                        : '--'}
                    </span>
                    <span className="text-xl font-bold font-mono text-slate-400 ml-1">s</span>
                  </div>

                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Resta en fase
                  </span>

                  {/* Segundo en ciclo total */}
                  <div className="mt-2 text-xs font-mono text-slate-300 font-bold bg-slate-950/70 px-3 py-1 rounded-xl border border-slate-800">
                    <span className="text-slate-400">Seg: </span>
                    <strong className="text-white font-tabular">{estado.segundoEnCiclo}</strong>
                    <span className="text-slate-500"> / {DURACION_CICLO_SEG}s</span>
                  </div>
                </div>
              </div>

              {/* Leyenda de fases alrededor del dial */}
              <div className="flex items-center justify-center gap-3 text-[10px] font-mono text-slate-400 mt-1">
                <span className="flex items-center gap-1 text-emerald-400">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" /> Verde 18s
                </span>
                <span className="flex items-center gap-1 text-amber-400">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Am. 3s / 2s
                </span>
                <span className="flex items-center gap-1 text-rose-400">
                  <span className="w-2 h-2 rounded-full bg-rose-400" /> Rojo 72s
                </span>
              </div>
            </div>

            {/* 3. PANELES DE TELEMETRÍA Y CALIBRACIÓN */}
            <div className="md:col-span-3 space-y-2.5">
              {/* Tarjeta Ciclo Actual */}
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Ciclo N°
                  </div>
                  <div className="text-xl font-mono font-black text-blue-400 mt-0.5">
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
              <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
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
                  Por: <strong className="text-slate-400">{sesion.sincronizadoPor || 'aforador'}</strong>
                </div>
              </div>

              {/* Re-calibrar si pasaron > 30 minutos */}
              {estado.requiereResincronizacion && (
                <button
                  type="button"
                  onClick={() => setModalResincronizarAbierto(true)}
                  className="touch-btn w-full p-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Re-sincronizar en campo</span>
                </button>
              )}
            </div>
          </div>

          {/* BARRA VISUAL HORIZONTAL DE RESPALDO (TIMELINE DE DISTRIBUCIÓN) */}
          <div className="space-y-1.5 pt-2">
            <div className="w-full h-3 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 relative">
              {/* Franja Verde: 18/95 */}
              <div
                style={{ width: `${(DURACION_VERDE_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'verde' ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-emerald-950/80'
                }`}
                title="Tramo Verde: 0 a 18s"
              />
              {/* Franja Amarillo 1: 3/95 */}
              <div
                style={{ width: `${(DURACION_AMARILLO_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  esAmarilloPostVerde ? 'bg-amber-400 shadow-sm shadow-amber-300' : 'bg-amber-950/80'
                }`}
                title="Tramo Amarillo 1: 18 a 21s"
              />
              {/* Franja Rojo: 72/95 */}
              <div
                style={{ width: `${(DURACION_ROJO_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'rojo' ? 'bg-rose-600 shadow-sm shadow-rose-500' : 'bg-rose-950/80'
                }`}
                title="Tramo Rojo: 21 a 93s"
              />
              {/* Franja Amarillo 2: 2/95 */}
              <div
                style={{ width: `${(DURACION_AMARILLO_FINAL_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  esAmarilloPreVerde ? 'bg-amber-400 shadow-sm shadow-amber-300' : 'bg-amber-950/80'
                }`}
                title="Tramo Amarillo 2: 93 a 95s"
              />

              {/* Indicador de posición actual (aguja en vivo) */}
              {estado.segundoEnCicloExacto !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1.5 bg-white shadow-[0_0_8px_rgba(255,255,255,1)] z-10 transition-all duration-200"
                  style={{
                    left: `${(estado.segundoEnCicloExacto / DURACION_CICLO_SEG) * 100}%`
                  }}
                />
              )}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
              <span className="text-emerald-400">0s Verde (18s)</span>
              <span className="text-amber-400">18s Am. (3s)</span>
              <span className="text-rose-400">21s Rojo (72s)</span>
              <span className="text-amber-400">93s Am. (2s)</span>
              <span>{DURACION_CICLO_SEG}s</span>
            </div>
          </div>
        </div>
      ) : (
        /* PROMPT INICIAL CUANDO AÚN NO SE HA SINCRONIZADO */
        <div className="mt-4 p-5 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mx-auto">
            <Zap className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-white">
              El ciclo de {DURACION_CICLO_SEG} segundos no ha sido iniciado para esta sesión
            </h4>
            <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
              Observa el semáforo real de la intersección. En el momento exacto en que la luz cambie a <strong>VERDE</strong>, presiona el botón inferior para sincronizar a todo el equipo simultáneamente.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSincronizar}
            disabled={guardando}
            className="touch-btn inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 border border-emerald-400 transition active:scale-95 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>{guardando ? 'Sincronizando...' : 'Sincronizar en inicio de VERDE'}</span>
          </button>
        </div>
      )}

      {/* MODAL DE CONFIRMACIÓN DE RE-SINCRONIZACIÓN */}
      {modalResincronizarAbierto && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <button
              type="button"
              onClick={() => setModalResincronizarAbierto(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/15 border border-blue-500/30 flex items-center justify-center text-blue-400">
                <RotateCcw className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">¿Re-sincronizar semáforo?</h3>
                <p className="text-xs text-slate-400">Calibración colaborativa del ciclo de {DURACION_CICLO_SEG} segundos</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Presiona <strong>Confirmar</strong> en el instante exacto en que el semáforo real cambie a <strong>VERDE</strong>.
              </p>
              <p className="text-slate-400 text-[11px] flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <span>
                  Esto actualizará el tiempo cero para todos los miembros del equipo en tiempo real. Los cruces y eventos que ya se hayan guardado <strong>mantendrán intactos sus datos</strong> calculados originalmente.
                </span>
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setModalResincronizarAbierto(false)}
                disabled={guardando}
                className="touch-btn px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white bg-slate-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSincronizar}
                disabled={guardando}
                className="touch-btn px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400 transition flex items-center gap-2"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>{guardando ? 'Guardando...' : 'Confirmar nuevo inicio en VERDE'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
