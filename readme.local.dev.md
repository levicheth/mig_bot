# Local Development

./node_modules/ngrok/bin/ngrok.exe http 5000

- check ngrok url
- update .env with ngrok url
- run bot

node index.js

#

docker build -t mig_bot .
docker run -p 5000:5000 -p 3000:3000 -p 3333:3333 mig_bot