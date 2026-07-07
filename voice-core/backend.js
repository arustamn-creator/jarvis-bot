const axios = require('axios');

async function ask(text) {
  const url = process.env.JARVIS_API_URL;
  const token = process.env.VOICE_API_TOKEN;
  if (!url || !token) {
    throw new Error('JARVIS_API_URL и VOICE_API_TOKEN должны быть заданы в .env');
  }

  const res = await axios.post(
    `${url.replace(/\/+$/, '')}/api/ask`,
    { text },
    {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 120000,
    }
  );
  return res.data.reply;
}

module.exports = { ask };
