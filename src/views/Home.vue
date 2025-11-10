<template>
  <div class="home-container">
    
    <!-- Estado de carga: muestra skeletons mientras se obtienen los datos -->
    <div v-if="isLoading" class="loading-container">
      <div class="skeleton hero"></div>
      <div class="kpi-grid">
        <div class="skeleton kpi-card"></div>
        <div class="skeleton kpi-card"></div>
        <div class="skeleton kpi-card"></div>
        <div class="skeleton kpi-card"></div>
      </div>
    </div>

    <!-- Estado de error: se muestra si falla la petición a la API -->
    <div v-else-if="error" class="error-container">
      <span class="error-icon">⚠️</span>
      <h3>No pudimos cargar tu dashboard</h3>
      <p>{{ error }}</p>
      <!-- Botón para reintentar la carga de datos -->
      <button @click="loadDashboardData" class="btn-retry">Intentar de nuevo</button>
    </div>

    <!-- Estado de éxito: muestra el contenido principal cuando kpis y profile están cargados -->
    <div v-else-if="kpis && profile">
      
      <!-- Sección hero: saludo personalizado y frase motivacional -->
      <main class="hero-section">
        <div class="hero-content">
          <div class="hero-text">
            <!-- Saludo dinámico según la hora del día -->
            <p class="greeting">{{ getGreeting() }}</p>
            <!-- Nombre del usuario obtenido del perfil -->
            <h1 class="hero-title">{{ profile.firstName || 'Atleta' }}</h1>
            <!-- Frase motivacional que rota diariamente -->
            <p class="hero-subtitle">{{ getMotivationalPhrase() }}</p>
          </div>
          <div class="hero-illustration">
            <!-- Ilustración decorativa del hero -->
            <img 
              src="../assets/illustrations/hombre_fitness.svg" 
              alt="Fitness illustration"
              class="hero-image"
            /> 
          </div>
        </div>
      </main>

      <section class="content-section">

        <!-- Caso 1: Usuario sin rutas creadas - onboarding inicial -->
        <div v-if="kpis.totalRoutesCreated === 0" class="welcome-card">
          <div class="welcome-icon"><img src="../assets/icons/cohete.svg" alt="Desafío" class="cohete-icon cohete-on"/></div>
          <h2>Tu aventura empieza aquí</h2>
          <p>Crea tu primera ruta y comienza a registrar cada paso de tu progreso. Es más fácil de lo que piensas.</p>
          <!-- CTA para crear la primera ruta -->
          <router-link to="/routes/new" class="cta-button primary">
            Crear mi primera ruta
          </router-link>
        </div>

        <!-- Caso 2: Usuario con rutas creadas - dashboard completo -->
        <div v-else class="dashboard-content">

          <!-- Grid de KPIs del día: 4 tarjetas con métricas principales -->
          <div class="kpi-grid">
            <!-- KPI 1: Número de rutas completadas hoy -->
            <KpiCard 
              :icon="RunningIcon" 
              :value="kpis.rutasCompletadas" 
              title="Rutas completadas"
              :subtitle="kpis.rutasCompletadas > 0 ? 'Has salido hoy. Bien hecho.' : 'Aún no has registrado ninguna ruta.'"
              color="#3B82F6"
            />
            <!-- KPI 2: Duración total de actividad en formato HH:MM:SS -->
            <KpiCard 
              :icon="ClockIcon"
              :value="formatDuration(kpis.duracionTotal)" 
              title="Duración total"
              subtitle="Tiempo total en actividad hoy."
              color="#8B5CF6"
            />
            <!-- KPI 3: Distancia recorrida en kilómetros -->
            <KpiCard 
              :icon="PosicionIcon" 
              :value="kpis.distanciaTotal" 
              title="Distancia total"
              subtitle="Distancia recorrida hoy."
              unit="km"
              :decimals="1"
              color="#10B981"
            />
            <!-- KPI 4: Calorías quemadas (requiere peso configurado) -->
            <KpiCard 
              :icon="RachaIcon" 
              :value="kpis.caloriasHoy" 
              title="Calorías de hoy"
              :subtitle="kpis.caloriasHoy > 0 ? 'Energía gastada estimada.' : 'Completa tu peso para calcularlo.'"
              unit="kcal"
              color="#F59E0B"
            />
          </div>

          <!-- Sección de racha: días consecutivos con actividad -->
          <div class="streak-section">
            <div class="streak-card" :class="{ 'active': kpis.rachaDiasActivos > 0 }">
              <!-- Icono cambia según si hay racha activa o no -->
              <div class="streak-flame">
                <img 
                  v-if="kpis.rachaDiasActivos === 0" 
                  src="../assets/icons/madera.svg"
                  alt="Sin racha"
                  class="flame-icon flame-off"
                />
                <img 
                  v-else 
                  src="../assets/icons/fuego.svg"
                  alt="Racha activa"
                  class="flame-icon flame-on"
                />
              </div>
              <div class="streak-content">
                <!-- Número de días de la racha -->
                <div class="streak-number">
                  <span class="number">{{ kpis.rachaDiasActivos }}</span>
                  <span class="label">{{ kpis.rachaDiasActivos === 1 ? 'día' : 'días' }}</span>
                </div>
                <!-- Mensaje motivacional según la duración de la racha -->
                <p class="streak-message">{{ getStreakMessage(kpis.rachaDiasActivos) }}</p>
              </div>
            </div>
          </div>
          
          <!-- CTA cuando el usuario tiene rutas creadas pero no ha completado ninguna hoy -->
          <div v-if="kpis.rutasCompletadas === 0" class="action-card">
            <div class="action-content">
              <h3>¿Listo para moverte?</h3>
              <p>Tienes {{ kpis.totalRoutesCreated }} {{ kpis.totalRoutesCreated === 1 ? 'ruta creada' : 'rutas creadas' }}. Elige una y empieza tu actividad.</p>
            </div>
            <!-- Botón para ir a la lista de rutas disponibles -->
            <router-link to="/routes" class="cta-button secondary">
              Ver mis rutas
            </router-link>
          </div>

        </div>

      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { getProfile } from '@/services/authService.js' // Servicio para obtener el perfil del usuario
