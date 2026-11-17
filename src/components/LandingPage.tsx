import React from 'react';
import {
  Car,
  Users,
  Timer,
  FileSpreadsheet,
  ShieldCheck,
  MapPin,
  ArrowRight,
  Layers,
  ChevronRight
} from 'lucide-react';
import { LogoIsotipo } from './LogoIsotipo';
import { PUNTOS_AFORO_VIAL } from '../config/equipo';

interface LandingPageProps {
  usuarioActual: string | null;
  onAbrirAuth: () => void;
  onIrAlConteo: (modulo?: 'vial' | 'universitario') => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  usuarioActual,
  onAbrirAuth,
  onIrAlConteo
}) => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Barra de navegación superior de la Landing */}
      <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoIsotipo className="w-9 h-9 drop-shadow-md" />
            <div>
              <span className="font-black text-sm sm:text-base text-white tracking-tight block">
                Aforo & Conteo
              </span>
              <span className="text-[10px] text-slate-400 font-medium">
                Universidad de La Guajira
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {usuarioActual ? (
              <button
                type="button"
                onClick={() => onIrAlConteo('vial')}
                className="touch-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 transition cursor-pointer"
              >
                <span>Ir al Tablero ({usuarioActual.split('@')[0]})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                type="button"
                onClick={onAbrirAuth}
                className="touch-btn inline-flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-xs bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-600/20 transition cursor-pointer"
              >
                <span>Iniciar Sesión</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-800/60">
        {/* Luces difusas de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-gradient-to-tr from-blue-600/20 via-sky-500/15 to-emerald-500/20 blur-3xl pointer-events-none rounded-full" />

        <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-slate-800 text-xs text-slate-300 font-semibold mb-6 shadow-inner">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Investigación de Tránsito & Simulación Micro-Vial</span>
            <span className="text-slate-600">|</span>
            <span className="text-blue-400 font-mono">PTV Vissim</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-tight sm:leading-none">
            Sistema Integral de Aforo Vial <br className="hidden sm:inline" />
            <span className="bg-gradient-to-r from-blue-400 via-sky-300 to-emerald-400 bg-clip-text text-transparent">
              y Modelado de Teoría de Colas
            </span>
          </h1>

          <p className="mt-5 text-sm sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            Plataforma colaborativa para brigadas de aforo en Riohacha. Cronometraje semafórico continuo, evaluación estricta de colas y exportación directa de matrices origen-destino para PTV Vissim.
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => {
                if (usuarioActual) {
                  onIrAlConteo('vial');
                } else {
                  onAbrirAuth();
                }
              }}
              className="touch-btn w-full sm:w-auto px-7 py-3.5 rounded-2xl font-extrabold text-sm bg-gradient-to-r from-blue-600 to-sky-600 hover:from-blue-500 hover:to-sky-500 text-white shadow-xl shadow-blue-600/25 flex items-center justify-center gap-2 transition active:scale-95 cursor-pointer"
            >
              <Car className="w-4 h-4" />
              <span>{usuarioActual ? 'Entrar al Aforo Vial' : 'Comenzar Aforo Vial'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={() => {
                if (usuarioActual) {
                  onIrAlConteo('universitario');
                } else {
                  onAbrirAuth();
                }
              }}
              className="touch-btn w-full sm:w-auto px-7 py-3.5 rounded-2xl font-bold text-sm bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 flex items-center justify-center gap-2 transition cursor-pointer"
            >
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Aforo Peatonal Universitario</span>
            </button>
          </div>

          {/* Acceso institucional badge */}
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Acceso habilitado para todo el personal y estudiantes con correo <code className="text-slate-200 font-mono">@uniguajira.edu.co</code></span>
          </div>
        </div>
      </section>

      {/* SECCIÓN DE PUNTOS DE AFORO INTERACTIVOS EN RIOHACHA */}
      <section className="py-12 sm:py-16 border-b border-slate-800/60 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-xl mx-auto mb-8 sm:mb-10">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Puntos de Aforo y Ciclos Semafóricos
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Intersecciones parametrizadas con modelos de ciclo continuo determinista en la malla urbana.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {PUNTOS_AFORO_VIAL.map((p, index) => (
            <div
              key={p.id}
              className="bg-slate-900/90 border border-slate-800 hover:border-slate-700 rounded-3xl p-5 sm:p-6 shadow-xl flex flex-col justify-between transition gap-4"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-[10px] uppercase font-bold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                    Punto {index + 1}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    Ciclo de {p.configSemaforo.cicloTotalSeg}s
                  </span>
                </div>

                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>{p.nombre}</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  {p.descripcion}
                </p>

                {/* Tiempos del ciclo */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Distribución de Fases
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 text-center text-xs font-mono font-bold">
                    <div className="bg-emerald-500/10 border border-emerald-500/20 p-1.5 rounded-xl text-emerald-400">
                      <div className="text-[10px] text-slate-400 font-sans">Verde</div>
                      <span>{p.configSemaforo.verdeSeg}s</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-xl text-amber-400">
                      <div className="text-[10px] text-slate-400 font-sans">Ámbar 1</div>
                      <span>{p.configSemaforo.amarillo1Seg}s</span>
                    </div>
                    <div className="bg-rose-500/10 border border-rose-500/20 p-1.5 rounded-xl text-rose-400">
                      <div className="text-[10px] text-slate-400 font-sans">Rojo</div>
                      <span>{p.configSemaforo.rojoSeg}s</span>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/20 p-1.5 rounded-xl text-amber-400">
                      <div className="text-[10px] text-slate-400 font-sans">Ámbar 2</div>
                      <span>{p.configSemaforo.amarillo2Seg}s</span>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (usuarioActual) {
                    onIrAlConteo('vial');
                  } else {
                    onAbrirAuth();
                  }
                }}
                className="touch-btn w-full py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <span>Aforar en este sector</span>
                <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* METODOLOGÍA: TEORÍA DE COLAS Y CICLO CONTINUO */}
      <section className="py-12 sm:py-16 border-b border-slate-800/60 max-w-6xl mx-auto px-4 sm:px-6 w-full">
        <div className="text-center max-w-xl mx-auto mb-10">
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Fundamento Matemático y Metodología
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Superando las limitaciones del conteo de pulso tradicional mediante formulación formal.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Teoría de Colas FIFO
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Mide el tiempo en fila (<span className="text-blue-300 font-mono">Wq</span>) y tiempo en el servidor (<span className="text-emerald-300 font-mono">Ws</span>) de cada vehículo para calcular demoras totales (<span className="text-white font-mono">W = Wq + Ws</span>).
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Timer className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Ciclo Semafórico Continuo
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Cálculo analítico a partir de una única sincronización (<span className="text-amber-300 font-mono">t₀</span>). Determina si el cruce respeta Verde, Amarillo o infringe Luz Roja automáticamente.
            </p>
          </div>

          <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-3xl space-y-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-sm sm:text-base text-white">
              Exportación PTV Vissim
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Descarga directa en XLSX y CSV de matrices de giros, volúmenes horarios y distribución de intervalos de llegada para modelos de tráfico en PTV Vissim.
            </p>
          </div>
        </div>
      </section>

      {/* LIDERAZGO ACADÉMICO */}
      <section className="py-12 sm:py-16 max-w-5xl mx-auto px-4 sm:px-6 w-full text-center">
        <h2 className="text-xl sm:text-2xl font-black text-white mb-2">
          Asesoría y Dirección Académica
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 mb-8 max-w-lg mx-auto">
          Iniciativa de investigación adscrita a la Facultad de Ingeniería de la Universidad de La Guajira.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
          <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl text-left flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0 font-black text-sm">
              MA
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-blue-300 tracking-wider block">
                Docente Líder Aforo Vial
              </span>
              <span className="font-bold text-white text-sm sm:text-base">
                Marlyn Aaron
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Investigación de Tránsito y Transporte
              </span>
            </div>
          </div>

          <div className="bg-slate-900/90 border border-slate-800 p-4 sm:p-5 rounded-3xl text-left flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0 font-black text-sm">
              RQ
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-300 tracking-wider block">
                Docente Líder Aforo Universitario
              </span>
              <span className="font-bold text-white text-sm sm:text-base">
                Robert Quintero
              </span>
              <span className="text-[11px] text-slate-400 block mt-0.5">
                Capacidad y Movilidad Peatonal
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mt-auto border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <LogoIsotipo className="w-5 h-5 opacity-60" />
            <span>Universidad de La Guajira • Riohacha, Colombia</span>
          </div>
          <div>
            Facultad de Ingeniería • Tránsito Vial & Micro-Simulación
          </div>
        </div>
      </footer>
    </div>
  );
};
