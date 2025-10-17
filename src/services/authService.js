import api from "./api";


// Registrar usuario
// El objeto userData debe tener las mismas claves que espera nuestra API (email y password).
export const registerUser = async (userData) => {
  const response = await api.post("/api/v1/auth/register", userData);
  return response.data;
};

// Login del usuario
export const loginUser = async (credentials) => {
  const response = await api.post("/api/v1/auth/login", credentials);

  // Guardamos el token en localStorage
  if (response.data.token) {
    localStorage.setItem("token", response.data.token);
  }

  return response.data;
};
