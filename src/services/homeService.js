import api from "./api";

/**
 * Simula la obtención de los KPIs del día para el dashboard.
 * * - Devuelve datos de éxito por defecto.
 * - Comenta/descomenta los otros "return" para probar los estados vacíos.
 * * Cuando el backend esté listo, reemplazar esto por:
  */
export const getHomeKpis = async () => {
  const response = await api.get("/api/v1/home/kpis/today");
  return response.data;
};

