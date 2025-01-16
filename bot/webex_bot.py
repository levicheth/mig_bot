from webexteamssdk import WebexTeamsAPI
from flask import Flask, request, jsonify
import pandas as pd
from io import StringIO
from bot.config import WEBEX_ACCESS_TOKEN, WEBEX_WEBHOOK_SECRET, PORT, HOST

# Initialize Flask app and Webex Teams API client
app = Flask(__name__)
api = WebexTeamsAPI(access_token=WEBEX_ACCESS_TOKEN)

def process_csv(csv_data):
    """
    Process CSV data (stub implementation - just returns the data as is)
    """
    try:
        df = pd.read_csv(StringIO(csv_data))
        return df.to_string()
    except Exception as e:
        return f"Error processing CSV: {str(e)}"

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming webhooks from Webex Teams"""
    if not request.json:
        return jsonify({'error': 'no JSON data'}), 400

    # Extract the message details
    data = request.json

    # Verify this is a message event
    if data.get('resource') != 'messages' or data.get('event') != 'created':
        return jsonify({'status': 'ignored'}), 200

    try:
        # Get the message details
        message = api.messages.get(data['data']['id'])

        # Don't process messages from the bot itself
        me = api.people.me()
        if message.personEmail == me.emails[0]:
            return jsonify({'status': 'ignored self message'}), 200

        response_text = f"Echo: {message.text}"

        # Check for file attachments (CSV)
        if message.files:
            for file_url in message.files:
                # Download and process the file
                file_content = api.messages.get_attachment(file_url)
                csv_text = file_content.decode('utf-8')
                processed_result = process_csv(csv_text)
                response_text = f"Processed CSV:\n{processed_result}"

        # Send response
        api.messages.create(
            roomId=message.roomId,
            text=response_text
        )

        return jsonify({'status': 'success'}), 200

    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    print(f"Starting Webex Teams Bot on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT, debug=True)