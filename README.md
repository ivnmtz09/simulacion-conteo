# Sistema de Levantamiento y Simulación de Aforo de Tráfico Vial (PTV Vissim)

Plataforma Web Progresiva (PWA) de alta precisión para el levantamiento de aforos vehiculares y peatonales en campo, modelado de comportamiento semafórico continuo y calibración empírica de tiempos de demora basada en Teoría de Colas para modelos de micro-simulación en PTV Vissim.

Universidad de La Guajira — Facultad de Ingeniería.

---

## 1. Resumen Ejecutivo y Arquitectura

El presente sistema permite a brigadas de campo registrar de forma simultánea, coordinada y con tolerancia a fallos de conectividad (offline-first) el flujo vehicular y peatonal en intersecciones semaforizadas de la malla vial urbana.

A diferencia de los instrumentos convencionales de aforo por pulso simple, esta plataforma incorpora:

1. **Modelo formal de Teoría de Colas (Cola FIFO + Servidor):** Mide con resolución de segundos el intervalo que cada unidad vehicular permanece en fila de espera ($W_q$) antes de arribar a la línea de detención, y el tiempo de atención en el servidor ($W_s$) hasta efectuar el cruce efectivo.
2. **Motor Determinista de Ciclo Semafórico Continuo Multi-Sectorial:** Computa analíticamente en tiempo de ejecución la fase semafórica de cruce (Verde, Amarillo, Rojo) sin intervención subjetiva del aforador.
3. **Módulo de Vehículos Parqueados e Interferencias:** Identifica unidades retenidas temporalmente en calzada que generan fricción lateral y bloqueo del carril.
4. **Módulo de Aforo Peatonal Universitario:** Cuantifica la ocupación de accesos e instalaciones en bloques académicos.
5. **Arquitectura Reactiva Distribuida:** Motor de sincronización en tiempo real sobre Firebase Cloud Firestore y autenticación unificada bajo el dominio institucional `uniguajira.edu.co`.

---

## 2. Puntos de Aforo y Parámetros Semafóricos

El sistema dispone de configuraciones predeterminadas para los puntos de estudio en la Troncal del Caribe e intersecciones estratégicas de Riohacha:

### Punto 1: Semáforo Calle 15 con Carrera 8
- **Ubicación:** Troncal del Caribe (Sentido Riohacha hacia Santa Marta).
- **Duración Total del Ciclo:** $T_1 = 95\text{ segundos}$.
- **Distribución de Tiempos:**
  - Fase Verde: $18\text{ s}$ ($[0, 18)\text{ s}$) — Cruce permitido.
  - Fase Amarilla 1 (post-verde): $3\text{ s}$ ($[18, 21)\text{ s}$) — Intervalo de despeje hacia rojo.
  - Fase Roja: $72\text{ s}$ ($[21, 93)\text{ s}$) — Detención obligatoria.
  - Fase Amarilla 2 (pre-verde): $2\text{ s}$ ($[93, 95)\text{ s}$) — Intervalo preparatorio hacia verde.

### Punto 2: Semáforo Cuatro Vías (Calle 15 con Carrera 15)
- **Ubicación:** Intersección Cuatro Vías (Sentido Santa Marta hacia Riohacha).
- **Duración Total del Ciclo:** $T_2 = 130\text{ segundos}$.
- **Distribución de Tiempos:**
  - Fase Verde: $25\text{ s}$ ($[0, 25)\text{ s}$) — Cruce permitido.
  - Fase Amarilla 1 (post-verde): $3\text{ s}$ ($[25, 28)\text{ s}$) — Intervalo de despeje hacia rojo.
  - Fase Roja: $99\text{ s}$ ($[28, 127)\text{ s}$) — Detención obligatoria.
  - Fase Amarilla 2 (post-rojo / pre-verde): $3\text{ s}$ ($[127, 130)\text{ s}$) — Intervalo preparatorio hacia verde.

---

## 3. Formulación Matemática del Modelo

