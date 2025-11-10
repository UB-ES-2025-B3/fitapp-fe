# .

This template should help get you started developing with Vue 3 in Vite.

## Recommended IDE Setup

[VS Code](https://code.visualstudio.com/) + [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar) (and disable Vetur).

## Recommended Browser Setup

- Chromium-based browsers (Chrome, Edge, Brave, etc.):
  - [Vue.js devtools](https://chromewebstore.google.com/detail/vuejs-devtools/nhdogjmejiglipccpnnnanhbledajbpd) 
  - [Turn on Custom Object Formatter in Chrome DevTools](http://bit.ly/object-formatters)
- Firefox:
  - [Vue.js devtools](https://addons.mozilla.org/en-US/firefox/addon/vue-js-devtools/)
  - [Turn on Custom Object Formatter in Firefox DevTools](https://fxdx.dev/firefox-devtools-custom-object-formatters/)

## Customize configuration

See [Vite Configuration Reference](https://vite.dev/config/).

## Project Setup

```sh
npm install
```

### Compile and Hot-Reload for Development

```sh
npm run dev
```

### Compile and Minify for Production

```sh
npm run build
```

### Lint with [ESLint](https://eslint.org/)

```sh
npm run lint
```


## Tests (rápido)

Comandos básicos:

1. Instala dependencias:

```powershell
npm install
```

2. Ejecuta todas las pruebas:

```powershell
npm run test
```

3. Modo watch (desarrollo):

```powershell
npm run test -- --watch
```

Dónde están los tests: `tests/unit/`

Notas rápidas: las pruebas usan Vitest y `@vue/test-utils`. Los tests del proyecto mockean servicios con `vi.mock()` para no depender del backend.

Ejecutar pruebas individuales

- Ejecutar un fichero de tests concreto (una pasada):

```powershell
# usando el script de package.json
npm run test -- tests/unit/RoutesNew.spec.js


- Ejecutar un test concreto por nombre (grep/filtrado):

```powershell
# buscar por nombre de test (título exacto o patrón)
npm run test -- tests/unit/RoutesNew.spec.js -t "Validación - nombre requerido"




Variables de entorno útiles
- `VITE_USE_MOCKS=true` — convención usada si quieres activar un mock local en `src/services` (si lo implementas).
- `VITE_GOOGLE_MAPS_API_KEY=<tu_key>` — para que `RoutesNew.vue` cargue Google Maps en vez del fallback SVG. No subas esta clave al repo; usa `.env.local` y restringe por host en Google Cloud.
- Para simular errores 4xx/5xx o latencias, MSW es muy conveniente (`ctx.status(500)`, `ctx.delay(1200)`).

### Construir y ejecutar el front
Para pruebas en local, construimos el front en el puerto 8082 y lo conectamos a la API del puerto 8080:

```sh
docker build --build-arg VITE_API_URL=http://localhost:8080 -t fitapp-frontend-local .
```

```sh
docker run -p 8082:80 --rm fitapp-frontend-local    
```

