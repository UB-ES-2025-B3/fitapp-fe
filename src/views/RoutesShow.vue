<template>
  <main>
    <div class="page-container">
      <section class="card">
        <header class="card-header">
          <h1>Ver ruta</h1>
          <p class="muted">Vista de detalle (pendiente de implementación)</p>
        </header>

        <div class="card-body">
          <p>Detalle de la ruta (implementar GET /api/v1/routes/:id)</p>
          <router-link class="btn" :to="{ name: 'RoutesList' }">Volver al listado</router-link>
        </div>
      </section>
    </div>
  </main>
</template>

<script setup>
defineOptions({ name: 'RoutesShow' })
</script>

<style scoped>
.page-container { padding: 28px 20px; display:flex; justify-content:center; }
.card { width:100%; max-width:760px; background:#fff; border-radius:12px; padding:18px; border:1px solid #eee; box-shadow:0 8px 30px rgba(12,12,12,0.05);}
.muted { color:#666; margin-top:6px }
.btn { padding:10px 14px; border-radius:10px; background:#000; color:#fff; border:none; cursor:pointer; text-decoration:none }
</style>
