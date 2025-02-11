const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = 'https://chat-ai.cisco.com/openai/deployments/gpt-4o-mini/chat/completions';
const DEFAULT_MODEL = 'gpt-4o-mini';
const SYSTEM_MESSAGE = `You are BridgeAI, an assistant that helps convert various input formats into structured CSV data.
Your role is to analyze input text and extract relevant information into a clean, organized CSV format.

Always maintain data accuracy and provide consistent output structure.

(1) Here are details about the input text:

a. user provided image, that was parsed by Tesseract OCR and raw text (aka, IN01) was produced by OCR, where you are looking for these elements:
- Part Number
- Quantity
- Duration (Months)
- Other details (that are not needed for now)

b. your tasks is to generate output CSV file
- NB; raw text is always EN, might be a bit corrupted
- take Input Data from prev step, and 
- look at expected output format (OUT01)
- there might be first row with headers, and next rows with data
- if no headers, or headers are unclear, use your judgement to create headers

c. populate output CSV file
- Part Number must be always present; typically first column; always contains hyphen symbol
- Quantity is always a number, range 1-1000000, if you detect at least one number above 120, this column is quantity, otherwise it's duration; it's always present
- Duration is always an integer number, range 1-120, duration column always has fewer unique values than quantity column; might be missing
if duration is missing, or duration is not a number, put duration as -1
- return ONLY CSV file in OUT01 format, NOTHING ELSE!
- rearrange columns to match OUT01 format, so that Part Number is first column, Quantity is second column, Duration is third column

d. Here is expected CSV output format (aka, OUT01):
Part Number,Quantity,Duration
N540-FC-RENEW,1,47
SD-SVS-FC-IOSXR,1,47
ESS-AC-10G-SIA-3,1000,47
ADV-AC-10G-SIA-3,1000,47
`;

async function getAuthToken() {
  try {
    const client_id = process.env.CLIENT_ID;
    const client_secret = process.env.CLIENT_SECRET;
    
    const credentials = Buffer.from(`${client_id}:${client_secret}`).toString('base64');
    
    const response = await axios.post(
      'https://id.cisco.com/oauth2/default/v1/token',
      'grant_type=client_credentials',
      {
        headers: {
          'Accept': '*/*',
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${credentials}`
        }
      }
    );

    console.log('Auth response:', response.data);
    return response.data.access_token;
  } catch (error) {
    console.error('Auth token error:', error.message);
    if (error.response) {
      console.error('Response error details:', error.response.data);
    }
    throw error;
  }
}

// OpenAI request configuration
const requestConfig = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};

async function Normalize2CSVwAI(userMessage, model = DEFAULT_MODEL) {
  try {
    // Get auth token
    const accessToken = await getAuthToken();
    console.log('Got access token for Bridge AI');

    if (!process.env.APP_KEY) {
      throw new Error('APP_KEY is not configured in .env file');
    }

    const url = API_URL;
    console.log('Request URL:', url);

    const requestBody = {
      messages: [
        { role: 'system', content: SYSTEM_MESSAGE },
        { role: 'user', content: userMessage }
      ],
      user: JSON.stringify({ appkey: process.env.APP_KEY }),
      stop: ["<|im_end|>"]
    };

    console.log('Sending request to Bridge AI...');

    const response = await axios.post(url, requestBody, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'api-key': accessToken
      }
    });

    const responseContent = response.data?.choices?.[0]?.message?.content?.trim();
    
    if (!responseContent) {
      throw new Error('Invalid response format from Bridge AI');
    }

    console.log('Received response from Bridge AI', { 
      responseLength: responseContent.length,
      preview: responseContent.substring(0, 100) 
    });

    return responseContent;

  } catch (error) {
    console.error('Error calling Bridge AI:', error.message);
    if (error.response) {
      console.error('Response error details:', {
        status: error.response.status,
        data: error.response.data,
        headers: error.response.headers,
        url: error.response.config.url
      });
    }
    throw new Error(`Bridge AI error: ${error.message}`);
  }
}

module.exports = {
  Normalize2CSVwAI
}; 



// Test the functionality when run directly
if (require.main === module) {
  console.log('Testing BridgeAI...');
  console.log('Environment check:');
  console.log('- CLIENT_ID present:', !!process.env.CLIENT_ID);
  console.log('- CLIENT_SECRET present:', !!process.env.CLIENT_SECRET);
  console.log('- APP_KEY present:', !!process.env.APP_KEY);
  
  const testMessage = `
Part Number: ESS-ED-100G-SIAST
Quantity: Not specified
Duration: Unknown
  `;

  Normalize2CSVwAI(testMessage)
    .then(response => {
      console.log('\nTest Response:');
      console.log('-------------------');
      console.log(response);
      console.log('-------------------');
    })
    .catch(error => {
      console.error('\nTest Error:', error.message);
    });
} 
