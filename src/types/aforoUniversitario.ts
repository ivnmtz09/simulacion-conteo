export type TipoTransitoUni = 'entrada' | 'salida';

export type BloquePredeterminado =
  | 'Bloque 1'
  | 'Bloque 2'
  | 'Bloque 3'
  | 'Bloque 4'
  | 'Bloque 5'
  | 'Bloque 6'
  | 'Biblioteca Central'
  | 'Cafetería / Bienestar'
  | 'Auditorio'
  | 'Laboratorios'
  | 'Facultad de Ingeniería'
  | 'Otro';

export const BLOQUES_UNIVERSIDAD: BloquePredeterminado[] = [
  'Bloque 6',
  'Bloque 1',
  'Bloque 2',
  'Bloque 3',
  'Bloque 4',
  'Bloque 5',
  'Biblioteca Central',
  'Cafetería / Bienestar',
  'Auditorio',
  'Laboratorios',
  'Facultad de Ingeniería',
  'Otro'
];

export interface SesionAforoUni {
  id: string;
  nombre: string;
  bloque: string;
  puertaAcceso?: string;
  capacidadMaxima?: number | null;
  aforoInicial?: number;
  usuario: string; // janiez@uniguajira.edu.co
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
}

export interface IntervaloFlujoUni {
  etiquetaHora: string; // ej. "10:15"
  timestampInicio: number;
  entradas: number;
  salidas: number;
  volumen: number;
  aforoFin: number;
}
