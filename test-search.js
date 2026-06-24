require('dotenv').config();

fetch("https://apinet.cloud/v1/messages", {
  method: "POST",
  headers: {
    "x-api-key": process.env.ANTHROPIC_API_KEY,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json"
  },
  body: JSON.stringify({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    tools: [{ type: "web_search_20250305", name: "web_search" }],
    messages: [{ role: "user", content: "Какой курс доллара к рублю прямо сейчас, по данным ЦБ на сегодня? Используй поиск." }]
  })
})
  .then(r => r.json())
  .then(d => console.log(JSON.stringify(d, null, 2)))
  .catch(e => console.error(e));