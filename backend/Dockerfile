FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8080

# Honor Cloud Run's $PORT; single worker keeps memory within the 1Gi limit
# (2 workers each loading yfinance/grpc/openai/reportlab risked OOM → restarts).
# Cloud Run scales via instances (maxScale), not in-container workers.
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8080} --workers 1"]
