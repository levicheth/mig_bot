// implement bridge AI integration, 
// take text as input, return structured data CSV as output. 
// use GPT 4o-mini


/*
const { Configuration, OpenAIApi } = require("openai");

const configuration = new Configuration({
  apiKey: process.env.BRIDGEAI_API_KEY,
});

const openai = new OpenAIApi(configuration);
*/

const axios = require('axios');
require('dotenv').config();

// Configuration
const API_URL = 'https://api.openai.com/v1/chat/completions';
const API_KEY = process.env.OPENAI_API_KEY;
const DEFAULT_MODEL = 'gpt-4o-mini';

// Messages
const SYSTEM_MESSAGE = `You are BridgeAI, an assistant that helps convert various input formats into structured CSV data.
Your role is to analyze input text and extract relevant information into a clean, organized CSV format.
Always maintain data accuracy and provide consistent output structure.

(1) Here are details about the input text:

a. user provided image, that was parsed by Tesseract OCR and raw text (aka, IN01) was produced by OCR, that should contain at least these elements:
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
- from IN01 only take data needed to populate OUT01 - Part Number, Quantity, Initial Term(Months)
- if no quantity, or quantity is not a number, put quantity as -1
- if no duration, or duration is not a number, put duration as -1
- return ONLY CSV file in OUT01 format, NOTHING ELSE!

d. Here is expected CSV output format (aka, OUT01):
Part Number,Quantity,Duration
N540-FC-RENEW,1,47
SD-SVS-FC-IOSXR,1,47
ESS-AC-10G-SIA-3,1000,47
ADV-AC-10G-SIA-3,1000,47
`;

// OpenAI request configuration
const requestConfig = {
  temperature: 0.7,
  max_tokens: 2000,
  top_p: 1,
  frequency_penalty: 0,
  presence_penalty: 0
};

// API key validation
if (!API_KEY) {
  console.warn('OpenAI API key is missing');
}

async function Normalize2CSVwAI(userMessage, model = DEFAULT_MODEL) {
  if (!API_KEY) {
    console.error('OpenAI API key is not configured');
    throw new Error('OpenAI API key is not configured. Please check your .env file.');
  }

  const messages = [
    { role: 'system', content: SYSTEM_MESSAGE },
    { role: 'user', content: userMessage }
  ];

  try {
    console.log('Sending request to OpenAI...', { model, messageLength: userMessage.length });
    
    const response = await axios.post(
      API_URL,
      {
        model,
        messages,
        ...requestConfig
      },
      {
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      }
    );

    const responseContent = response.data?.choices?.[0]?.message?.content?.trim();
    
    if (!responseContent) {
      throw new Error('Invalid response format from OpenAI');
    }

    console.log('Received response from OpenAI', { 
      responseLength: responseContent.length,
      preview: responseContent.substring(0, 100) 
    });

    return responseContent;

  } catch (error) {
    console.error('Error calling OpenAI:', error.message);
    throw new Error(`OpenAI API error: ${error.message}`);
  }
}

module.exports = {
  Normalize2CSVwAI
}; 




/*// Test the functionality when run directly
if (require.main === module) {
  console.log('Testing BridgeAI...');
  console.log('API Key present:', !!API_KEY);
  
  const testMessage = `
    Part Number: N540-FC-RENEW
    Quantity: 1
    Duration: 47 months
  `;

  sendMessage(testMessage)
    .then(response => {
      console.log('\nTest Response:', response);
    })
    .catch(error => {
      console.error('\nTest Error:', error.message);
    });
} 
*/