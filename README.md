# Simulador y Aforo de Tráfico Vial (PTV Vissim) 🚦🚗🏍️

> **Progressive Web App (PWA)** de alta precisión para levantamiento de aforos vehiculares y peatonales en campo, análisis de comportamiento semafórico y calibración de tiempos de espera basada en **Teoría de Colas** para modelos de micro-simulación en **PTV Vissim**.

---

## 📋 Descripción General

Esta plataforma permite a brigadas de aforadores registrar de forma colaborativa, en tiempo real y offline-resiliente, el flujo vehicular y peatonal en intersecciones semaforizadas.

A diferencia de los contadores tradicionales de pulso, la aplicación implementa un **modelo formal de Teoría de Colas (Fila + Servidor)** que permite medir con exactitud de microsegundos el tiempo que un vehículo pasa esperando en la fila antes de alcanzar el frente y el tiempo adicional que tarda en el semáforo antes de cruzar.

---

## ⏱️ Modelo de Teoría de Colas (Cola + Servidor)

El flujo modela la interacción en la intersección dividiendo el tiempo total de servicio en dos tramos independientes:

```
[Llegada a la Fila]  ──(Tiempo en Cola Wq)──>  [Frente / Semáforo]  ──(Tiempo en Servidor Ws)──>  [Cruce Efectivo]
    horaEntradaCola                                horaLlegaServidor                                   horaSalida
```

### 1. Los Tres Momentos del Sistema:
1. **Entra a la cola:** Registra la marca de tiempo exacta (`horaEntradaCola`) en que el vehículo llega al final de la fila. Incrementa el contador visible **`En cola ahora: N`**.
2. **Llega al semáforo / servidor:** Toma el vehículo más antiguo de la fila (disciplina **FIFO**), registra `horaLlegaServidor`, calcula el tiempo en fila:
   $$\text{tiempoEnColaSeg} = \text{horaLlegaServidor} - \text{horaEntradaCola}$$
   Mueve el vehículo al semáforo, decrementa $N$ e incrementa **`En semáforo ahora: M`**.
3. **Cruza en verde (respeta) / Cruza en rojo (se vuela):** Toma el vehículo al frente del semáforo (FIFO), registra `horaSalida` y calcula:
   $$\text{tiempoEnServidorSeg} = \text{horaSalida} - \text{horaLlegaServidor}$$
   $$\text{tiempoTotalSeg} = \text{horaSalida} - \text{horaEntradaCola} = \text{tiempoEnColaSeg} + \text{tiempoEnServidorSeg}$$
   Decrementa $M$ y actualiza las métricas por comportamiento.

### 2. Manejo Flexible para Flujo Libre y Casos en Campo:
- **Flujo normal ($M > 0$):** El cruce descuenta de los vehículos esperando en semáforo y calcula los tiempos reales de ambos tramos.
- **Flujo libre ($M = 0$ y $N = 0$):** Si un vehículo cruza la intersección sin detenerse, el botón permite el registro inmediato con los tres tiempos en $0\text{ s}$.
- **Cruce directo desde cola ($M = 0$ y $N > 0$):** Si un vehículo cruza sin que el aforador haya presionado el paso intermedio, el sistema no bloquea la acción: toma el vehículo de la fila, asigna $\text{tiempoEnServidorSeg} = 0\text{ s}$ y muestra una advertencia visual breve sin interrumpir la toma de datos.

---

## 🚗 Clasificación de Tránsito y Comportamiento

### Categorías de Vehículos (Fijas)
- 🏍️ **Moto:** Incluye motocicletas particulares, mototaxis y motos eléctricas (tipo Ofero).
- 🚗 **Carro:** Autos particulares y taxis.
- 🚙 **Camioneta:** SUV, camionetas utilitarias y camperos.
- 🚛 **Carga:** Camiones rígidos, tractocamiones y furgones.
- 🚌 **Buses:** Buses urbanos, microbuses y colectivos.
- 🚶 **Peatón:** Transeúntes y usuarios no motorizados.

### Movimientos y Giros Direccionales
Vinculados a las salidas registradas para no sobre-contar giros:
- ⬆️ **Recto**
- ⬅️ **Izquierda**
- ➡️ **Derecha**

### Comportamiento Peatonal (Sin cola)
- 🦓 **Cruza por cebra** (Seguro)
- ⚠️ **Cruza fuera de cebra** (Imprudente)
- 🚶 **Pasa por andén / acera**

---

## 👥 Sesiones Colaborativas en Tiempo Real

