import type { PuntoAforoVial, ConfiguracionSemaforo } from '../types/conteo';

export const CORREOS_AFORO_UNIVERSITARIO = [
  'janiez@uniguajira.edu.co',
  'bcamilobrito@uniguajira.edu.co',
  'sivanrodriguez@uniguajira.edu.co'
] as const;

export const CORREO_AFORO_UNIVERSITARIO = CORREOS_AFORO_UNIVERSITARIO[0];

// Punto 1: Semáforo Calle 15 con Carrera 8 (Troncal del Caribe - Sentido Riohacha -> Santa Marta)
export const CORREOS_EQUIPO_PUNTO_1 = [
  'ijesusmartinez@uniguajira.edu.co',
  'llouissierra@uniguajira.edu.co',
  'jenriqueiguaran@uniguajira.edu.co',
  'ljangulo@uniguajira.edu.co',
  'conoriozarate@uniguajira.edu.co'
] as const;

// Punto 2: Semáforo Cuatro Vías (Calle 15 con Carrera 15 - Sentido Santa Marta -> Riohacha)
export const CORREOS_EQUIPO_PUNTO_2 = [
  'jazarate@uniguajira.edu.co',
  'aprodriguezrodriguez@uniguajira.edu.co',
  'scbeltran@uniguajira.edu.co',
  'ymsalgado@uniguajira.edu.co',
  'mjesusnavarro@uniguajira.edu.co'
] as const;

export const CORREOS_EQUIPO_VIAL = [
  ...CORREOS_EQUIPO_PUNTO_1,
  ...CORREOS_EQUIPO_PUNTO_2
] as const;

// Lista completa de correos asignados en la plataforma
export const CORREOS_EQUIPO = [
  ...CORREOS_EQUIPO_VIAL,
  ...CORREOS_AFORO_UNIVERSITARIO
] as const;

export type CorreoEquipo = (typeof CORREOS_EQUIPO)[number];

// Tiempos semafóricos Punto 1: Calle 15 con Cra 8 (Riohacha -> Santa Marta)
export const CONFIG_SEMAFORO_PUNTO_1: ConfiguracionSemaforo = {
  verdeSeg: 18,
  amarillo1Seg: 3,
  rojoSeg: 72,
  amarillo2Seg: 2,
  cicloTotalSeg: 95
};

export const CONFIG_SEMAFORO_POR_DEFECTO = CONFIG_SEMAFORO_PUNTO_1;

// Tiempos semafóricos Punto 2: Cuatro Vías - Calle 15 con Cra 15 (Santa Marta -> Riohacha)
// [Tiempo en rojo: 99, Tiempos en amarillo: 3(post rojo, post verde), Tiempo en verde: 25] -> Ciclo 130s
export const CONFIG_SEMAFORO_PUNTO_2: ConfiguracionSemaforo = {
  verdeSeg: 25,
  amarillo1Seg: 3,
  rojoSeg: 99,
  amarillo2Seg: 3,
  cicloTotalSeg: 130
};

export const PUNTOS_AFORO_VIAL: PuntoAforoVial[] = [
  {
    id: 'punto_calle15_cra8',
    nombre: 'Semáforo Calle 15 con Carrera 8',
    descripcion: 'Troncal del Caribe - Sentido Riohacha → Santa Marta',
    interseccion: 'Calle 15 con Carrera 8',
    sentido: 'Riohacha → Santa Marta',
    configSemaforo: CONFIG_SEMAFORO_PUNTO_1
  },
  {
    id: 'punto_cuatro_vias_cra15',
    nombre: 'Semáforo Cuatro Vías (Calle 15 con Carrera 15)',
    descripcion: 'Intersección Cuatro Vías - Sentido Santa Marta → Riohacha',
    interseccion: 'Calle 15 con Carrera 15',
    sentido: 'Santa Marta → Riohacha',
    configSemaforo: CONFIG_SEMAFORO_PUNTO_2
  }
];

export function esCorreoUniguajira(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  return normalizado.endsWith('@uniguajira.edu.co');
}

export function esUsuarioAforoUniversitario(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  return CORREOS_AFORO_UNIVERSITARIO.some((c) => c.toLowerCase() === normalizado);
}

export function esCorreoAutorizado(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  // Admisión abierta para cualquier usuario con dominio de la Universidad de La Guajira
  // así como para los miembros listados en los equipos del proyecto.
  return (
    esCorreoUniguajira(normalizado) ||
    CORREOS_EQUIPO.some((c) => c.toLowerCase() === normalizado)
  );
}
