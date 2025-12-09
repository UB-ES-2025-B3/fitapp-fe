import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    video: false,
    
    // --- ESTABILIDAD PARA CI/CD ---
    
    // 1. Tamaño de pantalla HD (Evita que el mapa se vea pequeño o cambie el layout)
    viewportWidth: 1280,
    viewportHeight: 720,

    // 2. Seguridad (Necesario para algunos iframes o mapas externos)
    chromeWebSecurity: false,

    // 3. Tiempos de espera extendidos (El CI es más lento que tu PC)
    defaultCommandTimeout: 10000, // Espera hasta 10s a que aparezcan elementos
    requestTimeout: 10000,        // Espera hasta 10s a respuestas del backend
    responseTimeout: 10000,
    pageLoadTimeout: 30000,

    // 4. REINTENTOS AUTOMÁTICOS (El arma secreta contra el "Flakiness")
    // Si un test falla en el CI (runMode), Cypress lo reintentará 2 veces más
    // antes de marcarlo como fallido. Esto salva tests que fallan por 1ms de lag.
    retries: {
      runMode: 2, 
      openMode: 0,
    },
  },
});