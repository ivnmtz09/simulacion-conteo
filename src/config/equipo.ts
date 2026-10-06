export const CORREOS_EQUIPO = [
  'ijesusmartinez@uniguajira.edu.co',
  'llouissierra@uniguajira.edu.co',
  'jenriqueiguaran@uniguajira.edu.co',
  'ljangulo@uniguajira.edu.co',
  'conoriozarate@uniguajira.edu.co'
] as const;

export type CorreoEquipo = (typeof CORREOS_EQUIPO)[number];

export function esCorreoAutorizado(email: string | null | undefined): boolean {
  if (!email) return false;
  const normalizado = email.toLowerCase().trim();
  return CORREOS_EQUIPO.includes(normalizado as CorreoEquipo);
}
