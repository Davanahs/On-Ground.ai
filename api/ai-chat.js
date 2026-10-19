export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let apiKey = process.env.GROQ_API_KEY;
  if (!apiKey || apiKey.startsWith('gsk_xxx')) {
    try {
      const fs = await import('fs');
      if (fs.existsSync('.env')) {
        const content = fs.readFileSync('.env', 'utf8');
        const match = content.match(/GROQ_API_KEY=([^\r\n]+)/);
        if (match) apiKey = match[1].trim();
      }
    } catch {}
  }

  if (!apiKey || apiKey.startsWith('gsk_xxx')) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not configured in .env' });
  }

  const { messages = [], customerName = 'there', product = 'Ortho GRID Mattress' } = req.body || {};

  const systemPrompt = `You are Avani, a friendly, professional, and empathetic sales consultant at On-Ground.ai Call Centre in Bengaluru, India.
You are in a live phone conversation with ${customerName} regarding their interest in the ${product}.
Important Guidelines:
- Keep every answer short and conversational (1-2 sentences maximum, strictly under 40 words). This is spoken audio, not an email.
- Sound warm, polite, and helpful in standard Indian English.
- Highlight key benefits when relevant: 0% no-cost EMI for 6 to 12 months, 10-year warranty, 100-night risk-free trial.
- Guide the conversation gently toward scheduling a showroom visit or placing an order.
- Never use emojis, asterisks, bullet points, markdown, or stage directions. Output only the exact words to speak.`;

  try {
    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-8)
    ];

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'openai/gpt-oss-20b',
        messages: groqMessages,
        max_tokens: 500,
        temperature: 0.6
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.error?.message || 'Groq API request failed' });
    }

    const reply = data.choices?.[0]?.message?.content?.trim() || '';
    return res.status(200).json({ reply });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Server error communicating with Groq' });
  }
}
