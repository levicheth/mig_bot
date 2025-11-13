# Local Development

- start Pythong FastAPI server

uvicorn api_server:app --reload --host 0.0.0.0 --port 3000 

./node_modules/ngrok/bin/ngrok.exe http 5000

- check ngrok url
- update .env with ngrok url
- run bot

node index.js

#

docker build -t mig_bot .
docker run -p 5000:5000 -p 3000:3000 -p 3333:3333 mig_bot