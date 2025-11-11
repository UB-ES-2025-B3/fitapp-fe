# --- ETAPA 1: BUILD (Compilación de Vue/Vite) ---
# Usar node:22-alpine
FROM node:22-alpine AS builder

# Define los argumentos de build para la URL de la API y el token de Mapbox
ARG VITE_API_URL
ARG VITE_MAPBOX_ACCESS_TOKEN

WORKDIR /app

# Copia los package.json y package-lock.json
COPY package.json package-lock.json* ./

# Instala dependencias
RUN npm install

# Copia el resto del código fuente
COPY . .

# Construye la aplicación (Build)
# Inyecta AMBOS ARGs como variables de entorno ANTES de construir
RUN VITE_API_URL=${VITE_API_URL} \
   VITE_MAPBOX_ACCESS_TOKEN=${VITE_MAPBOX_ACCESS_TOKEN} \
   npm run build

# --- ETAPA 2: SERVE (Servidor Nginx) ---
FROM nginx:stable-alpine

# Copia la configuración personalizada de Nginx para createWebHistory
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copia los archivos estáticos construidos
COPY --from=builder /app/dist /usr/share/nginx/html

# Expone el puerto 80 (puerto estándar de Nginx)
EXPOSE 80

# Comando de inicio
CMD ["nginx", "-g", "daemon off;"]