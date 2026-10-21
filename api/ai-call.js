export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Handle probe / ping check from frontend
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(200).json({ status: 'ok', api: true });
  }

  const { to, name, purpose, product } = req.body || {};
  if (!/^\+\d{8,15}$/.test(to || '')) {
    return res.status(400).json({ error: 'Invalid phone number format. Must be E.164 (e.g. +919876543210)' });
  }

  let env = { ...process.env };
  try {
    const fs = await import('fs');
    if (fs.existsSync('.env')) {
      const content = fs.readFileSync('.env', 'utf8');
      content.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^([A-Za-z0-9_]+)=(.*)$/);
        if (match) {
          env[match[1].trim()] = match[2].trim();
        }
      });
    }
  } catch {}

  const allowed = (env.ALLOWED_NUMBERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return res.status(403).json({ error: 'Server misconfiguration: ALLOWED_NUMBERS is not configured in .env' });
  }

  if (!allowed.includes('*') && !allowed.includes(to)) {
    return res.status(403).json({
      error: `Number ${to} is not in ALLOWED_NUMBERS whitelist in .env. Add ${to} to ALLOWED_NUMBERS in .env or set ALLOWED_NUMBERS=* for unrestricted testing.`
    });
  }

  const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = env;
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || TWILIO_SID.startsWith('ACxxxxxxx')) {
    return res.status(500).json({
      error: 'Twilio telephony credentials (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM) not configured in .env. Telephony carrier is required to ring a real cellular mobile phone.'
    });
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    let baseUrl = env.PUBLIC_URL || env.APP_URL;

    if (!baseUrl) {
      baseUrl = `${protocol}://${host}`;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');

    // Check if baseUrl is pointing to localhost when testing locally without a tunnel
    if ((baseUrl.includes('localhost') || baseUrl.includes('127.0.0.1')) && !process.env.PUBLIC_URL) {
      return res.status(400).json({
        error: 'Twilio cloud cannot reach http://localhost to speak TwiML. When testing locally, please run ngrok (e.g. "ngrok http 5173") and set PUBLIC_URL=https://<your-id>.ngrok-free.app in .env, or deploy the app to Netlify/Vercel.'
      });
    }

    const voiceParams = new URLSearchParams({
      name: name || 'Customer',
      purpose: purpose || '',
      product: product || 'Ortho GRID Mattress'
    });
    const url = `${baseUrl}/api/ai-voice?${voiceParams.toString()}`;

    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ To: to, From: TWILIO_FROM, Url: url })
    });

    const j = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: j.message || 'Twilio call failed' });
    }

    res.status(200).json({ sid: j.sid, status: j.status, to, name, purpose, product });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error initiating AI call' });
  }
}