### 3.1. Sincronización Temporal Inicial ($t_0$)
En campo, cualquier integrante de la brigada registra el instante exacto en que la señal luminosa física inicia la fase verde mediante la función de sincronización. Dicho valor base ($t_0$) se almacena como marca temporal Unix en milisegundos y se difunde automáticamente a todos los nodos conectados.

### 3.2. Evaluación de Fase y Posición en Ciclo
Para cualquier evento ocurrido en el instante $t \ge t_0$:

$$\Delta t = t - t_0$$

$$\text{segundoEnCiclo} = \left(\frac{\Delta t}{1000}\right) \pmod T$$

$$\text{numeroCiclo} = \left\lfloor \frac{\Delta t / 1000}{T} \right\rfloor + 1$$

Donde $T$ corresponde a la duración total del ciclo asignado a la intersección (95 s o 130 s).

### 3.3. Dinámica de Colas (Cola FIFO + Servidor)
La trayectoria de cada vehículo se descompone en dos segmentos temporales medibles:

```text
[Arribo a Cola] ────(Tiempo en Fila Wq)────> [Llegada a Semáforo] ────(Tiempo en Servidor Ws)────> [Cruce Efectivo]
horaEntradaCola                               horaLlegaServidor                                      horaSalida
```

1. **Entrada a Cola:** Registra el instante en que el vehículo se detiene al final de la cola física (`horaEntradaCola`).
2. **Llegada al Servidor:** Cuando el vehículo alcanza la primera posición de la línea de parada, se extrae el registro más antiguo de la cola mediante disciplina FIFO y se calcula:
   $$W_q = t_{\text{servidor}} - t_{\text{cola}}$$
3. **Cruce Efectivo:** Al atravesar la intersección, se registra `horaSalida` y se determinan:
   $$W_s = t_{\text{salida}} - t_{\text{servidor}}$$
   $$W = W_q + W_s = t_{\text{salida}} - t_{\text{cola}}$$
4. **Cruce Directo (Flujo Libre):** Para vehículos que transitan en verde sin experimentar detención previa, los tiempos de espera se computan como $0\text{ s}$ y la fase semafórica se deriva analíticamente del instante del evento.

---

## 4. Clasificación Vehicular y Maniobras Direccionales

El sistema clasifica el parque automotor según la normativa de transporte y calibración de micro-simulación:

- **Moto:** Motocicletas de combustión, mototaxis y vehículos eléctricos ligeros (tipo Ofero).
- **Carro:** Vehículos particulares y taxis de servicio público.
- **Camioneta:** Utilitarios deportivos (SUV), vehículos camperos y camionetas de platón.
- **Carga:** Camiones rígidos de dos o más ejes, furgones y tractocamiones.
- **Buses:** Unidades de transporte colectivo urbano, busetas y microbuses.
- **Peatón:** Transeúntes clasificados por cruce en cebra peatonal, fuera de cebra o tránsito sobre andén.

### Maniobras Direccionales
- Recto (continuación sobre calzada principal)
- Giro a la izquierda
- Giro a la derecha

---

## 5. Control de Acceso y Seguridad

El esquema de seguridad se sustenta en Firebase Authentication y Reglas de Seguridad de Cloud Firestore:

- **Dominio Institucional:** Acceso autorizado a usuarios con cuentas oficiales pertenecientes al dominio `@uniguajira.edu.co`.
- **Listas de Brigada:** Definición de roles asignados por punto de conteo:
  - **Brigada Punto 1 (Calle 15 con Carrera 8):**
    - `ijesusmartinez@uniguajira.edu.co`
    - `llouissierra@uniguajira.edu.co`
    - `jenriqueiguaran@uniguajira.edu.co`
    - `ljangulo@uniguajira.edu.co`
    - `conoriozarate@uniguajira.edu.co`
  - **Brigada Punto 2 (Cuatro Vías - Calle 15 con Carrera 15):**
    - `jazarate@uniguajira.edu.co`
    - `aprodriguezrodriguez@uniguajira.edu.co`
    - `scbeltran@uniguajira.edu.co`
    - `ymsalgado@uniguajira.edu.co`
    - `mjesusnavarro@uniguajira.edu.co`
  - **Brigada Aforo Peatonal Universitario:**
    - `janiez@uniguajira.edu.co`
    - `bcamilobrito@uniguajira.edu.co`
    - `sivanrodriguez@uniguajira.edu.co`
