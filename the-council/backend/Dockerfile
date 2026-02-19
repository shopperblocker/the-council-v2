FROM python:3.12-slim

WORKDIR /app

# Build context is repo root (Railway uses repo root with dockerfilePath)
COPY the-council/backend/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY the-council/backend/ .

ENV PORT=8000
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
