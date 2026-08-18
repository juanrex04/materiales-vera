export const CATEGORIAS_REVISION = [
  {
    titulo: 'LUCES Y SEGURIDAD',
    items: [
      { key: 'luces_frontales', label: 'Frontales de servicio (altas y bajas)' },
      { key: 'luces_traseras', label: 'Traseras de trabajo (Reflector)' },
      { key: 'direccionales_delanteras', label: 'Direccionales delanteras de parqueo' },
      { key: 'direccionales_traseras', label: 'Direccionales traseras de parqueo' },
      { key: 'espejos_laterales', label: 'Espejos laterales' },
      { key: 'alarma_retroceso', label: 'Alarma de retroceso' },
      { key: 'pito', label: 'Pito' }
    ]
  },
  {
    titulo: 'CABINA Y FRENOS',
    items: [
      { key: 'freno_servicio', label: 'Freno de servicio' },
      { key: 'freno_emergencia', label: 'Freno de emergencia' },
      { key: 'direccion_suspension', label: 'Dirección/suspensión (terminales)' },
      { key: 'cinturon_seguridad', label: 'Cinturón de seguridad' },
      { key: 'vidrio_frontal', label: 'Vidrio frontal (en buen estado)' },
      { key: 'limpia_brisas', label: 'Limpia brisas' },
      { key: 'silleteria', label: 'Silletería y tapicería' },
      { key: 'indicadores_tablero', label: 'Indicadores (hidráulicos, voltímetro, etc)' },
      { key: 'baterias_cables', label: 'Baterías y cables' },
      { key: 'presion_aire', label: 'Presión de Aire' }
    ]
  },
  {
    titulo: 'MECÁNICA Y VOLCO',
    items: [
      { key: 'llantas_estado', label: 'Llantas en buen estado (sin cortaduras ni abultamientos)' },
      { key: 'fugas_hidraulicas', label: 'Control de fugas hidráulicas' },
      { key: 'pasadores_suspension', label: 'Pasadores, suspensión' },
      { key: 'fugas_aire', label: 'Control fuga de aire' },
      { key: 'grapas_chasis', label: 'Grapas y anclajes de chasis' },
      { key: 'cadena_cardan', label: 'Cadena del cardán' },
      { key: 'acoples_rapidos', label: 'Acoples rápidos' },
      { key: 'mangueras', label: 'Mangueras' },
      { key: 'estado_volco', label: 'Estado general del volco' },
      { key: 'soporte_volco', label: 'Soporte del volco (Gato hidráulico)' },
      { key: 'tanque_combustible', label: 'Tanque de combustible (abrazaderas soporte)' },
      { key: 'motor', label: 'Motor' },
      { key: 'sistema_cargado', label: 'Sistema de cargado' },
      { key: 'ganchos_compuerta', label: 'Ganchos compuerta' },
      { key: 'soportes_buge', label: 'Soportes buje volco' }
    ]
  },
  {
    titulo: 'DOCUMENTOS Y KIT CARRETERA',
    items: [
      { key: 'documentos', label: 'Documentos conductor y del vehículo' },
      { key: 'gato', label: 'Gato' },
      { key: 'cruceta', label: 'Cruceta' },
      { key: 'taco', label: 'Taco' },
      { key: 'caja_herramientas', label: 'Caja de Herramientas' },
      { key: 'llanta_repuesto', label: 'Llanta de Repuesto' },
      { key: 'linterna', label: 'Linterna' },
      { key: 'senales_carretera', label: 'Señales de Carretera (Triángulos)' },
      { key: 'botiquin', label: 'Botiquín de Primeros Auxilios' },
      { key: 'extintor', label: 'Extintor de incendio (10 lbs) PQS' }
    ]
  }
];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

function formatearFechaLarga(fecha) {
  if (!fecha) return 'No registrada';
  const texto = String(fecha).split('T')[0];
  const partes = texto.split('-');
  if (partes.length !== 3) return texto;
  const [, m, d] = partes;
  const mes = MESES[parseInt(m) - 1];
  if (!mes) return texto;
  return `${parseInt(d)} de ${mes} de ${partes[0]}`;
}

