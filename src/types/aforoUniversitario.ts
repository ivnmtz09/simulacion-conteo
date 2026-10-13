export type TipoTransitoUni = 'entrada' | 'salida';

export type BloquePredeterminado =
  | 'Bloque 1'
  | 'Bloque 2'
  | 'Bloque 3'
  | 'Bloque 4'
  | 'Bloque 5'
  | 'Bloque 6'
  | 'Biblioteca'
  | 'Bloque Administrativo'
  | 'Otro';

export const BLOQUES_UNIVERSIDAD: BloquePredeterminado[] = [
  'Bloque 1',
  'Bloque 2',
  'Bloque 3',
  'Bloque 4',
  'Bloque 5',
  'Bloque 6',
  'Biblioteca',
  'Bloque Administrativo'
];

export const PUERTAS_ESTANDAR = ['Entrada Frontal', 'Entrada Trasera'] as const;
export const PUERTAS_BLOQUE_5 = [
  'Entrada Frontal',
  'Entrada Trasera',
  'Entrada Lateral 1',
  'Entrada Lateral 2'
] as const;

export type PuertaAccesoUni =
  | 'Entrada Frontal'
  | 'Entrada Trasera'
  | 'Entrada Lateral 1'
  | 'Entrada Lateral 2';

export function obtenerPuertasPorBloque(bloque: string): readonly string[] {
  if (bloque === 'Bloque 5' || bloque.toLowerCase().includes('bloque 5')) {
    return PUERTAS_BLOQUE_5;
  }
  return PUERTAS_ESTANDAR;
}

export interface SesionAforoUni {
  id: string;
  nombre: string;
  bloque: string;
  puertaAcceso?: string;
  capacidadMaxima?: number | null;
  aforoInicial?: number;
  usuario: string; // janiez@uniguajira.edu.co, bcamilobrito@uniguajira.edu.co, sivanrodriguez@uniguajira.edu.co
  activa: boolean;
  estado: 'abierta' | 'cerrada';
  fechaCreacion: string;
  fechaCierre?: string | null;
  enPapelera?: boolean;
}

export interface EventoAforoUni {
  id: string;
  sesionId: string;
  usuario: string;
  tipo: TipoTransitoUni;
  cantidad: number; // 1, 5, 10
  puerta?: string; // Punto de ingreso/egreso (Frontal, Trasera, Lateral 1, Lateral 2)
  aforoMomento: number;
  timestamp: number;
  fechaHora: string;
  enPapelera?: boolean;
  nota?: string;
  esManual?: boolean;
}

export interface MetricasAforoUni {
  aforoActual: number;
  totalEntradas: number;
  totalSalidas: number;
  volumenTransito: number; // totalEntradas + totalSalidas
  aforoPico: number;
  horaPico?: string | null;
  porcentajeOcupacion?: number | null;
  entradasPorPuerta?: Record<string, number>;
  salidasPorPuerta?: Record<string, number>;
}

export interface IntervaloFlujoUni {
  etiquetaHora: string; // ej. "10:15"
  timestampInicio: number;
  entradas: number;
  salidas: number;
  volumen: number;
  aforoFin: number;
}
