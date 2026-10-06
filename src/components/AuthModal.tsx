import React, { useState } from 'react';
import { X, ShieldAlert, RefreshCw, CheckCircle2 } from 'lucide-react';
import { signInWithPopup, signOut, auth, googleProvider } from '../lib/firebase';
import { esCorreoAutorizado, CORREOS_EQUIPO } from '../config/equipo';

interface AuthModalProps {
  abierto: boolean;
  onCerrar: () => void;
  onExito: (email: string) => void;
  obligatorio?: boolean;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  abierto,
  onCerrar,
  onExito,
  obligatorio = false
}) => {
  const [cargando, setCargando] = useState(false);
  const [correoRechazado, setCorreoRechazado] = useState<string | null>(null);
  const [errorMensaje, setErrorMensaje] = useState<string | null>(null);

  if (!abierto) return null;

  const handleLoginGoogle = async () => {
    setCargando(true);
    setCorreoRechazado(null);
    setErrorMensaje(null);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const email = result.user.email;

      // Validación inmediata contra la lista blanca
      if (email && esCorreoAutorizado(email)) {
        onExito(email);
        onCerrar();
      } else {
        // Correo no autorizado: expulsión inmediata
        await signOut(auth);
        setCorreoRechazado(email || 'desconocido');
      }
    } catch (err: any) {
      console.error('Error durante Google Sign-In:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setErrorMensaje('Se cerró la ventana de inicio de sesión de Google.');
      } else if (err.code === 'auth/popup-blocked') {
        setErrorMensaje('Tu navegador bloqueó la ventana emergente de Google. Permite las ventanas emergentes para continuar.');
      } else {
        setErrorMensaje(err.message || 'Error al autenticar con Google.');
      }
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 sm:p-7 shadow-2xl relative text-center">
        {!obligatorio && !correoRechazado && (
          <button
            onClick={onCerrar}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        {/* ESTADO: ACCESO DENEGADO (Correo no en lista blanca) */}
        {correoRechazado ? (
          <div className="space-y-4 py-2">
            <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div>
              <h2 className="text-xl font-black text-white">
                Acceso denegado
              </h2>
              <p className="text-sm text-rose-300 font-semibold mt-1">
                Este correo no pertenece al equipo del proyecto
              </p>
              <div className="mt-3 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs font-mono text-slate-300 break-all">
                {correoRechazado}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              El acceso a esta plataforma está reservado exclusivamente a los miembros del equipo de investigación autorizados por Uniguajira.
            </p>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleLoginGoogle}
                disabled={cargando}
                className="touch-btn w-full py-3 rounded-xl font-bold text-sm bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${cargando ? 'animate-spin' : ''}`} />
                <span>Intentar con otra cuenta de Google</span>
              </button>
            </div>
          </div>
        ) : (
          /* ESTADO: PANTALLA PRINCIPAL DE INICIO CON GOOGLE */
          <div className="space-y-5">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center mx-auto shadow-md shadow-blue-500/20 text-white font-black text-xl">
              AV
            </div>

            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white">
                Iniciar Sesión
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Aforo Vial - Simulación de Tráfico PTV Vissim
              </p>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-3 text-left">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Acceso Restringido</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Ingresa con tu correo institucional de la Universidad de La Guajira (<code>@uniguajira.edu.co</code>) registrado en el equipo del proyecto.
              </p>
            </div>

            {errorMensaje && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                {errorMensaje}
              </div>
            )}

            {/* BOTÓN ÚNICO DE GOOGLE SIGN-IN */}
            <div>
              <button
                type="button"
                onClick={handleLoginGoogle}
                disabled={cargando}
                className="touch-btn w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-white hover:bg-slate-100 text-slate-900 shadow-xl flex items-center justify-center gap-3 transition active:scale-98 disabled:opacity-50 cursor-pointer"
              >
                {/* Icono oficial SVG de Google */}
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>{cargando ? 'Conectando con Google...' : 'Iniciar sesión con Google'}</span>
              </button>
            </div>

            <div className="text-[11px] text-slate-500 pt-1">
              Lista de acceso verificada: {CORREOS_EQUIPO.length} aforadores asignados.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
