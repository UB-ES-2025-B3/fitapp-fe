import { createRouter, createWebHistory } from 'vue-router';
import RegisterView from '../views/Register.vue'
import LoginView from '../views/Login.vue'
import HomeView from '../views/Home.vue'


// Creamos la ruta para el registro de usuarios.
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
  }
]


const router = createRouter({
  history: createWebHistory(),
  routes
})




export default router;