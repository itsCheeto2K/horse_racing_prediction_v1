FROM python:3.11-slim

# Install g++ and build essentials for C++ engine compilation
RUN apt-get update && apt-get install -y --no-install-recommends \
    g++ \
    make \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy C++ engine sources and compile for Linux
COPY cpp_engine/ /app/cpp_engine/
RUN g++ -std=c++17 -O3 /app/cpp_engine/src/*.cpp -I/app/cpp_engine/include -o /app/cpp_engine/horse_predictor \
    && chmod +x /app/cpp_engine/horse_predictor

# Copy Python backend and install requirements
COPY backend/ /app/backend/
RUN pip install --no-cache-dir -r /app/backend/requirements.txt

WORKDIR /app/backend

ENV PORT=8000
EXPOSE 8000

# Start FastAPI server using PORT environment variable (compatible with Render, Koyeb, Railway, HuggingFace)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
