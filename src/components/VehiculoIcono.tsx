import React from 'react';
import { Bike, Car, CarFront, Truck, Bus, Footprints, type LucideIcon } from 'lucide-react';
import type { TipoVehiculo } from '../types/conteo';

const VEHICULO_ICONOS: Record<TipoVehiculo, LucideIcon> = {
  moto: Bike,
  carro: Car,
  camioneta: CarFront,
  carga: Truck,
  buses: Bus,
  peaton: Footprints
};

interface VehiculoIconoProps {
  tipo: TipoVehiculo;
  className?: string;
  size?: number;
}

export const VehiculoIcono: React.FC<VehiculoIconoProps> = ({
  tipo,
  className = 'w-5 h-5',
  size
}) => {
  const IconoComponente = VEHICULO_ICONOS[tipo] || Car;
  return <IconoComponente className={className} size={size} />;
};
