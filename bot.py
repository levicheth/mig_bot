from webexteamssdk import WebexTeamsAPI
import os
from dotenv import load_dotenv
import time

# Load environment variables
load_dotenv()

if not os.getenv('WEBEX_ACCESS_TOKEN'):
    raise ValueError("WEBEX_ACCESS_TOKEN environment variable is required")

# Initialize Webex Teams API client
api = WebexTeamsAPI(access_token=os.getenv('WEBEX_ACCESS_TOKEN'))

def main():
    try:
        # Get our bot's details
        me = api.people.me()
        print(f"Bot {me.displayName} is ready to echo messages")

        # Get all rooms where our bot is in
        rooms = list(api.rooms.list())
        print(f"Bot is in {len(rooms)} rooms")

        while True:
            try:
                # Get messages from all rooms
                for room in rooms:
                    messages = list(api.messages.list(roomId=room.id, max=1))

                    for msg in messages:
                        # Don't respond to our own messages
                        if msg.personEmail == me.emails[0]:
                            continue

                        print(f"Received message from {msg.personEmail}: {msg.text}")

                        # Echo the message back
                        api.messages.create(
                            roomId=room.id,
                            text=f"Echo: {msg.text}"
                        )
                        print(f"Sent echo response")

                # Sleep to prevent hitting rate limits
                time.sleep(1)

            except Exception as e:
                print(f"Error in message loop: {str(e)}")
                time.sleep(5)  # Wait a bit longer on error
                continue

    except Exception as e:
        print(f"Fatal error: {str(e)}")
        raise

if __name__ == "__main__":
    print("Starting Webex Teams Bot...")
    main()