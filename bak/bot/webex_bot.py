from webexteamssdk import WebexTeamsAPI
from flask import Flask, request, jsonify
from io import StringIO
from bot.config import WEBEX_ACCESS_TOKEN, WEBEX_WEBHOOK_SECRET, PORT, HOST
from bot.cnc7_bom_builder import process_quote
from bot.input_processor import parse_message_to_csv, format_error_message

# Initialize Flask app and Webex Teams API client
app = Flask(__name__)
api = WebexTeamsAPI(access_token=WEBEX_ACCESS_TOKEN)

@app.route('/webhook', methods=['POST'])
def webhook():
    """Handle incoming webhooks from Webex Teams"""
    if not request.json:
        return jsonify({'error': 'no JSON data'}), 400

    try:
        # Get message details
        data = request.json
        if data.get('resource') != 'messages' or data.get('event') != 'created':
            return jsonify({'status': 'ignored'}), 200

        message = api.messages.get(data['data']['id'])
        
        # Don't process bot's own messages
        me = api.people.me()
        if message.personEmail == me.emails[0]:
            return jsonify({'status': 'ignored self message'}), 200

        try:
            # Parse input
            processed_input = parse_message_to_csv(message.text)
            
            # Process through BOM builder
            output_csv = process_quote(processed_input.csv_content)
            
            # Send response
            api.messages.create(
                roomId=message.roomId,
                text=f"```\n{output_csv}\n```",
                markdown=f"```csv\n{output_csv}\n```"
            )
            
        except Exception as e:
            # Send error message
            error_msg = format_error_message(e)
            api.messages.create(
                roomId=message.roomId,
                text=error_msg
            )

        return jsonify({'status': 'success'}), 200

    except Exception as e:
        print(f"Error processing webhook: {str(e)}")
        return jsonify({'error': str(e)}), 500

def main():
    """Main entry point for the bot"""
    print(f"Starting Webex Teams Bot on {HOST}:{PORT}")
    app.run(host=HOST, port=PORT)

if __name__ == '__main__':
    main()