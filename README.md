# Simulador y Aforo de Tráfico Vial (PTV Vissim) 🚦🚗🏍️

> **Progressive Web App (PWA)** de alta precisión para levantamiento de aforos vehiculares y peatonales en campo, análisis de comportamiento semafórico continuo y calibración de tiempos de espera basada en **Teoría de Colas** para modelos de micro-simulación en **PTV Vissim**.

---

## 📋 Descripción General

Esta plataforma permite a brigadas de aforadores registrar de forma colaborativa, en tiempo real y offline-resiliente, el flujo vehicular y peatonal en intersecciones semaforizadas.

A diferencia de los contadores tradicionales de pulso, la aplicación implementa:
1. Un **modelo formal de Teoría de Colas (Fila + Servidor)** que mide con exactitud de segundos el tiempo que un vehículo pasa esperando en la fila antes de alcanzar el semáforo y el tiempo que tarda en el semáforo antes de cruzar.
2. Un **modelo de Ciclo Semafórico Continuo de 93 segundos** que determina de forma matemática y automática la fase de cruce (🟢 Verde, 🟡 Amarillo, 🔴 Rojo) de cada vehículo, liberando al aforador de la carga subjetiva de clasificar manualmente el estado de la luz.

---

## 🚦 Modelo de Ciclo Semafórico Continuo (93 Segundos)

El ciclo de la intersección corre de forma continua y matemática a partir de una única sincronización inicial en campo:

$$\text{Duración total del ciclo} = 93 \text{ segundos}$$

| Fase | Duración | Intervalo dentro del ciclo | Comportamiento |
| :--- | :---: | :---: | :--- |
| 🟢 **Verde** | 18 s | $0 \le t < 18 \text{ s}$ | Cruce habilitado (Respeta) |
| 🟡 **Amarillo** | 3 s | $18 \le t < 21 \text{ s}$ | Fase de cambio / despeje |
| 🔴 **Rojo** | 72 s | $21 \le t < 93 \text{ s}$ | Detención obligatoria (Infracción si cruza) |

### 1. Sincronización Colaborativa en Tiempo Real ($t_0$)
- Cualquier integrante del equipo presiona **`"🟢 Sincronizar en inicio de VERDE"`** en el instante exacto en que la luz real cambia a verde.
- El timestamp de referencia (`inicioCicloSemaforo = Date.now()`) se almacena en el documento de la sesión en Firestore y se propaga instantáneamente a todos los dispositivos conectados mediante listeners `onSnapshot`.
- Todos los aforadores ven el mismo segundero en vivo, la misma fase y la misma cuenta regresiva calculada localmente en su navegador cada 250 ms (sin sobrecargar lecturas en base de datos).

### 2. Cálculo Determinista de la Fase de Cruce
En el instante exacto en que se registra una salida vehicular ($t$):
$$\Delta t = t - t_0$$
$$\text{segundoEnCiclo} = (\Delta t / 1000) \pmod{93}$$
$$\text{numeroCiclo} = \left\lfloor \frac{\Delta t / 1000}{93} \right\rfloor + 1$$

El sistema asigna automáticamente:
- Si $0 \le \text{segundoEnCiclo} < 18$ $\to$ `faseCruce = 'verde'`
- Si $18 \le \text{segundoEnCiclo} < 21$ $\to$ `faseCruce = 'amarillo'`
- Si $21 \le \text{segundoEnCiclo} < 93$ $\to$ `faseCruce = 'rojo'`

### 3. Re-sincronización y Calibración en Campo
- Si la controladora física en calle sufre pequeñas variaciones temporales tras periodos prolongados, el sistema muestra un aviso discreto recomendando verificar la alineación después de 30 minutos.
- El botón **`"Re-sincronizar"`** permite reajustar $t_0$ con un modal de confirmación. Los eventos históricos previamente guardados conservan intactos sus datos originales.

---

## ⏱️ Modelo de Teoría de Colas (Cola + Servidor)

El flujo vehicular en cada carril o sentido se modela dividiendo el tiempo total de servicio en dos tramos independientes:

```text
[Llegada a la Fila]  ──(Tiempo en Cola Wq)──>  [Frente / Semáforo]  ──(Tiempo en Servidor Ws)──>  [Cruce Efectivo]
    horaEntradaCola                                horaLlegaServidor                                   horaSalida
```

### Los Tres Pasos del Conteo Vehicular:
1. **`1. Entra cola`**: Registra `horaEntradaCola` cuando el vehículo se detiene al final de la fila. Incrementa **`En cola ahora: N`**.
2. **`2. Al semáforo`**: Toma el vehículo más antiguo de la fila (**FIFO**), registra `horaLlegaServidor` y calcula el tiempo en fila:
   $$W_q = \text{tiempoEnColaSeg} = \text{horaLlegaServidor} - \text{horaEntradaCola}$$
   Mueve el vehículo al servidor, decrementa $N$ e incrementa **`En semáforo ahora: M`**.
