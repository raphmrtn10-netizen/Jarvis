// Automatically restore key if stored previously
document.getElementById('apiKey').value = localStorage.getItem('GEMINI_KEY') || '';

document.getElementById('submitBtn').addEventListener('click', async () => {
  const apiKey = document.getElementById('apiKey').value.trim();
  const userPrompt = document.getElementById('userInput').value.trim();
  const outputDiv = document.getElementById('responseOutput');

  if (!apiKey || !userPrompt) {
    alert('Please provide both an API Key and a message.');
    return;
  }

  // Save key locally
  localStorage.setItem('GEMINI_KEY', apiKey);
  outputDiv.innerText = 'Thinking...';

  // Endpoint targeting Gemini 2.5 Flash
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: userPrompt }] }]
      })
    });

    const data = await response.json();

    if (data.error) {
      outputDiv.innerText = `API Error: ${data.error.message}`;
      return;
    }

    const aiText = data.candidates[0].content.parts[0].text;
    outputDiv.innerText = aiText;

    // Trigger Text-To-Speech
    readAloud(aiText);

  } catch (err) {
    outputDiv.innerText = `Connection failed: ${err.message}`;
  }
});

function readAloud(text) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Stop any active speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Browser does not support SpeechSynthesis.");
  }
}