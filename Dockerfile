# ── Stage 1: Build React frontend ──────────────────────────────
FROM node:20-alpine AS frontend-builder
WORKDIR /frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Empty string = same origin (no hardcoded backend URL needed)
ENV VITE_API_URL=""
RUN npm run build

# ── Stage 2: Python FastAPI + static frontend ──────────────────
FROM python:3.11-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/ .

# Drop built frontend into static/ — FastAPI will serve it
COPY --from=frontend-builder /frontend/dist ./static

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