- **Reglas Declarativas (`firestore.rules`):** Verificación de procedencia de peticiones en lectura y escritura, garantizando segregación de roles y control de integridad en las colecciones `sesiones`, `eventos`, `sesionesAforoUni` y `eventosAforoUni`.

---

## 6. Exportación de Datos y Compatibilidad con PTV Vissim

La plataforma genera reportes estructurados en formatos XLSX y CSV codificados en UTF-8:

1. **Matriz de Resumen Operativo:** Volúmenes acumulados por categoría vehicular, discriminación de cruces en fase verde, ámbar o roja, tasas de giros direccionales y métricas de demora promedio ($W_q$, $W_s$, $W$) formateadas para su importación directa como matrices origen-destino y tablas de calibración en PTV Vissim.
2. **Bitácora Detallada de Eventos:** Tabla cronológica con identificador único, tipo de vehículo, estampa de tiempo de entrada a cola, llegada a semáforo, salida efectiva, fase de ciclo calculada, segundo exacto de cruce y número de ciclo.

---

## 7. Pila Tecnológica

- **Frontend:** React 19, TypeScript, Vite
- **Estilos e Interfaz:** Tailwind CSS, Lucide React
- **Capa de Persistencia y Tiempo Real:** Firebase Cloud Firestore
- **Autenticación:** Firebase Authentication (Google Identity Provider)
- **Despliegue y Alojamiento:** Firebase Hosting
- **Capacidades Offline:** Service Workers con Workbox (`vite-plugin-pwa`)
- **Procesamiento de Hojas de Cálculo:** SheetJS (xlsx)
- **Análisis Estático de Código:** Oxlint

---

## 8. Procedimiento de Instalación y Ejecución Local

### 8.1. Requisitos Previos
- Node.js versión 18 o superior
- npm versión 9 o superior

### 8.2. Clonación e Instalación
```bash
git clone https://github.com/ivnmtz09/simulacion-conteo.git
cd simulacion-conteo
npm install
```

### 8.3. Configuración de Variables de Entorno
Cree un archivo `.env` en la raíz del proyecto tomando como referencia `.env.example`:

```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 8.4. Comandos de Operación
```bash
# Iniciar servidor de desarrollo
npm run dev

# Ejecutar análisis estático (Oxlint)
npm run lint

# Compilar paquete de producción y verificar tipos TypeScript
npm run build
```

---

## 9. Equipo de Trabajo y Asesoría Académica

### Docentes Asesores del Proyecto
- **Docente Líder Aforo Vial:** Marlyn Aaron
- **Docente Líder Aforo Universitario:** Robert Quintero

### Equipo de Desarrollo e Investigación
- Jesús Martínez (`ijesusmartinez@uniguajira.edu.co`)
- Louis Sierra (`llouissierra@uniguajira.edu.co`)
- Enrique Iguarán (`jenriqueiguaran@uniguajira.edu.co`)
- Luis Angulo (`ljangulo@uniguajira.edu.co`)
- Conorio Zárate (`conoriozarate@uniguajira.edu.co`)
- Juan Zárate (`jazarate@uniguajira.edu.co`)
- Anderson Rodríguez (`aprodriguezrodriguez@uniguajira.edu.co`)
- Santiago Beltrán (`scbeltran@uniguajira.edu.co`)
- Yasser Salgado (`ymsalgado@uniguajira.edu.co`)
- Moisés Navarro (`mjesusnavarro@uniguajira.edu.co`)
