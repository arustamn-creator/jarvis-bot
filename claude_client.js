async function callClaude({ system, messages, maxTokens = 4096 }) {
  const response = await fetch('https://apinet.cloud/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: maxTokens,
      system,
      messages,
    }),
  }).then((r) => r.json());

  return response.content[0].text;
}

module.exports = { callClaude };
