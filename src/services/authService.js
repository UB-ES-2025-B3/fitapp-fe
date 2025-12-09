
// Servicio de autenticación y perfil: usa la instancia de Axios con baseURL e interceptores.
import api from "./api";


// ============================
// AUTH
// ============================
// Registro de usuario
// userData debe contener lo que nuestra API espera ({ email, password })
export const registerUser = async (userData) => {
  const response = await api.post("/api/v1/auth/register", userData);
  return response.data;
};

// Login de usuario
// Las credentials serán { email, password }. La API debe devolver un token JWT.
export const loginUser = async (credentials) => {
  const response = await api.post("/api/v1/auth/login", credentials);

  // Guardar token en localStorage para que el interceptor lo añada automáticamente.
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
  }

  return response.data;
};


// ============================
// PROFILE (requiere Authorization)
// ============================

// Obtener perfil del usuario autenticado
export async function getProfile() {
  try {
    const res = await api.get("/api/v1/profiles/me");
    return res.data;
  } catch (err) {
    // Propaga el error con el status para manejarlo en el componente (e.g., 404)
    err.status = err.response?.status;
    throw err;
  }
}


// Crear perfil del usuario autenticado
// payload: { firstName, lastName, birthDate, heightCm, weightKg }
export async function createProfile(payload) {
  const res = await api.post("/api/v1/profiles/me", payload);
  return res.data;
}

// Actualizar perfil del usuario autenticado
export async function updateProfile(payload) {
  const res = await api.put("/api/v1/profiles/me", payload);
  return res.data;
}



// Cambiar contraseña
export async function updatePassword(currentPassword, newPassword, confirmPassword) {
  const response = await api.post('/api/v1/auth/change-password', {
    currentPassword,
    newPassword,
    confirmPassword
  })
  return response.data
}