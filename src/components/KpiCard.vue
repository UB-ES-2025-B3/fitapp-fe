<template>
  <div class="kpi-card-v2">
    <!-- Encabezado: icono coloreado + valor principal -->
    <div class="card-header">
      <!-- Icono: puede ser emoji (string sin '/'), ruta de imagen (string con '/'), o componente SVG (object) -->
      <div class="card-icon" :style="{ backgroundColor: color }">
        <!-- Si 'icon' es un string que parece una ruta (contiene '/'), se muestra como imagen -->
        <img v-if="typeof icon === 'string' && icon.includes('/')" :src="icon" class="icon-svg" alt="icon" />
        <!-- Si 'icon' es un string simple (emoji), se muestra directamente -->
        <template v-else-if="typeof icon === 'string'">
          {{ icon }}
        </template>
        <!-- Si 'icon' es un objeto/componente (SVG importado como componente), se renderiza -->
        <component v-else :is="icon" class="icon-svg" />
      </div>
      <!-- Valor principal formateado con su unidad opcional (ej: "5.2 km", "340 kcal") -->
      <span class="value">{{ formattedValue }} {{ unit }}</span>
    </div>
    
    <!-- Contenido: título descriptivo + subtexto contextual -->
    <div class="card-content">
      <!-- Título del KPI (ej: "Distancia total", "Calorías de hoy") -->
      <span class="title">{{ title }}</span>
      <!-- Texto secundario que da contexto o feedback al usuario -->
      <span class="subtitle">{{ subtitle }}</span>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

/**
 * Props del componente KpiCard
 * Este componente es reutilizable para mostrar métricas clave (KPIs)
 * en el dashboard con formato consistente
 */
const props = defineProps({
  // Icono del KPI: puede ser emoji (String), ruta de imagen (String con '/'), o componente SVG (Object)
  // Ejemplo emoji: icon="🏃"
  // Ejemplo ruta: :icon="clockIconUrl" (URL del SVG)
  // Ejemplo componente: :icon="ClockIcon" (componente SVG importado)
  icon: [String, Object],
  
  // Valor del KPI: puede ser un número (ej: 5.2, 340) o string (ej: "01:23:45")
  value: [String, Number],
  
  // Título descriptivo del KPI (ej: "Rutas completadas")
  title: String,
  
  // Texto secundario que proporciona contexto adicional
  subtitle: String, 
  
  // Color de fondo del icono (hex, ej: "#3B82F6")
  color: String,   
  
  // Unidad de medida opcional (ej: "km", "kcal")
  unit: {
    type: String,
    default: ''
  },
  
  // Número de decimales para valores numéricos (0 por defecto)
  decimals: {
    type: Number,
    default: 0
  }
})

/**
 * Formatea el valor del KPI según su tipo
 * - String: se devuelve tal cual (útil para duraciones formateadas como "01:23:45")
 * - Number: se redondea a los decimales especificados (útil para distancias como 5.2 km)
 * - Otros: devuelve '0' como fallback
 */
const formattedValue = computed(() => {
  // Si el valor ya es un string (ej: duración formateada), no lo tocamos
  if (typeof props.value === 'string') {
    return props.value
  }
  // Si es un número, aplicamos el formato con decimales
  if (typeof props.value === 'number') {
    return props.value.toFixed(props.decimals)
  }
  // Fallback en caso de valor inválido
  return '0'
})
</script>

<style scoped>
/* Tarjeta principal del KPI */
.kpi-card-v2 {
  background: #ffffff;
  border-radius: 14px;
  padding: 20px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 2px 8px rgba(0,0,0,0.03);
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: all 0.2s ease;
}

/* Efecto hover: eleva la tarjeta para dar feedback visual */
.kpi-card-v2:hover {
  transform: translateY(-4px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.07);
  border-color: #d1d5db;
}

/* Header: contiene icono y valor principal */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

/* Contenedor del emoji/icono con fondo de color */
.card-icon {
  font-size: 24px;
  border-radius: 10px;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
}

/* Estilos para SVGs e imágenes dentro del icono */
.icon-svg {
  width: 24px;
  height: 24px;
  color: inherit; /* Hereda el color blanco del contenedor */
  filter: brightness(0) invert(1); /* Fuerza el SVG a blanco */
}

/* Valor principal del KPI (número grande) */
.value {
  font-size: 32px;
  font-weight: 700;
  color: #111827;
  line-height: 1.1;
  text-align: right;
}

/* Contenedor del título y subtítulo */
.card-content {
  display: flex;
  flex-direction: column;
}

/* Título descriptivo del KPI */
.title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 4px;
}

/* Texto secundario con contexto adicional */
.subtitle {
  font-size: 13px;
  color: #6b7280;
  line-height: 1.5;
  min-height: 38px; /* Evita que las tarjetas salten de tamaño si el texto varía */
}
</style>