import { getHomeKpis } from '@/services/homeService.js' // Servicio para obtener los KPIs del día
import KpiCard from '@/components/KpiCard.vue'

import ClockIcon from '../assets/icons/reloj.svg'
import RunningIcon from '../assets/icons/mujer.svg'
import RachaIcon from '../assets/icons/fuego.svg'
import PosicionIcon from '../assets/icons/marcador-de-posicion.svg'


// --- Estado reactivo ---
// Controla si se están cargando los datos
const isLoading = ref(true)
// Almacena mensajes de error si la petición falla
const error = ref(null)
// Datos del perfil del usuario (nombre, etc.)
const profile = ref(null)
// KPIs del día (rutas completadas, distancia, calorías, racha, etc.)
const kpis = ref(null)

/**
 * Función principal para cargar todos los datos del dashboard
 * Hace dos peticiones en paralelo: perfil del usuario y KPIs del día
 */
const loadDashboardData = async () => {
  isLoading.value = true
  error.value = null
  try {
    // Peticiones paralelas para optimizar el tiempo de carga
    const [profileData, kpisData] = await Promise.all([
      getProfile(), // GET /api/v1/auth/profile
      getHomeKpis() // GET /api/v1/home/kpis/today
    ])
    
    // Asigna los datos obtenidos a las variables reactivas
    profile.value = profileData
    kpis.value = kpisData
    
  } catch (err) {
    // Manejo de errores: captura el mensaje de la respuesta o usa un mensaje genérico
    console.error("Error cargando dashboard:", err)
    error.value = err.response?.data?.message || err.message || "No se pudieron cargar los datos."
  } finally {
    // Siempre desactiva el loading, haya éxito o error
    isLoading.value = false
  }
}