Para evitar que varios integrantes del equipo cuenten accidentalmente el mismo tipo de vehículo o dispersen los datos:
- **Sesión Compartida (`sesionId`):** Una sesión creada para una fecha, intersección y acceso agrupa todos los eventos del equipo.
- **Lista en Vivo de Sesiones:** En la pantalla principal se observan las sesiones activas con actualización en tiempo real (`onSnapshot`).
- **Asignación Exclusiva de Roles:** Al unirse, cada aforador selecciona qué categorías contará. Las categorías ya tomadas por otro compañero se muestran bloqueadas (`"Ya lo cuenta: [usuario]"`).
- **Interfaz Focalizada:** Cada aforador solo visualiza en pantalla los bloques de conteo que tiene asignados, optimizando la ergonomía en dispositivos móviles.
- **Finalización Formal:** Botón dedicado para cerrar la sesión con confirmación, marcándola como cerrada en Firestore y limpiando el estado local sin arrastrar contadores anteriores.

---

## 🔒 Control de Acceso y Seguridad

- **Google Sign-In:** Autenticación mediante ventana emergente de Google.
- **Lista Blanca Institucional:** Acceso estrictamente restringido a 5 correos institucionales de la Universidad de La Guajira:
  - `ijesusmartinez@uniguajira.edu.co`
  - `llouissierra@uniguajira.edu.co`
  - `jenriqueiguaran@uniguajira.edu.co`
  - `ljangulo@uniguajira.edu.co`
  - `conoriozarate@uniguajira.edu.co`
- **Defensa en Profundidad (`firestore.rules`):** Reglas de seguridad a nivel de base de datos que validan la pertenencia al equipo en cada operación de lectura y escritura.

---

## 📊 Bitácora CRUD y Exportación VISSIM

- **Auditoría en Vivo:** Tabla interactiva para consultar eventos en tiempo real, filtrar por categoría o buscar por aforador.
- **Edición Dinámica:** Permite corregir los 3 timestamps (`Hora Entrada`, `Hora Semáforo`, `Hora Salida`) recalculando automáticamente los tiempos de cola, servidor y total.
- **Eliminación y Deshacer:** Si se comete un error, el botón "Deshacer" o la eliminación en tabla recalibra las colas en tiempo real.
- **Exportación en Excel (.xlsx) y CSV:**
  1. **Hoja de Detalle:** Registro evento a evento con todos los timestamps y clasificaciones.
  2. **Hoja de Resumen VISSIM:** Métricas agregadas de volúmenes, porcentajes de cumplimiento semafórico, giros y tiempos promedio ($W_q, W_s, W$) formateadas para parametrización en PTV Vissim.

---

## 🛠️ Stack Tecnológico

- **Frontend:** [React 19](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Vite](https://vite.dev/)
- **Estilos y UI:** [Tailwind CSS v4](https://tailwindcss.com/), [Lucide React](https://lucide.dev/)
- **Backend / BaaS:** [Firebase](https://firebase.google.com/) (Cloud Firestore, Firebase Authentication, Firebase Hosting)
- **Exportación:** [SheetJS (xlsx)](https://docs.sheetjs.com/)
- **PWA:** [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) con soporte de Service Workers y modo sin conexión.
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

### 3. Configurar variables de entorno
Copia la plantilla `.env.example` a un archivo `.env` en la raíz del proyecto y agrega las credenciales de tu proyecto Firebase:
```bash
cp .env.example .env
```

Contenido requerido en `.env`:
```env
VITE_FIREBASE_API_KEY=tu_api_key
VITE_FIREBASE_AUTH_DOMAIN=tu_proyecto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=tu_project_id
VITE_FIREBASE_STORAGE_BUCKET=tu_proyecto.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=tu_messaging_sender_id
VITE_FIREBASE_APP_ID=tu_app_id
```

### 4. Ejecutar en entorno de desarrollo
```bash
npm run dev
```

### 5. Compilar para producción y verificación
```bash
# Validar linter
npm run lint

# Compilar proyecto TypeScript y bundle Vite PWA
npm run build
```

---

## 📄 Reglas de Firestore

Despliega las reglas de seguridad configuradas en `firestore.rules`:
```bash
firebase deploy --only firestore:rules
```

---

## 👥 Equipo del Proyecto

Proyecto desarrollado para levantamiento de datos viales y simulación de tránsito en Riohacha, La Guajira:
- **Jesús Martínez** (`ijesusmartinez@uniguajira.edu.co`)
- **Louis Sierra** (`llouissierra@uniguajira.edu.co`)
- **Enrique Iguarán** (`jenriqueiguaran@uniguajira.edu.co`)
- **Luis Angulo** (`ljangulo@uniguajira.edu.co`)
- **Conorio Zárate** (`conoriozarate@uniguajira.edu.co`)
