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
.confirm-modal-backdrop { position:fixed; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.35); }
.confirm-modal { background:#fff; border-radius:10px; padding:16px; width:320px; box-shadow:0 8px 30px rgba(0,0,0,0.2); }
.confirm-actions { display:flex; justify-content:flex-end; gap:8px; margin-top:12px }
.confirm-body { padding:6px 0 }
.btn.ghost { background:transparent; border:1px solid #e6e6e6; color:#333 }
.btn.danger { background:#c53030 }
</style>
