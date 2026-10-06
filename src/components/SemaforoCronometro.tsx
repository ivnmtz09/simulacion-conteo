import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  Radio,
  Clock,
  Info,
  X
} from 'lucide-react';
import type { SesionConteo } from '../types/conteo';
import {
  calcularEstadoSemaforo,
  DURACION_CICLO_SEG,
  DURACION_VERDE_SEG,
  DURACION_AMARILLO_SEG,
  DURACION_ROJO_SEG
} from '../lib/semaforoUtils';
import { db, doc, updateDoc } from '../lib/firebase';

interface SemaforoCronometroProps {
  sesion: SesionConteo;
  usuario: string;
}

export const SemaforoCronometro: React.FC<SemaforoCronometroProps> = ({
  sesion,
  usuario
}) => {
  const [ahoraMs, setAhoraMs] = useState<number>(() => Date.now());
  const [modalResincronizarAbierto, setModalResincronizarAbierto] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);

  // Tick local cada 250ms para refresco visual suave sin peticiones a red
  useEffect(() => {
    const interval = setInterval(() => {
      setAhoraMs(Date.now());
    }, 250);
    return () => clearInterval(interval);
  }, []);

  const estado = calcularEstadoSemaforo(ahoraMs, sesion.inicioCicloSemaforo);

  // Sincronizar o Re-sincronizar el ciclo semafórico
  const handleSincronizar = async () => {
    setGuardando(true);
    const ahora = Date.now();
    try {
      await updateDoc(doc(db, 'sesiones', sesion.id), {
        inicioCicloSemaforo: ahora,
        ultimaResincronizacionSemaforo: ahora,
        sincronizadoPor: usuario
      });

      setModalResincronizarAbierto(false);
      setMensajeExito('¡Semáforo sincronizado exitosamente en verde!');
      setTimeout(() => setMensajeExito(null), 4000);
    } catch (err) {
      console.error('Error al sincronizar semáforo en Firestore:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 sm:p-5 shadow-xl relative overflow-hidden transition-all">
      {/* Fondo degradado suave según fase */}
      <div
        className={`absolute inset-0 opacity-10 pointer-events-none transition-colors duration-700 ${
          estado.fase === 'verde'
            ? 'bg-emerald-500'
            : estado.fase === 'amarillo'
            ? 'bg-amber-500'
            : estado.fase === 'rojo'
            ? 'bg-rose-500'
            : 'bg-slate-700'
        }`}
      />

      {/* ENCABEZADO */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80 relative">
        <div className="flex items-center gap-3">
          {/* Luz semafórica física viva */}
          <div className="p-1.5 rounded-2xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 shadow-inner">
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                estado.fase === 'rojo'
                  ? 'bg-rose-500 shadow-md shadow-rose-500/80 ring-2 ring-rose-400'
                  : 'bg-rose-950/80 opacity-40'
              }`}
              title="Luz Roja (72s)"
            />
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                estado.fase === 'amarillo'
                  ? 'bg-amber-400 shadow-md shadow-amber-400/80 ring-2 ring-amber-300'
                  : 'bg-amber-950/80 opacity-40'
              }`}
              title="Luz Amarilla (3s)"
            />
            <span
              className={`w-3.5 h-3.5 rounded-full transition-all duration-300 ${
                estado.fase === 'verde'
                  ? 'bg-emerald-400 shadow-md shadow-emerald-400/80 ring-2 ring-emerald-300'
                  : 'bg-emerald-950/80 opacity-40'
              }`}
              title="Luz Verde (18s)"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold text-white tracking-tight flex items-center gap-2">
                <span>Ciclo Semafórico Continuo</span>
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/30 font-bold">
                {DURACION_CICLO_SEG}s (18V / 3A / 72R)
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
              className="touch-btn text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition cursor-pointer hover:border-slate-500"
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
              <Radio className="w-4 h-4" />
              <span>{guardando ? 'Sincronizando...' : '🟢 Iniciar ciclo en Verde'}</span>
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

      {/* CONTENIDO PRINCIPAL: ESTADO EN VIVO vs PROMPT SIN SINCRONIZAR */}
      {estado.sincronizado ? (
        <div className="mt-3.5 space-y-3 relative">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Panel de Fase Actual */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                estado.fase === 'verde'
                  ? 'bg-emerald-950/40 border-emerald-500/50 shadow-md shadow-emerald-900/20'
                  : estado.fase === 'amarillo'
                  ? 'bg-amber-950/40 border-amber-500/50 shadow-md shadow-amber-900/20'
                  : 'bg-rose-950/40 border-rose-500/50 shadow-md shadow-rose-900/20'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl select-none">
                  {estado.fase === 'verde' ? '🟢' : estado.fase === 'amarillo' ? '🟡' : '🔴'}
                </span>
                <div>
                  <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                    Fase en Curso
                  </div>
                  <div
                    className={`text-base font-black uppercase ${
                      estado.fase === 'verde'
                        ? 'text-emerald-300'
                        : estado.fase === 'amarillo'
                        ? 'text-amber-300'
                        : 'text-rose-300'
                    }`}
                  >
                    {estado.fase}
                  </div>
                </div>
              </div>

              {/* Cuenta regresiva de la fase */}
              <div className="text-right font-mono">
                <div className="text-[10px] text-slate-400">Resta</div>
                <div
                  className={`text-xl font-black ${
                    estado.fase === 'verde'
                      ? 'text-emerald-400'
                      : estado.fase === 'amarillo'
                      ? 'text-amber-400'
                      : 'text-rose-400'
                  }`}
                >
                  {estado.segundosRestantesFase}s
                </div>
              </div>
            </div>

            {/* Panel de Progreso en Ciclo */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Segundo en Ciclo
                </div>
                <div className="text-xl font-mono font-black text-white mt-0.5">
                  {estado.segundoEnCiclo} <span className="text-xs text-slate-500">/ {DURACION_CICLO_SEG}s</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] text-slate-400 uppercase font-bold">Ciclo N°</div>
                <div className="text-sm font-mono font-bold text-blue-400 mt-0.5">
                  #{estado.numeroCiclo}
                </div>
              </div>
            </div>

            {/* Panel de Tiempos y Calibración */}
            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex items-center justify-between text-xs">
              <div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Sincronización
                </div>
                <div className="text-slate-300 font-semibold mt-0.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-400" />
                  <span>Hace {estado.tiempoDesdeSincronizacionMin} min</span>
                </div>
                <div className="text-[10px] text-slate-500 truncate max-w-[130px]">
                  Por: {sesion.sincronizadoPor || 'aforador'}
                </div>
              </div>

              {estado.requiereResincronizacion ? (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                    <AlertTriangle className="w-3 h-3" />
                    <span>Verificar</span>
                  </span>
                </div>
              ) : (
                <div className="text-right">
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Óptimo</span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Barra visual de distribución del ciclo (18s Verde | 3s Amarillo | 72s Rojo) */}
          <div className="space-y-1">
            <div className="w-full h-2.5 bg-slate-950 rounded-full overflow-hidden flex border border-slate-800 relative">
              {/* Franja Verde: 18/93 = 19.35% */}
              <div
                style={{ width: `${(DURACION_VERDE_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'verde' ? 'bg-emerald-500 shadow-sm shadow-emerald-400' : 'bg-emerald-950/80'
                }`}
                title="Tramo Verde: 0 a 18s"
              />
              {/* Franja Amarillo: 3/93 = 3.23% */}
              <div
                style={{ width: `${(DURACION_AMARILLO_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'amarillo' ? 'bg-amber-400 shadow-sm shadow-amber-300' : 'bg-amber-950/80'
                }`}
                title="Tramo Amarillo: 18 a 21s"
              />
              {/* Franja Rojo: 72/93 = 77.42% */}
              <div
                style={{ width: `${(DURACION_ROJO_SEG / DURACION_CICLO_SEG) * 100}%` }}
                className={`h-full transition-opacity ${
                  estado.fase === 'rojo' ? 'bg-rose-600 shadow-sm shadow-rose-500' : 'bg-rose-950/80'
                }`}
                title="Tramo Rojo: 21 a 93s"
              />

              {/* Indicador de posición actual (aguja en vivo) */}
              {estado.segundoEnCicloExacto !== null && (
                <div
                  className="absolute top-0 bottom-0 w-1 bg-white shadow-md z-10 transition-all duration-200"
                  style={{
                    left: `${(estado.segundoEnCicloExacto / DURACION_CICLO_SEG) * 100}%`
                  }}
                />
              )}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-500 px-0.5">
              <span className="text-emerald-400">0s Verde (18s)</span>
              <span className="text-amber-400">18s Amarillo (3s)</span>
              <span className="text-rose-400">21s Rojo (72s)</span>
              <span>93s</span>
            </div>
          </div>

          {/* Recordatorio discreto si pasaron > 30 minutos sin re-verificar */}
          {estado.requiereResincronizacion && (
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                <span>
                  Han transcurrido <strong>{estado.tiempoDesdeSincronizacionMin} minutos</strong> desde la sincronización. Si notas desfase en campo con la luz real, puedes re-sincronizar.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setModalResincronizarAbierto(true)}
                className="touch-btn shrink-0 px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold text-[11px] border border-amber-500/40"
              >
                Re-sincronizar ahora
              </button>
            </div>
          )}
        </div>
      ) : (
        /* PROMPT INICIAL CUANDO AÚN NO SE HA SINCRONIZADO */
        <div className="mt-3.5 p-4 rounded-2xl bg-slate-950/70 border border-slate-800 text-center space-y-3">
          <div className="flex items-center justify-center gap-2 text-amber-400 font-bold text-sm">
            <Info className="w-4 h-4 shrink-0" />
            <span>El ciclo de 93 segundos no ha sido iniciado para esta sesión</span>
          </div>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Observa el semáforo real de la intersección. En el momento exacto en que la luz cambie a <strong>VERDE</strong>, presiona el botón inferior para sincronizar a todo el equipo.
          </p>
          <button
            type="button"
            onClick={handleSincronizar}
            disabled={guardando}
            className="touch-btn inline-flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs sm:text-sm shadow-lg shadow-emerald-600/30 border border-emerald-400 transition active:scale-95 cursor-pointer"
          >
            <Radio className="w-4 h-4" />
            <span>{guardando ? 'Sincronizando...' : '🟢 Sincronizar en inicio de VERDE'}</span>
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
                <p className="text-xs text-slate-400">Calibración colaborativa del ciclo de 93 segundos</p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs text-slate-300 space-y-2">
              <p>
                Presiona <strong>Confirmar</strong> en el instante exacto en que el semáforo real cambie a <strong>VERDE</strong>.
              </p>
              <p className="text-slate-400 text-[11px]">
                ℹ️ Esto actualizará el tiempo cero para todos los miembros del equipo en tiempo real. Los cruces y eventos que ya se hayan guardado <strong>mantendrán intactos sus datos</strong> calculados originalmente.
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
                className="touch-btn px-5 py-2 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 border border-emerald-400 transition"
              >
                {guardando ? 'Guardando...' : '🟢 Confirmar nuevo inicio en VERDE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
