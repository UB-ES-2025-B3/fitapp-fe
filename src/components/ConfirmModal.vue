<template>
  <div v-if="visible" class="confirm-modal-backdrop">
    <div class="confirm-modal">
      <div class="confirm-body">
        <slot>{{ message }}</slot>
      </div>
      <div class="confirm-actions">
        <button class="btn ghost" @click="$emit('cancel')">Cancelar</button>
        <button class="btn danger" @click="$emit('confirm')">Confirmar</button>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  visible: { type: Boolean, default: false },
  message: { type: String, default: '¿Confirmar?' }
})
</script>

<style scoped>
.confirm-modal-backdrop { 
  position: fixed; 
  inset: 0; 
  display: flex; 
  align-items: center; 
  justify-content: center; 
  background: rgba(0,0,0,0.35); 
  z-index: 2000; /* Asegura que esté por encima de todo */
}

.confirm-modal { 
  background: #fff; 
  border-radius: 10px; 
  padding: 16px; 
  width: 100%;
  max-width: 360px; /* Un poco más de ancho */
  box-shadow: 0 8px 30px rgba(0,0,0,0.2); 
  /* Animación de entrada */
  transform: scale(0.95);
  opacity: 0;
  animation: zoomIn 0.2s ease forwards;
}

.confirm-actions { 
  display: flex; 
  justify-content: flex-end; 
  gap: 8px; 
  margin-top: 12px 
}

.confirm-body { 
  padding: 6px 0;
  font-size: 15px; /* Tamaño de fuente legible */
  line-height: 1.6;
}

.btn {
  /* Estilos base copiados de RoutesList.vue */
  padding: 10px 14px;
  border-radius: 10px;
  background: #000;
  color: #fff;
  border: none;
  cursor: pointer;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  
  /* Mejoras adicionales */
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn:disabled { 
  opacity: 0.6; 
  cursor: not-allowed 
}

/* Modificador Ghost (ya lo tenías) */
.btn.ghost { 
  background: transparent; 
  border: 1px solid #e6e6e6; 
  color: #333 
}

.btn.ghost:hover {
  background: #f9f9f9;
}

/* Modificador Danger */
.btn.danger { 
  background: #c53030;
  color: #fff; /* Aseguramos texto blanco */
}

.btn.danger:hover {
  background: #a02424;
}

/* Animaciones */
@keyframes zoomIn {
  to {
    transform: scale(1);
    opacity: 1;
  }
}

/* Animación de fade para el fondo (opcional) */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
