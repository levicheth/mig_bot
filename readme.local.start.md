
# Ngrok setup (Linux)

snap install ngrok
ngrok config add-authtoken 6khfyWNT9fD74r3LF4piT_7j2u3jbCVF2XAcFJNDiB7
ngrok http 35000

- find & copy forwarding URI
- paste Forwarding URI into .env for ngrok

# Docker 
docker-compose up -d