<template>
  <div id="app">
    <!-- NAVBAR -->
    <header v-if="!hideNav" class="navbar">
      <div class="nav-container">
        <router-link to="/" class="logo">
          <img src="/logo_secundario.webp" alt="logo" />
          FitApp
        </router-link>

        <nav class="nav-links">
          <router-link class="nav-link" to="/" exact>Inicio</router-link>

          <template v-if="isAuthenticated">

            <template v-if="session.profileExists">

              <router-link
              class="nav-link"
              :to="{ name: 'RoutesList' }" 
              >Rutas</router-link>
              <router-link
              class="nav-link"
              to="/profile"
              >Mi Perfil</router-link>
            </template>

            <router-link
            v-else
            class="nav-link"
            to="/onboarding/profile"
            >Completar perfil</router-link>

            <button class="nav-link btn-logout" @click="logout">Cerrar sesión</button>
          </template>

          <template v-else>
            <router-link class="nav-link" to="/login">Iniciar sesión</router-link>
            <router-link class="nav-link btn-primary" to="/register">Crear cuenta</router-link>
          </template>
        </nav>
      </div>
    </header>

    <!-- MAIN -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- FOOTER -->
    <footer v-if="!hideFooter" class="footer">
      <p>© {{ new Date().getFullYear() }} FitApp — Todos los derechos reservados.</p>
    </footer>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useSessionStore } from '@/stores/session.js'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()

const isAuthenticated = computed(() => !!session.token)
const hideNav = computed(() => route.matched.some(r => r.meta?.hideNav))
const hideFooter = computed(() => route.matched.some(r => r.meta?.hideFooter))

const logout = () => {
  session.clearSession()
  router.push({ name: 'login' })
}
</script>

<style scoped>
/* Reset básico */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
  background: #ffffff;
}

/* NAVBAR */
.navbar {
  background: #ffffff;
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
  background: rgba(255, 255, 255, 0.95);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo {
  font-size: 24px;
  font-weight: 700;
  color: #000000;
  text-decoration: none;
  display: flex;
  align-items: center;
  gap: 8px;
  letter-spacing: -0.5px;

}

.logo img {
    /* Mantenemos el tamaño deseado */
    width: 75px;
    height: 75px;
    /* Esto asegura que la imagen no cree espacio extra,
       lo cual a veces pasa con las imágenes inline */
    display: block;
}

.nav-links {
  display: flex;
  gap: 8px;
  align-items: center;
}

.nav-link {
  text-decoration: none;
  color: #666666;
  font-weight: 500;
  padding: 10px 20px;
  border-radius: 8px;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
  font-size: 15px;
  letter-spacing: -0.2px;
}

.nav-link:hover {
  color: #000000;
  background: #f5f5f5;
}

/* Link activo (página actual) */
.nav-link.router-link-active {
  color: #000000;
  background: #f0f0f0;
}

.btn-primary {
  background: #000000;
  color: #ffffff !important;
  border: 1px solid #000000;
}

.btn-primary:hover {
  background: #333333;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-logout {
  background: #000000;
  color: #ffffff !important;
  border: 1px solid #000000;
}

.btn-logout:hover {
  background: #333333;
}

/* CONTENIDO PRINCIPAL */
.main-content {
  flex: 1;
  /* El contenido crece para empujar el footer abajo */
}

/* FOOTER */
.footer {
  background: #000000;
  color: #ffffff;
  text-align: center;
  padding: 24px;
  margin-top: auto;
  border-top: 1px solid #e5e5e5;
}

.footer p {
  margin: 0;
  font-size: 14px;
  color: #999999;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .nav-container {
    flex-direction: column;
    gap: 16px;
  }

  .nav-links {
    width: 100%;
    justify-content: center;
    flex-wrap: wrap;
  }

  .logo {
    font-size: 20px;
  }
}
</style>
