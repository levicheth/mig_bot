from dotenv import load_dotenv
from bot.webex_bot import app

# Load environment variables
load_dotenv()

if __name__ == '__main__':
    print("Starting Webex Teams Bot...")
    app.run(host='0.0.0.0', port=5000)