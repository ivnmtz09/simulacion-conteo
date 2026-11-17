import React from 'react';

interface LogoIsotipoProps {
  className?: string;
  size?: number;
  variant?: 'color' | 'monochrome';
}

/**
 * Isotipo vectorial minimalista de Tránsito y Aforo Vial Uniguajira.
 * Integra simbólicamente la confluencia de flujos viales, ejes direccionales
 * y la señalética semafórica en un isotipo geométrico limpio y escalable.
 */
export const LogoIsotipo: React.FC<LogoIsotipoProps> = ({
  className = 'w-9 h-9',
  size,
  variant = 'color'
}) => {
  const isColor = variant === 'color';

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={size ? { width: size, height: size } : undefined}
      aria-label="Isotipo Sistema de Aforo Vial"
      role="img"
    >
      <defs>
        <linearGradient id="isoGradPrimary" x1="8" y1="8" x2="56" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor={isColor ? '#2563eb' : 'currentColor'} />
          <stop offset="0.5" stopColor={isColor ? '#0284c7' : 'currentColor'} />
          <stop offset="1" stopColor={isColor ? '#10b981' : 'currentColor'} />
        </linearGradient>
        <linearGradient id="isoGradGlow" x1="16" y1="16" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop stopColor={isColor ? '#38bdf8' : 'currentColor'} stopOpacity="0.8" />
          <stop offset="1" stopColor={isColor ? '#34d399' : 'currentColor'} stopOpacity="0.8" />
        </linearGradient>
      </defs>

      {/* Base geométrica contenedora */}
      <rect
        x="6"
        y="6"
        width="52"
        height="52"
        rx="16"
        fill={isColor ? '#090d16' : 'none'}
        stroke="url(#isoGradPrimary)"
        strokeWidth="2.5"
      />

      {/* Confluencia de carriles / Intersección ortogonal minimalista */}
      <path
        d="M32 14V50"
        stroke={isColor ? '#334155' : 'currentColor'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />
      <path
        d="M14 32H50"
        stroke={isColor ? '#334155' : 'currentColor'}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray="4 4"
      />

      {/* Flechas de flujo dinámico */}
      <path
        d="M23 44L23 20L28 25"
        stroke={isColor ? '#60a5fa' : 'currentColor'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M41 20L41 44L36 39"
        stroke={isColor ? '#34d399' : 'currentColor'}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Núcleo de sincronización semafórica (Tríada cromática de precisión) */}
      <circle cx="32" cy="24" r="3.2" fill={isColor ? '#f43f5e' : 'currentColor'} />
      <circle cx="32" cy="32" r="3.2" fill={isColor ? '#f59e0b' : 'currentColor'} />
      <circle cx="32" cy="40" r="3.2" fill={isColor ? '#10b981' : 'currentColor'} />

      {/* Anillo de resguardo óptico central */}
      <circle
        cx="32"
        cy="32"
        r="14"
        stroke="url(#isoGradGlow)"
        strokeWidth="1.2"
        strokeOpacity="0.4"
      />
    </svg>
  );
};