function fechaGeneracion() {
  const a = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(a.getDate())}/${pad(a.getMonth() + 1)}/${a.getFullYear()} ${pad(a.getHours())}:${pad(a.getMinutes())}`;
}

let logoCache = null;

export async function precargarLogo() {
  if (logoCache) return logoCache;
  try {
    const res = await fetch('/logo.png');
    const blob = await res.blob();
    logoCache = await new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    logoCache = null;
  }
  return logoCache;
}

function makeHeader(logo, tituloDoc, numeroDoc) {
  const fecha = fechaGeneracion();
  return [
    {
      table: {
        widths: ['12%', '*', '22%'],
        body: [
          [
            logo ? { image: logo, width: 45, height: 45, fit: [45, 45], margin: [0, 2, 0, 0] } : '',
            {
              stack: [
                { text: 'VERA S.A.S.', fontSize: 15, bold: true, color: '#1e3a8a', alignment: 'center' },
                { text: 'Sistema de Gestión de Flota – Materiales Vera', fontSize: 7.5, color: '#475569', alignment: 'center', margin: [0, 2, 0, 0] }
              ],
              margin: [0, 6, 0, 0]
            },
            {
              text: [
                { text: 'N° Doc: ', bold: true, fontSize: 7.5 },
                { text: numeroDoc + '\n', fontSize: 7.5 },
                { text: 'Generado: ', bold: true, fontSize: 7.5 },
                { text: fecha, fontSize: 7.5 }
              ],
              alignment: 'right',
              margin: [0, 5, 0, 0]
            }
          ]
        ]
      },
      layout: 'noBorders',
      margin: [0, 0, 0, 3]
    },
    { canvas: [{ type: 'line', x1: 0, y1: 0, x2: 515, y2: 0, lineWidth: 2, lineColor: '#1e3a8a' }], margin: [0, 0, 0, 5] }
  ];
}

function makeFooter() {
  const fecha = fechaGeneracion();
  return (currentPage, pageCount) => ({
    columns: [
      { text: `Generado por Materiales Vera – VERA S.A.S.  |  ${fecha}`, fontSize: 7, color: '#78716c', margin: [15, 0, 0, 0] },
      { text: `Página ${currentPage} de ${pageCount}`, fontSize: 7, color: '#78716c', alignment: 'right', margin: [0, 0, 15, 0] }
    ]
  });
}

function cellLabel(text) {
  return { text, margin: [4, 3, 4, 3] };
}

function cellValue(text, fillColor) {
  return { text, margin: [4, 3, 4, 3], fillColor: fillColor || undefined };
}

function cellOK() {
  return { text: 'OK', alignment: 'center', bold: true, color: '#ffffff', fillColor: '#16a34a', margin: [4, 2, 4, 2] };
}

function cellERROR() {
  return { text: 'ERROR', alignment: 'center', bold: true, color: '#ffffff', fillColor: '#dc2626', margin: [4, 2, 4, 2] };
}

function cellEmpty() {
  return { text: '', alignment: 'center', fillColor: '#f8fafc', margin: [4, 2, 4, 2] };
}

const TABLE_LAYOUT = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#cbd5e1',
  vLineColor: () => '#cbd5e1'
};

const TABLE_LAYOUT_INFO = {
  hLineWidth: () => 0.5,
  vLineWidth: () => 0.5,
  hLineColor: () => '#94a3b8',
  vLineColor: () => '#94a3b8'
};

export function generarReporteIndividual(chk) {
  if (!chk) return null;

  const logo = logoCache;
  const numeroDoc = `INSP-${String(chk.placa).toUpperCase()}-${chk.fecha_formateada}`;
  const apto = chk.apto_para_trabajar;
  const resultColor = apto ? '#16a34a' : '#dc2626';
  const resultText = apto ? 'VEHÍCULO APTO PARA TRABAJAR' : 'NO APTO – REQUIERE REVISIÓN';

  let total = 0, ok = 0;
  CATEGORIAS_REVISION.forEach(c => c.items.forEach(i => { total++; if (chk[i.key]) ok++; }));

  const content = [];

  content.push(...makeHeader(logo, 'VERA S.A.S.', numeroDoc));

  content.push({
    text: 'REPORTE DE INSPECCIÓN PREOPERACIONAL DE VEHÍCULO',
    fontSize: 12, bold: true, color: '#1e3a8a', alignment: 'center',
    margin: [0, 0, 0, 6]
  });

  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          cellValue([{ text: 'Conductor: ', bold: true }, chk.conductor], '#f1f5f9'),
          cellValue([{ text: 'Vehículo: ', bold: true }, `${chk.placa} (${chk.marca})`], '#f1f5f9')
        ],
        [
          cellValue([{ text: 'Fecha de Revisión: ', bold: true }, formatearFechaLarga(chk.fecha_formateada)]),
          cellValue([{ text: 'Hora: ', bold: true }, chk.hora])
        ],
        [
          {
            text: [
              { text: 'Resultado: ', bold: true },
              { text: ` ${resultText} `, bold: true, color: '#ffffff', fillColor: resultColor }
            ],
            colSpan: 2, margin: [4, 3, 4, 3]
          },
          ''
        ]
      ]
    },
    layout: TABLE_LAYOUT_INFO,
    margin: [0, 0, 0, 6]
  });

  CATEGORIAS_REVISION.forEach((cat) => {
    const body = [
      [{ text: cat.titulo, colSpan: 2, bold: true, color: '#ffffff', fillColor: '#1e3a8a', margin: [4, 3, 4, 3] }, '']
    ];
    cat.items.forEach(item => {
      body.push([
        cellLabel(item.label),
        chk[item.key] ? cellOK() : cellERROR()
      ]);
    });
    content.push({
      table: { widths: ['*', '12%'], body },
      layout: TABLE_LAYOUT,
      margin: [0, 2, 0, 2]
    });
  });

  content.push({
    table: {
      widths: ['*', '*', '*'],
      body: [[
        { text: [{ text: 'Total puntos: ', bold: true }, total], alignment: 'center', margin: [4, 3, 4, 3] },
        { text: [{ text: 'OK: ', bold: true }, ok], alignment: 'center', fillColor: '#dcfce7', margin: [4, 3, 4, 3] },
        { text: [{ text: 'ERROR: ', bold: true }, total - ok], alignment: 'center', fillColor: '#fee2e2', margin: [4, 3, 4, 3] }
      ]]
    },
    layout: TABLE_LAYOUT_INFO,
    margin: [0, 6, 0, 6]
  });

  content.push({
    text: [
      { text: 'Novedades y Observaciones del Conductor:\n', bold: true },
      { text: chk.observaciones || 'Ninguna observación registrada.' }
    ],
    margin: [0, 0, 0, 4]
  });

  content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.5, lineColor: '#334155' }], margin: [0, 22, 0, 2] });
  content.push({
    columns: [
      { width: '45%', text: [{ text: chk.conductor, bold: true }, '\nFirma del Conductor con Cédula'], fontSize: 8 },
      { width: '10%', text: '' },
      { width: '45%', text: [{ text: 'Administrador / Jefe de Operaciones', bold: true }, '\nFirma y sello'], fontSize: 8 }
    ]
  });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [15, 15, 15, 25],
    content,
    footer: makeFooter(),
    defaultStyle: { font: 'Roboto', fontSize: 9 }
  };
}

function obtenerValorMatriz(key, dia, checklists) {
  const chk = checklists.find(c => {
    const f = new Date(c.fecha_formateada + 'T12:00:00');
    let ds = f.getDay();
    ds = ds === 0 ? 7 : ds;
    return ds === dia;
  });
  if (!chk) return '';
  return chk[key] ? 'OK' : 'ERROR';
}

export function generarMatrizSemanal(checklists, filtros, vehiculo) {
  if (!checklists || checklists.length === 0) return null;

  const logo = logoCache;
  const placa = filtros.placa ? filtros.placa.toUpperCase() : 'TODAS';
  const numeroDoc = `MAT-${filtros.fechaInicio}-${filtros.fechaFin}`;
  const fechaSoat = vehiculo?.fecha_soat ? formatearFechaLarga(vehiculo.fecha_soat) : 'N/A';
  const fechaTecno = vehiculo?.fecha_tecnomecanica ? formatearFechaLarga(vehiculo.fecha_tecnomecanica) : 'N/A';
  const conductorFrec = checklists[0]?.conductor || '';
  const diasLabels = ['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

  const content = [];

  content.push(...makeHeader(logo, 'VERA S.A.S.', numeroDoc));

  content.push({
    text: 'MATRIZ SEMANAL DE INSPECCIONES PREOPERACIONALES',
    fontSize: 11, bold: true, color: '#1e3a8a', alignment: 'center',
    margin: [0, 0, 0, 5]
  });

  content.push({
    table: {
      widths: ['50%', '50%'],
      body: [
        [
          cellValue([{ text: 'PLACA DEL VEHÍCULO: ', bold: true }, placa], '#f1f5f9'),
          cellValue([{ text: 'FECHA (Semana): ', bold: true }, `${formatearFechaLarga(filtros.fechaInicio)} al ${formatearFechaLarga(filtros.fechaFin)}`], '#f1f5f9')
        ],
        [
          cellValue([{ text: 'SOAT Vence: ', bold: true }, fechaSoat]),
          cellValue([{ text: 'TECNOMECÁNICA Vence: ', bold: true }, fechaTecno])
        ]
      ]
    },
    layout: TABLE_LAYOUT_INFO,
    margin: [0, 0, 0, 5]
  });

  CATEGORIAS_REVISION.forEach((cat) => {
    const subHeader = [
      { text: 'CONCEPTO', bold: true, color: '#1e293b', fillColor: '#e2e8f0', margin: [3, 2, 3, 2], fontSize: 7.5 },
      ...diasLabels.map(d => ({
        text: d, bold: true, color: '#1e293b', fillColor: '#e2e8f0',
        alignment: 'center', margin: [3, 2, 3, 2], fontSize: 7.5
      }))
    ];

    const rows = cat.items.map(item => {
      const cells = [{ text: item.label, margin: [3, 2, 3, 2], fontSize: 7.5 }];
      for (let d = 1; d <= 7; d++) {
        const val = obtenerValorMatriz(item.key, d, checklists);
        if (val === 'OK') cells.push(cellOK());
        else if (val === 'ERROR') cells.push(cellERROR());
        else cells.push(cellEmpty());
      }
      return cells;
    });

    content.push({
      table: {
        widths: ['34%', '*', '*', '*', '*', '*', '*', '*'],
        body: [
          [{ text: cat.titulo, colSpan: 8, bold: true, color: '#ffffff', fillColor: '#1e3a8a', margin: [3, 2, 3, 2], fontSize: 8 }, '', '', '', '', '', '', ''],
          subHeader,
          ...rows
        ]
      },
      layout: TABLE_LAYOUT,
      margin: [0, 2, 0, 2]
    });
  });

  const obsItems = [];
  checklists.forEach(chk => {
    if (chk.observaciones) {
      obsItems.push({ text: `${formatearFechaLarga(chk.fecha_formateada)}: `, bold: true });
      obsItems.push({ text: chk.observaciones + '\n' });
    }
  });
  content.push({
    text: [
      { text: 'Observaciones de la Semana:\n', bold: true },
      obsItems.length > 0 ? obsItems : 'Sin observaciones registradas.'
    ],
    margin: [0, 4, 0, 4]
  });

  content.push({ canvas: [{ type: 'line', x1: 0, y1: 0, x2: 230, y2: 0, lineWidth: 0.5, lineColor: '#334155' }], margin: [0, 22, 0, 2] });
  content.push({
    columns: [
      { width: '45%', text: [{ text: 'Realizado Por (Nombre):', bold: true }, `\n${conductorFrec}`], fontSize: 8 },
      { width: '10%', text: '' },
      { width: '45%', text: [{ text: 'Firma del Conductor Con Cédula:', bold: true }], fontSize: 8 }
    ]
  });

  return {
    pageSize: 'A4',
    pageOrientation: 'landscape',
    pageMargins: [15, 15, 15, 25],
    content,
    footer: makeFooter(),
    defaultStyle: { font: 'Roboto', fontSize: 8 }
  };
}
