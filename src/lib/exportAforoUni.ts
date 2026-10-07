import * as XLSX from 'xlsx';
import type { SesionAforoUni, EventoAforoUni, MetricasAforoUni } from '../types/aforoUniversitario';

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

export function exportarAforoUniXLSX(
  sesion: SesionAforoUni,
  eventos: EventoAforoUni[],
  metricas: MetricasAforoUni
) {
  const wb = XLSX.utils.book_new();

  // 1. Hoja de Resumen Ejecutivo
  const resumenData: (string | number | undefined)[][] = [
    ['UNIVERSIDAD DE LA GUAJIRA - SISTEMA DE CONTROL DE AFORO'],
    ['REPORTE DE TRÁNSITO Y OCUPACIÓN EN BLOQUE UNIVERSITARIO'],
    [],
    ['DATOS GENERALES DE LA MEDICIÓN'],
    ['ID Sesión', sesion.id],
    ['Nombre de la Medición', sesion.nombre],
    ['Bloque / Edificio', sesion.bloque],
    ['Puerta / Acceso', sesion.puertaAcceso || 'Acceso general'],
    ['Responsable', sesion.usuario],
    ['Fecha de Inicio', formatFecha(sesion.fechaCreacion)],
    ['Fecha de Cierre', sesion.fechaCierre ? formatFecha(sesion.fechaCierre) : 'Sesión en curso / Abierta'],
    ['Capacidad Máxima Sugerida', sesion.capacidadMaxima ? `${sesion.capacidadMaxima} personas` : 'Sin límite fijado'],
    [],
    ['MÉTRICAS Y RESULTADOS DE AFORO'],
    ['Aforo Actual / Final', metricas.aforoActual],
    ['Total Personas que Entraron', metricas.totalEntradas],
    ['Total Personas que Salieron', metricas.totalSalidas],
    ['Volumen Total de Tránsito (Entradas + Salidas)', metricas.volumenTransito],
    ['Aforo Pico Máximo Alcanzado', metricas.aforoPico],
    ['Hora del Pico Máximo', metricas.horaPico || 'N/A'],
    [
      'Porcentaje de Ocupación Pico',
      sesion.capacidadMaxima
        ? `${Math.round((metricas.aforoPico / sesion.capacidadMaxima) * 100)}%`
        : 'N/A'
    ],
    ['Total Registros en Bitácora', eventos.filter((e) => !e.enPapelera).length],
    [],
    ['Generado el', formatFecha(new Date().toISOString())]
  ];

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenData);

  // Ajuste de anchos para la hoja de resumen
  wsResumen['!cols'] = [{ wch: 38 }, { wch: 45 }];
  XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen Aforo');

  // 2. Hoja de Bitácora Cronológica Detallada
  const eventosActivos = eventos.filter((e) => !e.enPapelera);
  const filasBitacora = eventosActivos.map((ev, index) => ({
    '#': index + 1,
    'ID Registro': ev.id,
    'Fecha y Hora': formatFecha(ev.timestamp),
    'Hora': formatHora(ev.timestamp),
    'Tipo de Movimiento': ev.tipo === 'entrada' ? 'ENTRADA (+)' : 'SALIDA (-)',
    'Cantidad de Personas': ev.cantidad,
    'Aforo en ese Instante': ev.aforoMomento,
    'Registrado Por': ev.usuario,
    'Registro Manual': ev.esManual ? 'SÍ' : 'NO',
    'Observaciones': ev.nota || ''
  }));

  const wsBitacora = XLSX.utils.json_to_sheet(filasBitacora);
  wsBitacora['!cols'] = [
    { wch: 6 },
    { wch: 24 },
    { wch: 22 },
    { wch: 12 },
    { wch: 20 },
    { wch: 20 },
    { wch: 22 },
    { wch: 30 },
    { wch: 16 },
    { wch: 25 }
  ];
  XLSX.utils.book_append_sheet(wb, wsBitacora, 'Bitácora Detallada');

  // Nombre de archivo limpio y descriptivo
  const bloqueSaneado = sesion.bloque.replace(/[^a-zA-Z0-9]/g, '_');
  const fechaStr = new Date().toISOString().slice(0, 10);
  const nombreArchivo = `Aforo_Uniguajira_${bloqueSaneado}_${fechaStr}.xlsx`;

  XLSX.writeFile(wb, nombreArchivo);
}

export function exportarAforoUniCSV(
  sesion: SesionAforoUni,
  eventos: EventoAforoUni[]
) {
  const eventosActivos = eventos.filter((e) => !e.enPapelera);
  const filas = [
    [
      'Numero',
      'ID_Registro',
      'Sesion',
      'Bloque',
      'Fecha_Hora',
      'Tipo_Movimiento',
      'Cantidad',
      'Aforo_Momento',
      'Usuario',
      'Notas'
    ]
  ];

  eventosActivos.forEach((ev, index) => {
    filas.push([
      String(index + 1),
      ev.id,
      `"${sesion.nombre.replace(/"/g, '""')}"`,
      `"${sesion.bloque.replace(/"/g, '""')}"`,
      formatFecha(ev.timestamp),
      ev.tipo.toUpperCase(),
      String(ev.cantidad),
      String(ev.aforoMomento),
      ev.usuario,
      `"${(ev.nota || '').replace(/"/g, '""')}"`
    ]);
  });

  const csvContent = '\uFEFF' + filas.map((f) => f.join(',')).join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const bloqueSaneado = sesion.bloque.replace(/[^a-zA-Z0-9]/g, '_');
  const fechaStr = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `Aforo_Uniguajira_${bloqueSaneado}_${fechaStr}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
