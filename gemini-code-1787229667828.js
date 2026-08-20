// Select DOM elements
const apiKeyInput = document.getElementById('apiKeyInput');
const promptInput = document.getElementById('promptInput');
const sendBtn = document.getElementById('sendBtn');
const outputBox = document.getElementById('outputBox');

// Load saved key from localStorage automatically on startup
const savedKey = localStorage.getItem('JARVIS_GEMINI_KEY');
if (savedKey) {
  apiKeyInput.value = savedKey;
}

// Attach event listener to the button
sendBtn.addEventListener('click', generateResponse);

async function generateResponse() {
  const apiKey = apiKeyInput.value.trim();
  const promptText = promptInput.value.trim();

  if (!apiKey) {
    alert('Please enter a valid Gemini API Key.');
    return;
  }
  if (!promptText) {
    alert('Please enter a prompt.');
    return;
  }

  // Save key to browser's local storage for future visits
  localStorage.setItem('JARVIS_GEMINI_KEY', apiKey);

  outputBox.innerText = 'Thinking...';

  // Gemini 2.5 Flash API endpoint
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      outputBox.innerText = `Error: ${data.error.message}`;
      return;
    }

    // Extract generated text
    const resultText = data.candidates[0].content.parts[0].text;
    outputBox.innerText = resultText;

    // Trigger Text-to-Speech
    speakText(resultText);

  } catch (error) {
    outputBox.innerText = `Request failed: ${error.message}`;
  }
}

// Browser native Text-To-Speech engine
function speakText(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any previous speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('Text-to-speech is not supported in this browser.');
  }
}