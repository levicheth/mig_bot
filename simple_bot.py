from webexteamssdk import WebexTeamsAPI
import os
from dotenv import load_dotenv
import time
from datetime import datetime, timedelta

# Load environment variables
load_dotenv()

# Initialize Webex Teams API client
api = WebexTeamsAPI(access_token=os.getenv('WEBEX_ACCESS_TOKEN'))

print("Starting Webex Teams Bot...")

try:
    # Get bot identity
    me = api.people.me()
    print(f"Bot {me.displayName} is running...")

    # Track last message check time
    last_check_time = datetime.utcnow() - timedelta(minutes=1)

    # Main loop
    while True:
        try:
            current_time = datetime.utcnow()

            # Get messages from direct messaging spaces only
            direct_messages = list(api.messages.list(
                max=10,
                personId=me.id  # This gets messages sent directly to the bot
            ))

            # Process messages
            for msg in direct_messages:
                # Skip bot's own messages
                if msg.personEmail == me.emails[0]:
                    continue

                # Convert message time to datetime
                msg_time = msg.created

                # Only process messages newer than our last check
                if msg_time <= last_check_time:
                    continue

                print(f"\nReceived message from {msg.personEmail}")
                print(f"Message text: {msg.text}")

                # Echo back
                try:
                    response = api.messages.create(
                        toPersonEmail=msg.personEmail,  # Reply directly to the sender
                        text=f"Echo: {msg.text}"
                    )
                    print(f"Successfully sent echo response to {msg.personEmail}")
                except Exception as e:
                    print(f"Failed to send message: {str(e)}")

            # Update last check time
            last_check_time = current_time

            # Rate limiting protection
            time.sleep(2)

        except Exception as e:
            print(f"Error in message loop: {str(e)}")
            time.sleep(5)  # Wait longer on error
            continue

except Exception as e:
    print(f"Failed to start bot: {str(e)}")