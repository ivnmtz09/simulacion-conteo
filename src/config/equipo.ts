export const CORREOS_AFORO_UNIVERSITARIO = [
  'janiez@uniguajira.edu.co',
  'bcamilobrito@uniguajira.edu.co',
  'sivanrodriguez@uniguajira.edu.co'
] as const;

export const CORREO_AFORO_UNIVERSITARIO = CORREOS_AFORO_UNIVERSITARIO[0];

export const CORREOS_EQUIPO_VIAL = [
  'ijesusmartinez@uniguajira.edu.co',
  'llouissierra@uniguajira.edu.co',
  'jenriqueiguaran@uniguajira.edu.co',
  'ljangulo@uniguajira.edu.co',
  'conoriozarate@uniguajira.edu.co'
] as const;

// Lista completa de correos autorizados en la plataforma
export const CORREOS_EQUIPO = [
  ...CORREOS_EQUIPO_VIAL,
  ...CORREOS_AFORO_UNIVERSITARIO
] as const;

export type CorreoEquipo = (typeof CORREOS_EQUIPO)[number];

export function esUsuarioAforoUniversitario(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  return CORREOS_AFORO_UNIVERSITARIO.some((c) => c.toLowerCase() === normalizado);
}

export function esCorreoAutorizado(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  return (
    esUsuarioAforoUniversitario(normalizado) ||
    CORREOS_EQUIPO_VIAL.some((c) => c.toLowerCase() === normalizado)
  );
}

