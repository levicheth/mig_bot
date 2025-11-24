# Use a base that includes both Node and Python
FROM python:3.10-slim

# Install Node.js manually
RUN apt-get update && apt-get install -y curl gnupg \
  && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
  && apt-get install -y nodejs \
  && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Install Node.js dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy source code
COPY . .

# Environment & ports
ENV PORT=35000
EXPOSE 35000
EXPOSE 33000
EXPOSE 33333
CMD ["npx", "concurrently", "node index.js", "node api_server.js", "uvicorn api_server:app --host 0.0.0.0 --port 3333"]