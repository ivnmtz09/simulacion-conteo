export type TipoVehiculo =
  | 'moto'
  | 'carro'
  | 'camioneta'
  | 'carga'
  | 'buses'
  | 'peaton';

export interface InfoTipoVehiculo {
  id: TipoVehiculo;
  nombre: string;
  subtitulo: string;
  emoji: string;
  esVehiculoMotorizado: boolean;
  color: string;
  badgeBg: string;
  badgeBorder: string;
}

export const TIPOS_VEHICULOS: Record<TipoVehiculo, InfoTipoVehiculo> = {
  moto: {
    id: 'moto',
    nombre: 'Moto',
    subtitulo: 'Incluye motos eléctricas tipo Ofero',
    emoji: '',
    esVehiculoMotorizado: true,
    color: 'text-amber-400',
    badgeBg: 'bg-amber-500/10',
    badgeBorder: 'border-amber-500/30'
  },
  carro: {
    id: 'carro',
    nombre: 'Carro',
    subtitulo: 'Auto particular / taxi',
    emoji: '',
    esVehiculoMotorizado: true,
    color: 'text-blue-400',
    badgeBg: 'bg-blue-500/10',
    badgeBorder: 'border-blue-500/30'
  },
  camioneta: {
    id: 'camioneta',
    nombre: 'Camioneta',
    subtitulo: 'SUV / Camioneta particular o utilitaria',
    emoji: '',
    esVehiculoMotorizado: true,
    color: 'text-cyan-400',
    badgeBg: 'bg-cyan-500/10',
    badgeBorder: 'border-cyan-500/30'
  },
  carga: {
    id: 'carga',
    nombre: 'Carga',
    subtitulo: 'Camión de carga / furgón',
    emoji: '',
    esVehiculoMotorizado: true,
    color: 'text-orange-400',
    badgeBg: 'bg-orange-500/10',
    badgeBorder: 'border-orange-500/30'
  },
  buses: {
    id: 'buses',
    nombre: 'Buses',
    subtitulo: 'Bus urbano / microbús / colectivo',
    emoji: '',
    esVehiculoMotorizado: true,
    color: 'text-purple-400',
    badgeBg: 'bg-purple-500/10',
    badgeBorder: 'border-purple-500/30'
  },
  peaton: {
    id: 'peaton',
    nombre: 'Peatón',
    subtitulo: 'Cruces y paso peatonal',
    emoji: '',
    esVehiculoMotorizado: false,
    color: 'text-emerald-400',
    badgeBg: 'bg-emerald-500/10',
    badgeBorder: 'border-emerald-500/30'
  }
};

export const LISTA_TIPOS_VEHICULOS: TipoVehiculo[] = [
  'moto',
  'carro',
  'camioneta',
  'carga',
  'buses',
  'peaton'
];

export type CategoriaSalidaVehiculo = 'respeta' | 'se_vuela';
export type CategoriaSalidaPeaton = 'cebra' | 'fuera_cebra' | 'anden';
export type MovimientoGiro = 'recto' | 'izquierda' | 'derecha';

export type TipoRegistroEvento =
  | 'entrada_cola'
  | 'llega_servidor'
  | 'salida_cola'
  | 'movimiento'
  | 'peaton'
  | 'parqueo_inicia'
  | 'parqueo_termina';

export interface VehiculoEnServidor {
  horaEntradaCola: number;
  horaLlegaServidor: number;
}

export interface EventoConteo {
  id: string;
  sesionId: string;
  usuario: string;
  tipoVehiculo: TipoVehiculo;
  tipoRegistro: TipoRegistroEvento;

  // Cola FIFO y servicio
  horaEntradaCola?: string | null;
  horaLlegaServidor?: string | null;
  horaSalida?: string | null;
  tiempoEnColaSeg?: number | null;
  tiempoEnServidorSeg?: number | null;
  tiempoTotalSeg?: number | null;
  duracionEsperaSeg?: number | null; // compatibilidad hacia atrás
  categoriaSalida?: CategoriaSalidaVehiculo | CategoriaSalidaPeaton | null;

  // Giros / movimientos independientes
  movimiento?: MovimientoGiro | null;

  // Ciclo semafórico automático (96s: 18V / 3A / 72R / 3A)
  faseCruce?: FaseSemaforo | null;
  segundoEnCiclo?: number | null;
  numeroCiclo?: number | null;

  // Estado de vehículo parqueado en carril
  esParqueado?: boolean;
  duracionParqueoSeg?: number | null;

  timestampCreacion: number;
  esManual?: boolean;
  esFlujoLibre?: boolean;
  enPapelera?: boolean;
}

export interface SesionConteo {
  id: string;
  nombre: string;
  ubicacion?: string;
  usuario: string; // Creador inicial
  participantes?: string[]; // Correos que se unieron a la sesión
  asignaciones?: Partial<Record<TipoVehiculo, string>>; // Clave: tipo, Valor: email asignado
  tiposSeleccionados: TipoVehiculo[];
  activa: boolean;
  estado?: 'abierta' | 'cerrada';
  inicioCicloSemaforo?: number | null; // Timestamp epoch en ms del inicio de la fase verde
  ultimaResincronizacionSemaforo?: number | null;
  sincronizadoPor?: string | null;
  enPapelera?: boolean;
  fechaEliminacion?: string | null;
  fechaCreacion: string;
  fechaCierre?: string | null;
}

export interface ResumenEstadisticasVehiculo {
  enCola: number;
  enServidor: number;
  totalSalidas: number;
  respetaVerde: number;
  seVuelaRojo: number;
  tiempoPromedioColaSeg: number;
  tiempoPromedioServidorSeg: number;
  tiempoPromedioTotalSeg: number;
  esperaPromedioSeg: number;
  ultimaEsperaSeg: number | null;
  movimientoRecto: number;
  movimientoIzquierda: number;
  movimientoDerecha: number;
}

export interface ResumenEstadisticasPeaton {
  total: number;
  cebra: number;
  fueraCebra: number;
  anden: number;
}

export type FaseSemaforo = 'verde' | 'amarillo' | 'rojo';

export interface CicloSemaforo {
  id: string;
  sesionId: string;
  usuario: string;
  fase: FaseSemaforo;
  duracionSeg: number;
  timestampInicio: number;
  timestampFin: number;
}
