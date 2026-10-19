const RULES = [
  [/emi|finance|budget|price|cost/i, 'We have 0% no cost EMI options from six to twelve months.'],
  [/warrant|trial/i, 'There is a ten year warranty and a hundred night trial on our Ortho mattresses.'],
  [/visit|store|try/i, 'Lovely. Shall I book a store visit appointment for you tomorrow at four thirty?'],
  [/yes|ok|sure|book|confirm/i, 'Great, I have noted that down and we will send a confirmation on WhatsApp.']
];

const clean = (s) => String(s).replace(/[<>&"']/g, '');

export default async function handler(req, res) {
  const said = (req.body || {}).SpeechResult || '';
  const name = clean(req.query.name || 'there');
  const purpose = clean(req.query.purpose || '');
  const product = clean(req.query.product || 'Ortho GRID Mattress');
  let line = '';

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

  if (!said) {
    if (purpose) {
      line = `Hello ${name}, this is Avani from On-Ground AI calling regarding ${purpose}. Is this a good time to speak?`;
    } else {
      line = `Hello ${name}, this is Avani from On-Ground AI calling regarding your enquiry for the ${product}. Is this a good time to speak?`;
    }
  } else if (apiKey && !apiKey.startsWith('gsk_xxx')) {
    try {
      const contextDesc = purpose ? `${purpose} (${product})` : product;
      const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'openai/gpt-oss-20b',
          messages: [
            {
              role: 'system',
              content: `You are Avani, sales representative at On-Ground AI Call Centre in India calling customer ${name} regarding ${contextDesc}. The customer answered your call over the phone and said something. Answer politely and concisely in 1 spoken sentence (under 25 words). Ask follow-up questions to understand their needs. No markdown, emojis, or bullet points.`
            },
            { role: 'user', content: said }
          ],
          max_tokens: 350,
          temperature: 0.6
        })
      });
      if (gRes.ok) {
        const gData = await gRes.json();
        line = gData.choices?.[0]?.message?.content?.trim();
      }
    } catch (e) {
      // Fallback to rules below
    }
  }

  if (!line) {
    const rule = RULES.find((r) => r[0].test(said));
    line = rule ? rule[1] : 'Understood. Could you tell me a little more about your preference?';
  }

  const done = /bye|not now|no thanks|goodbye/i.test(said);

  const nextActionUrl = `/api/ai-voice?name=${encodeURIComponent(name)}&amp;purpose=${encodeURIComponent(purpose)}&amp;product=${encodeURIComponent(product)}`;

  res.setHeader('Content-Type', 'text/xml');
  res.send(`<Response><Say language="en-IN">${clean(line)}</Say>${
    done
      ? '<Hangup/>'
      : `<Gather input="speech" language="en-IN" speechTimeout="auto" method="POST" action="${nextActionUrl}"/><Say>I did not hear anything. Goodbye.</Say>`
  }</Response>`);
}