// Hook de ciclo de vida: carga los datos al montar el componente
onMounted(() => {
  loadDashboardData()
})

/**
 * Retorna un saludo contextual según la hora actual del día
 * @returns {string} - "Buenos días", "Buenas tardes" o "Buenas noches"
 */
const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return "Buenos días"
  if (hour < 19) return "Buenas tardes"
  return "Buenas noches"
}

/**
 * Retorna una frase motivacional que rota diariamente
 * Usa el día del mes como índice para rotar entre las frases
 * @returns {string} - Frase motivacional del día
 */
const getMotivationalPhrase = () => {
  const phrases = [
    "Cada kilómetro cuenta",
    "Tu progreso de hoy",
    "Sigue en movimiento",
    "Un día más, un paso más",
    "El camino lo haces tú"
  ]
  // Usa el día del mes (1-31) para seleccionar una frase de manera determinista
  const index = new Date().getDate() % phrases.length
  return phrases[index]
}

/**
 * Formatea una duración en segundos al formato HH:MM:SS
 * @param {number} totalSeconds - Duración total en segundos
 * @returns {string} - Duración formateada (ej: "01:23:45")
 */
const formatDuration = (totalSeconds) => {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  // Helper para añadir un 0 delante si el número es menor a 10
  const pad = (num) => String(num).padStart(2, '0')
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
}

/**
 * Retorna un mensaje motivacional personalizado según la racha de días activos
 * @param {number} racha - Número de días consecutivos con actividad
 * @returns {string} - Mensaje motivacional correspondiente
 */
const getStreakMessage = (racha) => {
  if (racha === 0) return "Empieza hoy tu primera ruta"
  if (racha === 1) return "¡Primer día! Sigue así mañana"
  if (racha <= 3) return "Vas construyendo un buen hábito"
  if (racha <= 6) return "Llevas una semana increíble"
  if (racha <= 13) return "Dos semanas de constancia. Impresionante"
  if (racha <= 29) return "Un mes de dedicación. Eres imparable"
  return "Racha legendaria. Sigue así"
}
</script>

<style scoped>
/* Tu nuevo CSS (copiado 1:1) */
.home-container {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 70px);
}

/* --- Hero estilo HubSpot --- */
.hero-section {
  background: linear-gradient(135deg, #00bfb3 0%, #0091ae 100%);
  padding: 80px 24px;
  color: #ffffff;
  position: relative;
  overflow: hidden;
}

.hero-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-image: 
    radial-gradient(circle at 20% 50%, rgba(255,255,255,0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.08) 0%, transparent 50%);
  pointer-events: none;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.hero-text {
  flex: 1;
}

.greeting {
  font-size: 15px;
  font-weight: 600;
  opacity: 0.9;
  margin: 0 0 12px 0;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.hero-title {
  font-size: 52px;
  font-weight: 800;
  margin: 0 0 16px 0;
  letter-spacing: -1px;
  line-height: 1.1;
}

.hero-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin: 0;
  font-weight: 400;
  line-height: 1.6;
}

.hero-illustration {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 160px;
  animation: float 3s ease-in-out infinite;
  opacity: 0.9;
}

@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* --- Content Section --- */
.content-section {
  flex: 1;
  background: #f9fafb;
  padding: 32px 20px 48px;
}

.dashboard-content {
  max-width: 1200px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* --- KPI Grid más espaciado --- */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
}

/* --- Racha rediseñada --- */
.streak-section {
  margin: 8px 0;
}

.streak-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 24px;
  border: 2px solid #e5e7eb;
  transition: all 0.3s ease;
}

.streak-card.active {
  border-color: #f59e0b;
  background: linear-gradient(135deg, #fff9f0 0%, #ffffff 100%);
}

.streak-flame {
  font-size: 56px;
  line-height: 1;
  filter: drop-shadow(0 4px 8px rgba(0,0,0,0.1));
}

.flame-on {
  animation: flicker 2s infinite;
}

@keyframes flicker {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.05); opacity: 0.9; }
}

