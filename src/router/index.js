// Router principal de la app: define rutas y protecciones de acceso (auth + onboarding)
import { createRouter, createWebHistory } from 'vue-router';

// Vistas (carga estática)
import RegisterView from '../views/Register.vue'
import LoginView from '../views/Login.vue'
import HomeView from '../views/Home.vue'
import OnboardingProfile from '@/views/OnboardingProfile.vue';
import Profile from '@/views/Profile.vue';

// Store de sesión (Pinia)
import { useSessionStore } from "@/stores/session.js";

// Nota: OnboardingProfile se carga de forma "lazy" más abajo vía import dinámico.

// ========================
// Definición de rutas
// ========================

const routes = [
  {
    path: '/register',
    name: 'register',
    component: RegisterView
  },
  {
    path: '/login',
    name: 'login',
    component: LoginView
  },
  {
    path: '/',
    name: 'home',
    component: HomeView
  },
  {
    path: '/onboarding/profile',
    name: 'OnboardingProfile',
    component: () => import('@/views/OnboardingProfile.vue'),
    meta: { hideNav: true, hideFooter: true },
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  }
]

// ========================
// Creación del router
// ========================
const router = createRouter({
  history: createWebHistory(),
  routes
})


// ========================
// Guard global de navegación
// ========================
// Lógica de acceso centralizada en un único beforeEach.
// Depende de 2 flags del store:
//  - token: usuario autenticado
//  - profileExists: si el usuario ya completó su perfil (onboarding)

router.beforeEach((to, from, next) => {
  const session = useSessionStore();

  const isAuth = !!session.token;
  const profileComplete = !!session.profileExists;

  // 1) Usuario NO autenticado:
  //    - Sólo puede ir a login y register.
  if (!isAuth && to.name !== "login" && to.name !== "register") {
    next({ name: "login" });
    return;
  }

  // 2) Usuario autenticado intenta ir a login/register:
  //    - Si perfil completo -> redirigir al home.
  //    - Si NO completo -> llevar a OnboardingProfile.
  if (isAuth && (to.name === "login" || to.name === "register")) {
    if (profileComplete) {
      next({ name: "home" });
    } else {
      next({ name: "OnboardingProfile" });
    }
    return;
  }

  // 3) Usuario autenticado SIN perfil completo:
  //    - Forzar onboarding excepto si ya navega al onboarding.
  if (isAuth && !profileComplete && to.name !== "OnboardingProfile") {
    next({ name: "OnboardingProfile" });
    return;
  }

  // 4) Usuario autenticado CON perfil completo:
  //    - Si intenta volver al onboarding -> enviarlo al home.
  if (isAuth && profileComplete && to.name === "OnboardingProfile") {
    next({ name: "home" });
    return;
  }

  next(); // continuar normalmente
});




export default router;