3. **`3. Cruza vehículo` (Único botón)**:
   - **Habilitación estricta:** Solo se activa cuando hay vehículos al frente del semáforo ($M \ge 1$).
   - Toma el vehículo más antiguo en el servidor (FIFO) y registra `horaSalida`.
   - Calcula:
     $$W_s = \text{tiempoEnServidorSeg} = \text{horaSalida} - \text{horaLlegaServidor}$$
     $$W = \text{tiempoTotalSeg} = \text{horaSalida} - \text{horaEntradaCola} = W_q + W_s$$
   - Evalúa automáticamente `faseCruce` según el ciclo de 93 s.
   - Muestra retroalimentación visual inmediata (badge verde, amarillo o rojo).

### Cruce Directo en Flujo Libre (Sin Cola)
Para vehículos que cruzan la intersección sin detenerse en la fila ni en el semáforo, el botón **`"Registrar cruce directo (flujo libre)"`** permite registrar el evento con tiempos de espera en $0\text{ s}$, evaluando automáticamente la fase semafórica en el instante del clic.

---

## 🚗 Clasificación de Tránsito y Movimientos

### Categorías Vehiculares y Peatonales
- 🏍️ **Moto:** Motocicletas particulares, mototaxis y motos eléctricas (tipo Ofero).
- 🚗 **Carro:** Autos particulares y taxis.
- 🚙 **Camioneta:** SUV, camperos y camionetas utilitarias.
- 🚛 **Carga:** Camiones rígidos, furgones y tractocamiones.
- 🚌 **Buses:** Buses de servicio público urbano, microbuses y busetas.
- 🚶 **Peatón:** Transeúntes (Cruce por cebra, fuera de cebra o paso por andén).

### Giros y Maniobras Direccionales
Registrados de manera independiente y vinculados a las salidas acumuladas:
- ⬆️ **Recto**
- ⬅️ **Izquierda**
- ➡️ **Derecha**

---

## 👥 Colaboración y Trabajo en Equipo

- **Sesiones Compartidas (`sesionId`):** Una sesión por intersección y turno compartida por toda la brigada.
- **Roles Exclusivos:** Cada aforador elige qué vehículos contará. Los ya seleccionados por otro compañero aparecen bloqueados con su correo.
- **Pantalla Focalizada:** Cada usuario solo ve en su móvil las tarjetas que le corresponden.
- **Papelera de Reciclaje (Soft Delete):** Borrado suave con opción de restaurar o purgar sesiones y eventos eliminados por error.

---

## 🔒 Seguridad y Control de Acceso

- **Google Sign-In:** Autenticación institucional vía Firebase Auth.
- **Lista Blanca de la Universidad de La Guajira:**
  - `ijesusmartinez@uniguajira.edu.co`
  - `llouissierra@uniguajira.edu.co`
  - `jenriqueiguaran@uniguajira.edu.co`
  - `ljangulo@uniguajira.edu.co`
  - `conoriozarate@uniguajira.edu.co`
- **Reglas de Seguridad Firestore (`firestore.rules`):** Validación estricta en base de datos en cada lectura y escritura.

---

## 📊 Exportación y Compatibilidad VISSIM

Descarga en formatos **Excel (.xlsx)** y **CSV** con soporte UTF-8:
1. **Hoja 1 — Resumen VISSIM:** Volúmenes totales por categoría, cruces en Verde (cumplimiento), cruces en Amarillo, infracciones en Rojo, giros direccionales y tiempos promedios ($W_q, W_s, W$) listos para calibración en PTV Vissim.
2. **Hoja 2 — Eventos Detallados:** Registro fila a fila con ID de evento, hora exacta de llegada a cola, hora al semáforo, hora de cruce, fase semafórica calculada, segundo en ciclo (0 a 92s) y número de ciclo.

---

## 🛠️ Stack Tecnológico

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/)
- **Estilos:** [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Backend:** [Firebase Cloud Firestore](https://firebase.google.com/docs/firestore), [Firebase Auth](https://firebase.google.com/docs/auth), [Firebase Hosting](https://firebase.google.com/docs/hosting)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) con Service Workers offline
- **Exportación:** [SheetJS (xlsx)](https://docs.sheetjs.com/)
- **Calidad de Código:** [Oxlint](https://oxc.rs/docs/guide/usage/linter.html)

---

## 🚀 Instalación y Despliegue Local

### 1. Clonar el repositorio
```bash
git clone https://github.com/ivnmtz09/simulacion-conteo.git
cd simulacion-conteo
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno (`.env`)
```bash
cp .env.example .env
```
Configura tus credenciales de Firebase en `.env`:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 4. Servidor de desarrollo
```bash
npm run dev
```

### 5. Verificación de calidad y compilación
```bash
# Linter (Oxlint)
npm run lint

# Verificación de tipos TypeScript y Bundle de Producción
npm run build
```

---

## 👥 Equipo del Proyecto

Proyecto desarrollado para levantamiento de aforos y simulación de tránsito en Riohacha, La Guajira:
- **Jesús Martínez** (`ijesusmartinez@uniguajira.edu.co`)
- **Louis Sierra** (`llouissierra@uniguajira.edu.co`)
- **Enrique Iguarán** (`jenriqueiguaran@uniguajira.edu.co`)
- **Luis Angulo** (`ljangulo@uniguajira.edu.co`)
- **Conorio Zárate** (`conoriozarate@uniguajira.edu.co`)
