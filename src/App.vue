<template>
  <div id="app">
    <!-- Navbar: se muestra en todas las páginas -->
    <nav class="navbar" v-if="showNavbar">
      <div class="nav-container">
        <!-- Logo/Nombre de la app -->
        <router-link to="/" class="logo"> <img src="../public/logo_principal.webp"/></router-link>

        <!-- Links de navegación -->
        <div class="nav-links">
          <!-- Si NO está logueado -->
          <template v-if="!isAuthenticated">
            <router-link to="/" class="nav-link">
              Inicio
            </router-link>
            <router-link to="/login" class="nav-link">
              Iniciar Sesión
            </router-link>
            <router-link to="/register" class="nav-link btn-primary">
              Registrarse
            </router-link>
          </template>

          <!-- Si está logueado -->
          <template v-else>
            <router-link to="/dashboard" class="nav-link">
              Dashboard
            </router-link>
            <button @click="logout" class="nav-link btn-logout">
              Cerrar Sesión
            </button>
          </template>
        </div>
      </div>
    </nav>

    <!-- Contenido principal: aquí se renderiza cada vista -->
    <main class="main-content">
      <router-view />
    </main>

    <!-- Footer: se muestra en todas las páginas -->
    <footer class="footer" v-if="showFooter">
      <p>&copy; 2025 FitApp. Todos los derechos reservados.</p>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// Estado de autenticación (simulado)
// En producción, esto vendría de un store (Pinia/Vuex)
const isAuthenticated = ref(false)

// Control de navegación y footer
// Ocultar navbar/footer en ciertas páginas
const showNavbar = computed(() => {
  // Puedes ocultar la navbar en páginas específicas
  return true
})

const showFooter = computed(() => {
  // Puedes ocultar el footer en páginas específicas
  const hideFooterRoutes = ['/dashboard']
  return !hideFooterRoutes.includes(route.path)
})

// Cerrar sesión
const logout = () => {
  isAuthenticated.value = false
  localStorage.removeItem('token') // Limpiar token
  router.push('/login')
}

// Simular login exitoso (llamar desde LoginView)
// En producción, esto se manejaría con un store global
window.loginSuccess = () => {
  isAuthenticated.value = true
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