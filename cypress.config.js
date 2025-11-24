import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    baseUrl: "http://localhost:5173",
    setupNodeEvents() {},
    video: false,
    chromeWebSecurity: false,
    defaultCommandTimeout: 10000, // <-- aumentar a 10s (default es 4s)
    requestTimeout: 10000,
  },
});