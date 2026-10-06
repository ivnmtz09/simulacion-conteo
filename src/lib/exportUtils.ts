import * as XLSX from 'xlsx';
import type { EventoConteo, SesionConteo } from '../types/conteo';
import { TIPOS_VEHICULOS, LISTA_TIPOS_VEHICULOS } from '../types/conteo';

function formatFecha(isoOrTimestamp?: string | number | null): string {
  if (!isoOrTimestamp) return '';
  const d = new Date(isoOrTimestamp);
  if (isNaN(d.getTime())) return String(isoOrTimestamp);
  return d.toLocaleString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function formatHora(isoOrTimestamp?: string | number | null): string {
  if (!isoOrTimestamp) return '';
  const d = new Date(isoOrTimestamp);
  if (isNaN(d.getTime())) return String(isoOrTimestamp);
  return d.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

function etiquetaCategoria(cat?: string | null): string {
  switch (cat) {
    case 'respeta':
      return 'Cruza en verde (respeta)';
    case 'se_vuela':
      return 'Cruza en rojo (se vuela)';
    case 'cebra':
      return 'Cruza por cebra';
    case 'fuera_cebra':
      return 'Cruza fuera de cebra (imprudente)';
    case 'anden':
      return 'Pasa por andén/acera';
    default:
      return cat || '';
  }
}

function etiquetaTipoRegistro(tr?: string): string {
  switch (tr) {
    case 'entrada_cola':
      return 'Entrada a la Cola';
    case 'llega_servidor':
      return 'Llegada al Servidor / Semáforo';
    case 'salida_cola':
      return 'Salida de Cola / Cruce';
    case 'movimiento':
      return 'Giro / Movimiento';
    case 'peaton':
      return 'Cruce Peatonal';
    default:
      return tr || '';
  }
}

export function generarFilasDetalle(sesion: SesionConteo, eventos: EventoConteo[]) {
  return eventos.map((ev, index) => {
    const infoVehiculo = TIPOS_VEHICULOS[ev.tipoVehiculo];
    const tiempoTotal =
      ev.tiempoTotalSeg !== null && ev.tiempoTotalSeg !== undefined
        ? ev.tiempoTotalSeg
        : (ev.duracionEsperaSeg !== null && ev.duracionEsperaSeg !== undefined
            ? ev.duracionEsperaSeg
            : 'N/A');

    return {
      '#': index + 1,
      'ID Evento': ev.id,
      'ID Sesión': ev.sesionId,
      'Nombre Sesión': sesion.nombre || 'Sesión sin nombre',
      'Ubicación': sesion.ubicacion || 'N/A',
      'Fecha y Hora': formatFecha(ev.timestampCreacion),
      'Usuario': ev.usuario,
      'Tipo de Vehículo': infoVehiculo?.nombre || ev.tipoVehiculo,
      'Tipo de Registro': etiquetaTipoRegistro(ev.tipoRegistro),
      'Categoría Salida': etiquetaCategoria(ev.categoriaSalida),
      'Movimiento / Giro': ev.movimiento ? ev.movimiento.toUpperCase() : 'N/A',
      'Hora Entrada Cola': ev.horaEntradaCola ? formatHora(ev.horaEntradaCola) : 'N/A',
      'Hora Llega Servidor': ev.horaLlegaServidor ? formatHora(ev.horaLlegaServidor) : 'N/A',
      'Hora Salida': ev.horaSalida ? formatHora(ev.horaSalida) : 'N/A',
      'Tiempo en Cola (s)': ev.tiempoEnColaSeg !== null && ev.tiempoEnColaSeg !== undefined ? ev.tiempoEnColaSeg : 'N/A',
      'Tiempo en Servidor (s)': ev.tiempoEnServidorSeg !== null && ev.tiempoEnServidorSeg !== undefined ? ev.tiempoEnServidorSeg : 'N/A',
      'Tiempo Total (s)': tiempoTotal,
      'Registro Manual': ev.esManual ? 'SÍ' : 'NO'
    };
  });
}

export function generarFilasResumenVissim(eventos: EventoConteo[]) {
  return LISTA_TIPOS_VEHICULOS.map((tipo) => {
    const info = TIPOS_VEHICULOS[tipo];
    const eventosTipo = eventos.filter((e) => e.tipoVehiculo === tipo);

    if (tipo === 'peaton') {
      const cebra = eventosTipo.filter((e) => e.categoriaSalida === 'cebra').length;
      const fueraCebra = eventosTipo.filter((e) => e.categoriaSalida === 'fuera_cebra').length;
      const anden = eventosTipo.filter((e) => e.categoriaSalida === 'anden').length;
      const total = cebra + fueraCebra + anden;

      return {
        'Categoría': info.nombre,
        'Total Flujo': total,
        'Respeta (Verde / Cebra)': cebra,
        'Infracción (Rojo / Fuera cebra)': fueraCebra,
        'Paso por Andén': anden,
        '% Cumplimiento': total > 0 ? `${((cebra / total) * 100).toFixed(1)}%` : '0%',
        'T. Cola Promedio (s)': 'N/A',
        'T. Servidor Promedio (s)': 'N/A',
        'Tiempo Total Promedio (s)': 'N/A',
        'Espera Máxima (s)': 'N/A',
        'Giro Recto': 'N/A',
        'Giro Izquierda': 'N/A',
        'Giro Derecha': 'N/A'
      };
    }

    const salidas = eventosTipo.filter((e) => e.tipoRegistro === 'salida_cola');
    const respeta = salidas.filter((e) => e.categoriaSalida === 'respeta').length;
    const seVuela = salidas.filter((e) => e.categoriaSalida === 'se_vuela').length;
    const totalSalidas = respeta + seVuela;

    const esperasCola = salidas
      .map((e) => e.tiempoEnColaSeg)
      .filter((d): d is number => typeof d === 'number');

    const esperasServidor = salidas
      .map((e) => e.tiempoEnServidorSeg)
      .filter((d): d is number => typeof d === 'number');

    const esperasTotales = salidas
      .map((e) => e.tiempoTotalSeg ?? e.duracionEsperaSeg)
      .filter((d): d is number => typeof d === 'number');

    const promCola = esperasCola.length > 0
      ? (esperasCola.reduce((acc, curr) => acc + curr, 0) / esperasCola.length).toFixed(1)
      : '0.0';

    const promServidor = esperasServidor.length > 0
      ? (esperasServidor.reduce((acc, curr) => acc + curr, 0) / esperasServidor.length).toFixed(1)
      : '0.0';

    const promTotal = esperasTotales.length > 0
      ? (esperasTotales.reduce((acc, curr) => acc + curr, 0) / esperasTotales.length).toFixed(1)
      : '0.0';

    const maxEspera = esperasTotales.length > 0 ? Math.max(...esperasTotales) : 0;

    const giros = eventosTipo.filter((e) => e.tipoRegistro === 'movimiento');
    const recto = giros.filter((e) => e.movimiento === 'recto').length;
    const izquierda = giros.filter((e) => e.movimiento === 'izquierda').length;
    const derecha = giros.filter((e) => e.movimiento === 'derecha').length;

    return {
      'Categoría': info.nombre,
      'Total Flujo': totalSalidas,
      'Respeta (Verde / Cebra)': respeta,
      'Infracción (Rojo / Fuera cebra)': seVuela,
      'Paso por Andén': 'N/A',
      '% Cumplimiento': totalSalidas > 0 ? `${((respeta / totalSalidas) * 100).toFixed(1)}%` : '0%',
      'T. Cola Promedio (s)': promCola,
      'T. Servidor Promedio (s)': promServidor,
      'Tiempo Total Promedio (s)': promTotal,
      'Espera Máxima (s)': maxEspera,
      'Giro Recto': recto,
      'Giro Izquierda': izquierda,
      'Giro Derecha': derecha
    };
  });
}

export function exportarEventosXLSX(sesion: SesionConteo, eventos: EventoConteo[]) {
  const wb = XLSX.utils.book_new();

  // Hoja 1: Resumen Vissim
  const resumenData = generarFilasResumenVissim(eventos);
  const wsResumen = XLSX.utils.json_to_sheet(resumenData);
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen VISSIM');

  // Hoja 2: Detalle Completo de Eventos
  const detalleData = generarFilasDetalle(sesion, eventos);
  const wsDetalle = XLSX.utils.json_to_sheet(detalleData);
  XLSX.utils.book_append_sheet(wb, wsDetalle, 'Eventos Detallados');

  const safeNombre = (sesion.nombre || 'aforo').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `Aforo_${safeNombre}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, filename);
}

export function exportarEventosCSV(sesion: SesionConteo, eventos: EventoConteo[]) {
  const detalleData = generarFilasDetalle(sesion, eventos);
  const ws = XLSX.utils.json_to_sheet(detalleData);
  const csvContent = XLSX.utils.sheet_to_csv(ws);

  // Agregar BOM para soporte UTF-8 en Excel
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  const safeNombre = (sesion.nombre || 'aforo').replace(/[^a-zA-Z0-9_-]/g, '_');
  link.setAttribute('href', url);
  link.setAttribute('download', `Aforo_${safeNombre}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
