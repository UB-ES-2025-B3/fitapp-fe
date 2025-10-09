import { createRouter, createWebHistory } from 'vue-router';

const Login = () => import('../views/Login.vue');
const Register = () => import('../views/Register.vue');
const Home = () => import('../views/Home.vue');
const OnboardingProfile = () => import('../views/OnboardingProfile.vue');

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login' },
    { path: '/login', component: Login },
    { path: '/register', component: Register },
    { path: '/home', component: Home },
    { path: '/onboarding/profile', component: OnboardingProfile },
    { path: '/:pathMatch(.*)*', component: { template: '<main style="padding:16px">404</main>' } },
  ],
});

export default router;