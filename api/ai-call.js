export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Handle probe / ping check from frontend
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(200).json({ status: 'ok', api: true });
  }

  const { to, name } = req.body || {};
  if (!/^\+\d{8,15}$/.test(to || '')) {
    return res.status(400).json({ error: 'Invalid phone number format. Must be E.164' });
  }

  const allowed = (process.env.ALLOWED_NUMBERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return res.status(403).json({ error: 'Server misconfiguration: ALLOWED_NUMBERS is not configured' });
  }

  if (!allowed.includes(to)) {
    return res.status(403).json({ error: 'Number not allowed' });
  }

  const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = process.env;
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || TWILIO_SID.startsWith('ACxxxxxxx')) {
    return res.status(500).json({ error: 'Twilio server credentials (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM) not configured' });
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers.host;
    const url = `${protocol}://${host}/api/ai-voice?name=${encodeURIComponent(name || 'there')}`;

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

    res.status(200).json({ sid: j.sid, status: j.status, error: j.message });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error initiating AI call' });
  }
}
