import axios from 'axios';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const GEMINI_MODEL = 'gemini-1.5-flash';

const url = `${GEMINI_API_BASE}/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

async function test() {
  try {
    console.log('Sending request to Gemini API...');
    const response = await axios.post(url, {
      contents: [{ role: 'user', parts: [{ text: 'Hello' }] }]
    }, {
      headers: { 'Content-Type': 'application/json' }
    });
    console.log('Success:', response.data);
  } catch (err) {
    if (err.response) {
      console.error(`Error ${err.response.status}:`, err.response.data);
    } else {
      console.error('Network Error:', err.message);
    }
  }
}

test();
