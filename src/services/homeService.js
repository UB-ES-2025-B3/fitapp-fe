import api from "./api";

/**
 * Simula la obtención de los KPIs del día para el dashboard.
 * * - Devuelve datos de éxito por defecto.
 * - Comenta/descomenta los otros "return" para probar los estados vacíos.
 * * Cuando el backend esté listo, reemplazar esto por:
 * * export const getHomeKpis = async () => {
 * const response = await api.get("/api/v1/home/kpis/today");
 * return response.data;
 * };
 */
export const getHomeKpis = () => {
  console.log("MOCK: Solicitando KPIs del día...");

  return new Promise((resolve) => {
    setTimeout(() => {
      
      // -----------------------------------------------------------------
      // Escenario 1: Éxito (Datos de hoy + rutas ya creadas)
      // -----------------------------------------------------------------
      
      resolve({
        rutasCompletadas: 2,
        duracionTotal: 45 * 60, // 45 minutos (en segundos)
        distanciaTotal: 5.2, // en km
        caloriasHoy: 340,
        rachaDiasActivos: 3,
        totalRoutesCreated: 5, // Flag para diferenciar de "nunca ha creado rutas"
      });

      // -----------------------------------------------------------------
      // Escenario 2: Estado vacío (Sin rutas HOY, pero SÍ tiene rutas creadas)
      // Descomenta para probar
      // -----------------------------------------------------------------
      /*
      resolve({
        rutasCompletadas: 0,
        duracionTotal: 0,
        distanciaTotal: 0,
        caloriasHoy: 0,
        rachaDiasActivos: 0,
        totalRoutesCreated: 5, // > 0
      });
      */

      // -----------------------------------------------------------------
      // Escenario 3: Estado vacío (NUNCA ha creado una ruta)
      // Descomenta para probar
      // -----------------------------------------------------------------
      /*
      resolve({
        rutasCompletadas: 0,
        duracionTotal: 0,
        distanciaTotal: 0,
        caloriasHoy: 0,
        rachaDiasActivos: 0,
        totalRoutesCreated: 0, // = 0
      });
      */

    }, 1200); // Simular 1.2s de carga
  });
};