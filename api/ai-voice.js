const RULES = [
  [/emi|finance|budget|price|cost|how much/i, 'Our Ortho GRID mattress starts at fourteen thousand nine hundred rupees with zero percent no-cost EMI options from three to twelve months.'],
  [/warrant|guarantee/i, 'We provide a ten-year comprehensive replacement warranty and free doorstep service across India.'],
  [/trial|return|refund/i, 'You get a hundred-night risk-free home trial. If you are not completely satisfied, we pick it up and give a full refund.'],
  [/back pain|spine|ortho|comfort|pain/i, 'The Ortho GRID uses patented Japanese gel grid technology that adapts to your spine to relieve lower back pain.'],
  [/visit|store|try|showroom/i, 'Wonderful! Shall I book a trial visit for you at our local experience centre tomorrow at four thirty PM?'],
  [/delivery|shipping|time/i, 'We provide free doorstep delivery and setup across India within forty-eight to seventy-two hours.'],
  [/whatsapp|catalog|details|send/i, 'Certainly! I will send our complete product catalog and exclusive pricing directly to your WhatsApp.'],
  [/yes|ok|sure|book|confirm/i, 'Great! I have noted that down, and our team will send the booking confirmation and details on WhatsApp.'],
  [/no|not now|busy|later/i, 'No problem at all! I will schedule a quick callback for next week. Thank you for your time.']
];

const clean = (s) => String(s).replace(/[<>&"']/g, '');

export default async function handler(req, res) {
  const said = (req.body || {}).SpeechResult || '';
  const name = clean(req.query.name || 'there');
  const purpose = clean(req.query.purpose || '');
  const product = clean(req.query.product || 'Ortho GRID Mattress');
  let line = '';

  const callSid = (req.body && req.body.CallSid) || req.query.sid || 'latest';
  global.__call_transcripts = global.__call_transcripts || {};
  if (!global.__call_transcripts[callSid]) {
    global.__call_transcripts[callSid] = [];
  }

  if (said) {
    const userTurn = { speaker: `${name} (Customer)`, text: said, timestamp: Date.now() };
    global.__call_transcripts[callSid].push(userTurn);
    global.__call_transcripts['latest'] = global.__call_transcripts[callSid];
  }

  // Prior turns from global memory for this call
  const priorTurns = (global.__call_transcripts[callSid] || []).map((t) => ({
    role: t.speaker.includes('Avani') ? 'assistant' : 'user',
    content: t.text
  }));

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
      const contextDesc = purpose ? `${purpose} (Product: ${product})` : `Inquiry about ${product}`;
      const systemPrompt = `You are Avani, a friendly, professional sales specialist calling from On-Ground.ai Sleep Wellness Solutions in India.
You are in a live phone call with customer: ${name}.
Call Purpose & Context: ${contextDesc}.

COMPANY & PRODUCT KNOWLEDGE:
- Company: On-Ground.ai (Specialists in premium orthopedic sleep systems & mattresses, India).
- Flagship Product: Ortho GRID Mattress (Patented Japanese hyper-elastic gel grid technology).
- Key Benefits: Ergonomic spinal support, actively relieves lower back pain, temperature-neutral airflow.
- Pricing & Financing: Starting from Rs. 14,999 up to Rs. 32,999 (Single, Queen, King sizes). 0% no-cost EMI from 3 to 12 months with leading banks.
- Customer Assurance: 100-night risk-free home trial with 100% money back, plus 10-year comprehensive warranty.
- Delivery: Free doorstep delivery and unboxing within 48 to 72 hours across India.
- Next Steps to Offer: Book an experience store visit appointment or send the product catalog & quotation via WhatsApp.

CALL GUIDELINES:
- Speak warmly and naturally in Indian English over the phone.
- Answer in 1 to 2 spoken sentences maximum (strictly under 30 words). Phone callers need short, crisp answers.
- Directly address what ${name} asked or said.
- Never use emojis, asterisks, bullet points, markdown, or stage directions. Output ONLY words to be spoken.`;

      const groqMessages = [
        { role: 'system', content: systemPrompt },
        ...priorTurns.slice(-4),
        { role: 'user', content: said }
      ];

      const gRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'qwen/qwen3.8-27b',
          messages: groqMessages,
          max_tokens: 120,
          temperature: 0.5
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
    line = rule ? rule[1] : 'Understood. Would you like me to send our catalog on WhatsApp or book a showroom visit for you?';
  }

  const done = /bye|not now|no thanks|goodbye|wrong number/i.test(said);
  if (done) {
    global.__call_completed = global.__call_completed || {};
    global.__call_completed[callSid] = true;
    global.__call_completed['latest'] = true;
  }

  let env = { ...process.env };
  try {
    const fs = await import('fs');
    if (fs.existsSync('.env')) {
      const content = fs.readFileSync('.env', 'utf8');
      content.split(/\r?\n/).forEach((l) => {
        const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (m) env[m[1].trim()] = m[2].trim();
      });
    }
  } catch {}

  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let baseUrl = env.PUBLIC_URL || env.APP_URL;
  if (!baseUrl && host && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    baseUrl = `${protocol}://${host}`;
  }

  // Log Avani's response to live transcript
  if (line) {
    const agentTurn = { speaker: 'Avani (AI)', text: clean(line), timestamp: Date.now() };
    global.__call_transcripts[callSid].push(agentTurn);
    global.__call_transcripts['latest'] = global.__call_transcripts[callSid];
  }

  const queryStr = `sid=${encodeURIComponent(callSid)}&amp;name=${encodeURIComponent(name)}&amp;purpose=${encodeURIComponent(purpose)}&amp;product=${encodeURIComponent(product)}`;
  const nextActionUrl = baseUrl
    ? `${baseUrl.replace(/\/+$/, '')}/api/ai-voice?${queryStr}`
    : `/api/ai-voice?${queryStr}`;

  res.setHeader('Content-Type', 'text/xml');
  res.send(`<Response>${
    done
      ? `<Say language="en-IN" voice="Polly.Aditi">${clean(line)}</Say><Hangup/>`
      : `<Say language="en-IN" voice="Polly.Aditi">${clean(line)}</Say><Gather input="speech" language="en-IN" timeout="8" speechTimeout="auto" method="POST" action="${nextActionUrl}"/><Say voice="Polly.Aditi" language="en-IN">I did not hear any response. Feel free to call us back anytime. Goodbye.</Say>`
  }</Response>`);
}

