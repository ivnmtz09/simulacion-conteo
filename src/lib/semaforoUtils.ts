import type { FaseSemaforo, CategoriaSalidaVehiculo } from '../types/conteo';

export const DURACION_CICLO_SEG = 93;
export const DURACION_VERDE_SEG = 18;
export const DURACION_AMARILLO_SEG = 3;
export const DURACION_ROJO_SEG = 72;

export interface EstadoSemaforoCalculado {
  sincronizado: boolean;
  fase: FaseSemaforo | null;
  segundoEnCiclo: number | null;
  segundoEnCicloExacto: number | null;
  segundosRestantesFase: number | null;
  numeroCiclo: number | null;
  tiempoDesdeSincronizacionMin: number;
  requiereResincronizacion: boolean;
}

/**
 * Normaliza cualquier formato de timestamp (number, string ISO, objeto Firestore Timestamp) a epoch en milisegundos.
 */
export function normalizarTimestampMs(valor: unknown): number | null {
  if (valor === null || valor === undefined) return null;
  if (typeof valor === 'number' && !isNaN(valor) && valor > 0) return valor;
  if (typeof valor === 'string') {
    const num = Number(valor);
    if (!isNaN(num) && num > 0) return num;
    const parsed = new Date(valor).getTime();
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }
  if (typeof valor === 'object' && valor !== null) {
    const v = valor as { toMillis?: () => number; seconds?: number; nanoseconds?: number };
    if (typeof v.toMillis === 'function') {
      const ms = v.toMillis();
      if (!isNaN(ms) && ms > 0) return ms;
    }
    if (typeof v.seconds === 'number') {
      const ms = v.seconds * 1000 + (v.nanoseconds ? v.nanoseconds / 1000000 : 0);
      if (!isNaN(ms) && ms > 0) return ms;
    }
  }
  return null;
}

/**
 * Calcula determinísticamente la fase y estado actual del semáforo a partir
 * de un ciclo continuo de 93 segundos (18s Verde, 3s Amarillo, 72s Rojo).
 * 
 * Intervalos:
 * [0, 18)   -> Verde (18 segundos)
 * [18, 21)  -> Amarillo (3 segundos)
 * [21, 93)  -> Rojo (72 segundos)
 */
export function calcularEstadoSemaforo(
  timestampMs: number,
  inicioCicloMs?: unknown
): EstadoSemaforoCalculado {
  const t0 = normalizarTimestampMs(inicioCicloMs);
  if (!t0) {
    return {
      sincronizado: false,
      fase: null,
      segundoEnCiclo: null,
      segundoEnCicloExacto: null,
      segundosRestantesFase: null,
      numeroCiclo: null,
      tiempoDesdeSincronizacionMin: 0,
      requiereResincronizacion: false
    };
  }

  const diffMs = Math.max(0, timestampMs - t0);
  const segundosDesdeInicio = diffMs / 1000;
  const segundoEnCicloExacto = segundosDesdeInicio % DURACION_CICLO_SEG;
  const segundoEnCiclo = Math.floor(segundoEnCicloExacto);
  const numeroCiclo = Math.floor(segundosDesdeInicio / DURACION_CICLO_SEG) + 1;
  const tiempoDesdeSincronizacionMin = Math.floor(segundosDesdeInicio / 60);
  const requiereResincronizacion = tiempoDesdeSincronizacionMin >= 30;

  let fase: FaseSemaforo;
  let segundosRestantesFase: number;

  if (segundoEnCicloExacto < DURACION_VERDE_SEG) {
    // 0 a 18s -> Verde
    fase = 'verde';
    segundosRestantesFase = Math.max(1, Math.ceil(DURACION_VERDE_SEG - segundoEnCicloExacto));
  } else if (segundoEnCicloExacto < DURACION_VERDE_SEG + DURACION_AMARILLO_SEG) {
    // 18s a 21s -> Amarillo
    fase = 'amarillo';
    segundosRestantesFase = Math.max(1, Math.ceil((DURACION_VERDE_SEG + DURACION_AMARILLO_SEG) - segundoEnCicloExacto));
  } else {
    // 21s a 93s -> Rojo
    fase = 'rojo';
    segundosRestantesFase = Math.max(1, Math.ceil(DURACION_CICLO_SEG - segundoEnCicloExacto));
  }

  return {
    sincronizado: true,
    fase,
    segundoEnCiclo,
    segundoEnCicloExacto,
    segundosRestantesFase,
    numeroCiclo,
    tiempoDesdeSincronizacionMin,
    requiereResincronizacion
  };
}

/**
 * Mapea la fase semafórica a la categoría clásica ('respeta' | 'se_vuela')
 * para preservar compatibilidad retroactiva completa con reportes y VISSIM.
 */
export function mapearFaseACategoria(fase?: FaseSemaforo | null): CategoriaSalidaVehiculo {
  if (fase === 'rojo') {
    return 'se_vuela';
  }
  // Verde y amarillo son considerados cruces respetados (o no infracción de rojo)
  return 'respeta';
}

/**
 * Devuelve información de visualización para una fase semafórica
 */
export function obtenerInfoFase(fase?: FaseSemaforo | null) {
  switch (fase) {
    case 'verde':
      return {
        etiqueta: 'Verde',
        colorTexto: 'text-emerald-400',
        bgBadge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        emoji: '🟢'
      };
    case 'amarillo':
      return {
        etiqueta: 'Amarillo',
        colorTexto: 'text-amber-400',
        bgBadge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        emoji: '🟡'
      };
    case 'rojo':
      return {
        etiqueta: 'Rojo',
        colorTexto: 'text-rose-400',
        bgBadge: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        emoji: '🔴'
      };
    default:
      return {
        etiqueta: 'Sin Sincronizar',
        colorTexto: 'text-slate-400',
        bgBadge: 'bg-slate-700/40 text-slate-300 border-slate-600/40',
        emoji: '⚪'
      };
  }
}
