import type { FaseSemaforo, CategoriaSalidaVehiculo, ConfiguracionSemaforo } from '../types/conteo';

export const DURACION_CICLO_SEG = 95;
export const DURACION_VERDE_SEG = 18;
export const DURACION_AMARILLO_SEG = 3;
export const DURACION_ROJO_SEG = 72;
export const DURACION_AMARILLO_FINAL_SEG = 2;

export const CONFIG_SEMAFORO_POR_DEFECTO: ConfiguracionSemaforo = {
  verdeSeg: DURACION_VERDE_SEG,
  amarillo1Seg: DURACION_AMARILLO_SEG,
  rojoSeg: DURACION_ROJO_SEG,
  amarillo2Seg: DURACION_AMARILLO_FINAL_SEG,
  cicloTotalSeg: DURACION_CICLO_SEG
};

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
 * de la configuración semafórica del sector (por defecto 95 segundos: 18s Verde, 3s Amarillo -> Rojo, 72s Rojo, 2s Amarillo -> Verde).
 * 
 * Intervalos:
 * [0, limVerde)              -> Verde
 * [limVerde, limAmarillo1)   -> Amarillo post-verde hacia rojo
 * [limAmarillo1, limRojo)    -> Rojo
 * [limRojo, cicloTotal)      -> Amarillo pre-verde hacia verde
 */
export function calcularEstadoSemaforo(
  timestampMs: number,
  inicioCicloMs?: unknown,
  config: ConfiguracionSemaforo = CONFIG_SEMAFORO_POR_DEFECTO
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

  const cicloSeg = config?.cicloTotalSeg || DURACION_CICLO_SEG;
  const verdeSeg = config?.verdeSeg ?? DURACION_VERDE_SEG;
  const amarillo1Seg = config?.amarillo1Seg ?? DURACION_AMARILLO_SEG;
  const rojoSeg = config?.rojoSeg ?? DURACION_ROJO_SEG;

  const diffMs = Math.max(0, timestampMs - t0);
  const segundosDesdeInicio = diffMs / 1000;
  const segundoEnCicloExacto = segundosDesdeInicio % cicloSeg;
  const segundoEnCiclo = Math.floor(segundoEnCicloExacto);
  const numeroCiclo = Math.floor(segundosDesdeInicio / cicloSeg) + 1;
  const tiempoDesdeSincronizacionMin = Math.floor(segundosDesdeInicio / 60);
  const requiereResincronizacion = tiempoDesdeSincronizacionMin >= 30;

  let fase: FaseSemaforo;
  let segundosRestantesFase: number;

  const limVerde = verdeSeg;
  const limAmarillo1 = limVerde + amarillo1Seg;
  const limRojo = limAmarillo1 + rojoSeg;

  if (segundoEnCicloExacto < limVerde) {
    fase = 'verde';
    segundosRestantesFase = Math.max(1, Math.ceil(limVerde - segundoEnCicloExacto));
  } else if (segundoEnCicloExacto < limAmarillo1) {
    fase = 'amarillo';
    segundosRestantesFase = Math.max(1, Math.ceil(limAmarillo1 - segundoEnCicloExacto));
  } else if (segundoEnCicloExacto < limRojo) {
    fase = 'rojo';
    segundosRestantesFase = Math.max(1, Math.ceil(limRojo - segundoEnCicloExacto));
  } else {
    fase = 'amarillo';
    segundosRestantesFase = Math.max(1, Math.ceil(cicloSeg - segundoEnCicloExacto));
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
        bgBadge: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
        glowClass: 'shadow-[0_0_15px_rgba(16,185,129,0.35)]',
        borderClass: 'border-emerald-500/40',
        dotClass: 'bg-emerald-500'
      };
    case 'amarillo':
      return {
        etiqueta: 'Amarillo',
        colorTexto: 'text-amber-400',
        bgBadge: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
        glowClass: 'shadow-[0_0_15px_rgba(245,158,11,0.35)]',
        borderClass: 'border-amber-500/40',
        dotClass: 'bg-amber-400'
      };
    case 'rojo':
      return {
        etiqueta: 'Rojo',
        colorTexto: 'text-rose-400',
        bgBadge: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
        glowClass: 'shadow-[0_0_15px_rgba(244,63,94,0.35)]',
        borderClass: 'border-rose-500/40',
        dotClass: 'bg-rose-500'
      };
    default:
      return {
        etiqueta: 'Sin Sincronizar',
        colorTexto: 'text-slate-400',
        bgBadge: 'bg-slate-800/40 text-slate-400 border-slate-700/40',
        glowClass: 'shadow-none',
        borderClass: 'border-slate-800',
        dotClass: 'bg-slate-600'
      };
  }
}
