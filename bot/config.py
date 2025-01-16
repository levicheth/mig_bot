import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Bot configuration
WEBEX_ACCESS_TOKEN = os.getenv('WEBEX_ACCESS_TOKEN')
WEBEX_WEBHOOK_SECRET = os.getenv('WEBEX_WEBHOOK_SECRET')

# Server configuration
PORT = int(os.getenv('PORT', '5000'))
HOST = '0.0.0.0'

# Validate required configuration
if not WEBEX_ACCESS_TOKEN:
    raise ValueError("WEBEX_ACCESS_TOKEN environment variable is required")
