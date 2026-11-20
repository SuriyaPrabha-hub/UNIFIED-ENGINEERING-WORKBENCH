# ==============================================================
# MULTI-STAGE DOCKERFILE FOR UNIFIED ENGINEERING WORKBENCH (UEW)
# Optimized for Render Cloud Web Service Deployment
# ==============================================================

# --------------------------------------------------------------
# Stage 1: Build the React / Three.js Frontend
# --------------------------------------------------------------
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install --legacy-peer-deps

COPY frontend/ ./
RUN npm run build

# --------------------------------------------------------------
# Stage 2: Build the High-Performance C++17 REST Core
# --------------------------------------------------------------
FROM ubuntu:22.04 AS backend-builder
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    build-essential \
    cmake \
    g++ \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY CMakeLists.txt ./
COPY backend/ ./backend/

RUN mkdir -p build && cd build && \
    cmake -DCMAKE_BUILD_TYPE=Release .. && \
    make -j$(nproc) workbench_server

# --------------------------------------------------------------
# Stage 3: Lightweight Production Runtime Container
# --------------------------------------------------------------
FROM ubuntu:22.04 AS runner
ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update && apt-get install -y \
    ca-certificates \
    libstdc++6 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy compiled backend binary from Stage 2
COPY --from=backend-builder /app/build/workbench_server /app/workbench_server

# Copy prebuilt frontend assets from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist /app/frontend/dist

# Copy sample datasets for CAD STL & ANSYS simulation
COPY data /app/data

# Default environment configuration
ENV PORT=8080
EXPOSE 8080

# Run the workbench server
CMD ["/app/workbench_server"]
