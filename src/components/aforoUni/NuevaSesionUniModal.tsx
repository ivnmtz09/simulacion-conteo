import React, { useState } from 'react';
import { X, Building2, PlusCircle, Users, DoorOpen } from 'lucide-react';
import { BLOQUES_UNIVERSIDAD, type SesionAforoUni } from '../../types/aforoUniversitario';

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
  const [nombre, setNombre] = useState('');
  const [bloqueSeleccionado, setBloqueSeleccionado] = useState<string>('Bloque 6');
  const [bloquePersonalizado, setBloquePersonalizado] = useState('');
  const [puertaAcceso, setPuertaAcceso] = useState('Entrada Principal');
  const [capacidadMaxima, setCapacidadMaxima] = useState<string>('');
  const [aforoInicial, setAforoInicial] = useState<string>('0');
  const [guardando, setGuardando] = useState(false);

  if (!abierto) return null;

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
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl relative">
        <button
          onClick={onCerrar}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Nueva Medición de Aforo</h2>
            <p className="text-xs text-slate-400">Universidad de La Guajira</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nombre de la sesión */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nombre de la Medición / Turno *
            </label>
            <input
              type="text"
              required
              placeholder="Ej. Bloque 6 - Acceso Principal Mañana"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          {/* Bloque universitario */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Bloque / Edificio Universitario *
            </label>
            <select
              value={bloqueSeleccionado}
              onChange={(e) => setBloqueSeleccionado(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              {BLOQUES_UNIVERSIDAD.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Bloque personalizado si eligió "Otro" */}
          {bloqueSeleccionado === 'Otro' && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Especifique el Bloque / Área *
              </label>
              <input
                type="text"
                required
                placeholder="Ej. Bloque Postgrados / Bloque B"
                value={bloquePersonalizado}
                onChange={(e) => setBloquePersonalizado(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
              />
            </div>
          )}

          {/* Puerta o Acceso */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1.5">
              <DoorOpen className="w-3.5 h-3.5 text-slate-400" />
              <span>Puerta / Acceso Monitoreado</span>
            </label>
            <input
              type="text"
              placeholder="Ej. Entrada Principal, Puerta Norte, Pasillo Central"
              value={puertaAcceso}
              onChange={(e) => setPuertaAcceso(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Capacidad Máxima */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Capacidad Máx. (Opcional)</span>
              </label>
              <input
                type="number"
                min="1"
                placeholder="Ej. 150"
                value={capacidadMaxima}
                onChange={(e) => setCapacidadMaxima(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>

            {/* Aforo Inicial */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Personas Ya Adentro
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={aforoInicial}
                onChange={(e) => setAforoInicial(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onCerrar}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-white transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="touch-btn px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/30 flex items-center gap-2 transition disabled:opacity-50 cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>{guardando ? 'Iniciando...' : 'Iniciar Conteo de Bloque'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
