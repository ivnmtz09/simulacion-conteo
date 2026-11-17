import React, { useState } from 'react';
import { X, Building2, PlusCircle, Users, DoorOpen, Info } from 'lucide-react';
import { BLOQUES_UNIVERSIDAD, obtenerPuertasPorBloque, type SesionAforoUni } from '../../types/aforoUniversitario';

interface NuevaSesionUniModalProps {
  abierto: boolean;
  usuarioActual: string;
  onCerrar: () => void;
  onCrearSesion: (nuevaSesion: Omit<SesionAforoUni, 'id'>) => Promise<void>;
}

export const NuevaSesionUniModal: React.FC<NuevaSesionUniModalProps> = ({
  abierto,
  usuarioActual,
  onCerrar,
  onCrearSesion
}) => {
  const usuarioNombre = (usuarioActual || '').split('@')[0];
  const hoyStr = new Date().toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'short'
  });

  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<string>('Bloque 1');
  const [nombre, setNombre] = useState(`Bloque 1 - ${usuarioNombre} (${hoyStr})`);
  const [nombreEditadoManual, setNombreEditadoManual] = useState(false);
  const [bloquePersonalizado, setBloquePersonalizado] = useState('');
  const [puertaAcceso, setPuertaAcceso] = useState('Entrada Frontal');
  const [capacidadMaxima, setCapacidadMaxima] = useState<string>('');
  const [aforoInicial, setAforoInicial] = useState<string>('0');
  const [guardando, setGuardando] = useState(false);

  const handleCambioBloque = (nuevoBloque: string) => {
    setBloqueSeleccionado(nuevoBloque);
    const puertas = obtenerPuertasPorBloque(nuevoBloque);
    setPuertaAcceso(puertas[0] || 'Entrada Frontal');
    if (!nombreEditadoManual) {
      setNombre(`${nuevoBloque} - ${usuarioNombre} (${hoyStr})`);
    }
  };

  if (!abierto) return null;

  const puertasDisponibles = obtenerPuertasPorBloque(bloqueSeleccionado);
  const esBloque5 = bloqueSeleccionado === 'Bloque 5';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) return;

    setGuardando(true);
    try {
      const bloqueFinal = bloqueSeleccionado === 'Otro' ? bloquePersonalizado.trim() || 'Bloque General' : bloqueSeleccionado;
      const capacidadNum = capacidadMaxima ? parseInt(capacidadMaxima, 10) : null;
      const aforoIniNum = parseInt(aforoInicial, 10) || 0;

      await onCrearSesion({
        nombre: nombre.trim(),
        bloque: bloqueFinal,
        puertaAcceso: puertaAcceso.trim(),
        capacidadMaxima: !isNaN(Number(capacidadNum)) && (capacidadNum ?? 0) > 0 ? capacidadNum : null,
        aforoInicial: aforoIniNum >= 0 ? aforoIniNum : 0,
        usuario: usuarioActual,
        activa: true,
        estado: 'abierta',
        fechaCreacion: new Date().toISOString()
      });

      onCerrar();
    } catch (err) {
      console.error('Error al crear sesión de aforo universitario:', err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-uni-titulo"
    >
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
        {/* ENCABEZADO FIJO */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900/95">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20 shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 id="modal-uni-titulo" className="text-base sm:text-lg font-black text-white truncate">
                Nueva Medición de Aforo
              </h2>
              <p className="text-xs text-slate-400 truncate">Universidad de La Guajira</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCerrar}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition shrink-0"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* CUERPO CON SCROLL INDEPENDIENTE */}
        <form id="form-nueva-sesion-uni" onSubmit={handleSubmit} className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-4">
          {/* Nombre de la sesión */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Nombre de la Medición / Turno *
            </label>
            <input
              type="text"
              required
              placeholder={`Ej. ${bloqueSeleccionado} - Turno Mañana`}
              value={nombre}
              onChange={(e) => {
                setNombre(e.target.value);
                setNombreEditadoManual(true);
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Aforador: <strong className="text-slate-300 font-mono">{usuarioNombre}</strong>
            </span>
          </div>

          {/* Bloque universitario */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5">
              Bloque / Edificio Universitario *
            </label>
            <select
              value={bloqueSeleccionado}
              onChange={(e) => handleCambioBloque(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer transition"
            >
              {BLOQUES_UNIVERSIDAD.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Indicador de accesos según el bloque */}
          <div className={`p-3 rounded-2xl border text-xs space-y-1 ${
            esBloque5
              ? 'bg-amber-500/10 border-amber-500/30 text-amber-200'
              : 'bg-blue-500/10 border-blue-500/30 text-blue-200'
          }`}>
            <div className="flex items-center gap-1.5 font-bold">
              <Info className="w-3.5 h-3.5 shrink-0" />
              <span>Accesos disponibles para {bloqueSeleccionado}:</span>
            </div>
            <p className="text-[11px] text-slate-300 leading-relaxed">
              {esBloque5
                ? 'El Bloque 5 dispone de 4 puertas: Entrada Frontal, Entrada Trasera y 2 Entradas Laterales (Lateral 1 y Lateral 2).'
                : 'Dispone de 2 accesos de entrada y salida: Entrada Frontal y Entrada Trasera.'}
            </p>
          </div>

          {/* Bloque personalizado si eligió "Otro" */}
          {bloqueSeleccionado === 'Otro' && (
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Especifique el Bloque / Área *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Bloque Postgrados / Bloque B"
                value={bloquePersonalizado}
                onChange={(e) => setBloquePersonalizado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          )}

          {/* Puerta o Acceso de inicio */}
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Acceso de inicio asignado</span>
            </label>
            <select
              value={puertaAcceso}
              onChange={(e) => setPuertaAcceso(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 cursor-pointer transition"
            >
              {puertasDisponibles.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Capacidad Máxima */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Capacidad Máx. (Opcional)</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ej. 150"
                value={capacidadMaxima}
                onChange={(e) => setCapacidadMaxima(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition"
              />
            </div>

            {/* Aforo Inicial */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Personas Ya Adentro
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={aforoInicial}
                onChange={(e) => setAforoInicial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono transition"
              />
            </div>
          </div>
        </form>

        {/* PIE FIJO */}
        <div className="p-4 sm:p-5 border-t border-slate-800 shrink-0 bg-slate-900/95 flex items-center justify-between sm:justify-end gap-2.5">
          <button
            type="button"
            onClick={onCerrar}
            className="touch-btn px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 transition cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="form-nueva-sesion-uni"
            disabled={guardando}
            className="touch-btn flex-1 sm:flex-none px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50 cursor-pointer"
          >
            <PlusCircle className="w-4 h-4 shrink-0" />
            <span>{guardando ? 'Iniciando...' : 'Iniciar Conteo de Bloque'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