.streak-content {
  flex: 1;
}

.streak-number {
  display: flex;
  align-items: baseline;
  gap: 8px;
  margin-bottom: 4px;
}

.streak-number .number {
  font-size: 36px;
  font-weight: 700;
  color: #111827;
  line-height: 1;
}

.streak-number .label {
  font-size: 18px;
  font-weight: 500;
  color: #6b7280;
}

.streak-message {
  margin: 0;
  color: #4b5563;
  font-size: 15px;
  line-height: 1.5;
}

/* --- Welcome Card (sin rutas) --- */
.welcome-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 56px 40px;
  text-align: center;
  border: 2px solid #e5e7eb;
  max-width: 580px;
  margin: 0 auto;
}

.welcome-icon {
  font-size: 64px;
  margin-bottom: 20px;
  animation: bounce 2s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-8px); }
}

.welcome-card h2 {
  font-size: 28px;
  margin: 0 0 12px 0;
  color: #111827;
  font-weight: 700;
}

.welcome-card p {
  color: #6b7280;
  margin: 0 0 28px 0;
  line-height: 1.6;
  font-size: 16px;
}

/* --- Action Card (CTA cuando no hay actividad hoy) --- */
.action-card {
  background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
  border-radius: 16px;
  padding: 28px 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  border: 2px solid #bae6fd;
}

.action-content h3 {
  margin: 0 0 6px 0;
  font-size: 20px;
  color: #111827;
  font-weight: 600;
}

.action-content p {
  margin: 0;
  color: #475569;
  font-size: 15px;
}

/* --- Botones CTA mejorados --- */
.cta-button {
  text-decoration: none;
  color: #ffffff;
  background: #111827;
  padding: 14px 28px;
  border-radius: 10px;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-block;
  border: none;
  font-size: 15px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.12);
}

.cta-button:hover {
  background: #1f2937;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.18);
}

.cta-button.secondary {
  background: #3b82f6;
  white-space: nowrap;
}

.cta-button.secondary:hover {
  background: #2563eb;
}

/* --- Loading & Error --- */
.loading-container {
  padding: 32px 20px;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
}

.skeleton {
  background: linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%);
  background-size: 200% 100%;
  border-radius: 12px;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}

.skeleton.hero {
  height: 240px; /* Ajustado al nuevo hero */
  margin-bottom: 32px;
}

.skeleton.kpi-card {
  height: 140px;
}

.error-container {
  padding: 60px 20px;
  text-align: center;
  max-width: 480px;
  margin: 0 auto;
}

.error-icon {
  font-size: 56px;
  display: block;
  margin-bottom: 16px;
}

.error-container h3 {
  color: #dc2626;
  margin: 0 0 8px 0;
  font-size: 22px;
}

.error-container p {
  color: #6b7280;
  margin: 0 0 24px 0;
}

.btn-retry {
  background: #111827;
  color: #fff;
  border: none;
  padding: 12px 24px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 600;
  font-size: 15px;
  transition: all 0.2s ease;
}

.btn-retry:hover {
  background: #1f2937;
  transform: translateY(-1px);
}

/* --- Responsive --- */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr; /* Stack en móvil */
    gap: 24px;
    text-align: center;
  }
  .hero-illustration {
    font-size: 120px;
    order: -1; /* Pone la ilustración arriba en móvil */
  }
  .hero-title {
    font-size: 34px;
  }
  
  .kpi-grid {
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
  
  .streak-card {
    padding: 24px;
    gap: 16px;
    flex-direction: column; /* Stack racha en móvil */
    text-align: center;
  }
  
  .streak-flame {
    font-size: 48px;
  }
  .streak-number {
    justify-content: center;
  }
  
  .action-card {
    flex-direction: column;
    text-align: center;
    padding: 24px;
  }
  
  .welcome-card {
    padding: 40px 24px;
  }
}
</style>