# FitApp Frontend (Vue 3 + Vite)


Este repositorio contiene el código fuente del frontend de FitApp, desarrollado con Vue 3 y Vite. Incluye una suite completa de pruebas automatizadas (Unitarias y E2E) y configuración para despliegue en contenedores.


---


## 🛠️ Configuración del Entorno (IDE)


Se recomienda usar **[VS Code](https://code.visualstudio.com/)** con la extensión **[Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar)**.
> **Nota:** Deshabilita Vetur si lo tienes instalado para evitar conflictos.


### Configuración del Navegador
Para depurar la aplicación y el estado reactivo:
- **Chromium (Chrome, Edge, Brave):** Instala [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd).
- **Firefox:** Instala [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/).
- **Configuración extra:** Habilita [Custom Object Formatter](http://bit.ly/object-formatters) en las DevTools del navegador.


---


## Instalación y Ejecución


### 1. Instalar dependencias
```sh
npm install
```


### 2. Ejecutar en desarrollo (Hot-Reload)
```sh
npm run dev
```
### 3. Compilar para Producción
```sh
npm run build
```
### 4. Análisis Estático (Linting)


Se utiliza ESLint con "Flat Config" para mantener la calidad del código y evitar errores de sintaxis.
```sh
npm run lint
```


## Testing y QA


### 1. Unit Tests (Vitest)
- Ejecutar todos los tests:
```sh
npm run test:unit
```


- Modo Watch (Desarrollo):
```sh
npm run test:unit -- --watch
```


- Ejecutar un fichero concreto:
```sh
npm run test:unit -- tests/unit/RoutesNew.spec.js
```


- Filtrar por nombre del test:
```sh
npm run test:unit -- -t "Validación - nombre requerido"
```


### 2. End-to-End Tests (Cypress)
Validan el flujo crítico del usuario ("Happy Path") simulando un navegador real.


- Flujo cubierto: Registro → Onboarding (Edición) → Dashboard → Crear Ruta.
- Modo Headless (Ideal para CI/CD):


```sh
npm run test:e2e
```


- Modo Interfaz Gráfica (Debugging):
```sh
npx cypress open
```


## Variables de Entorno


Consulta Vite Configuration Reference para más detalles.


VITE_API_URL: URL del backend (por defecto /api/v1).


VITE_USE_MOCKS: true para activar mocks locales en servicios.


VITE_MAPBOX_ACCESS_TOKEN: Token para cargar mapas de Mapbox GL.


VITE_GOOGLE_MAPS_API_KEY: (Opcional) Para cargar Google Maps.


Nota: No subas claves reales al repositorio; usa .env.local.


## 🐳 Docker
Para pruebas locales simulando producción (Nginx), construye el contenedor y conéctalo a tu API local (puerto 8080).


Construir imagen:
```sh
docker build --build-arg VITE_API_URL=http://localhost:8080 -t fitapp-frontend-local .
```


Correr contenedor (Puerto 8082):
```sh
docker run -p 8082:80 --rm fitapp-frontend-local
```




## 🔄 Pipeline CI/CD (Recomendación)
Para asegurar la calidad en el pipeline de despliegue, se recomienda este orden de ejecución:


- npm install
- npm run lint (Bloqueante)
- npm run test:unit (Bloqueante)
- npm run test:e2e (Validación de integración)
- npm run build