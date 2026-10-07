export const CORREO_AFORO_UNIVERSITARIO = 'janiez@uniguajira.edu.co' as const;

export const CORREOS_EQUIPO_VIAL = [
  'ijesusmartinez@uniguajira.edu.co',
  'llouissierra@uniguajira.edu.co',
  'jenriqueiguaran@uniguajira.edu.co',
  'ljangulo@uniguajira.edu.co',
  'conoriozarate@uniguajira.edu.co'
] as const;

// Mantenemos CORREOS_EQUIPO para compatibilidad con código existente
export const CORREOS_EQUIPO = CORREOS_EQUIPO_VIAL;

export type CorreoEquipo = (typeof CORREOS_EQUIPO)[number];

export function esUsuarioAforoUniversitario(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().trim() === CORREO_AFORO_UNIVERSITARIO;
}

export function esCorreoAutorizado(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  return (
    normalizado === CORREO_AFORO_UNIVERSITARIO ||
    CORREOS_EQUIPO_VIAL.includes(normalizado as (typeof CORREOS_EQUIPO_VIAL)[number])
  );
}

