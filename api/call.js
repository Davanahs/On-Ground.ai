export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  // Handle probe / ping check from frontend
  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(200).json({ status: 'ok', api: true });
  }

  const { agentPhone, customerPhone } = req.body || {};
  const e164Regex = /^\+\d{8,15}$/;

  if (!e164Regex.test(agentPhone || '') || !e164Regex.test(customerPhone || '')) {
    return res.status(400).json({ error: 'Invalid phone number format. Must be E.164 (e.g. +919876500000)' });
  }

  const allowed = (process.env.ALLOWED_NUMBERS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return res.status(403).json({ error: 'Server misconfiguration: ALLOWED_NUMBERS is not configured' });
  }

  if (!allowed.includes('*') && !allowed.includes(customerPhone)) {
    return res.status(403).json({ error: 'Customer number not in allowed numbers list' });
  }

  const { TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM } = process.env;
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM || TWILIO_SID.startsWith('ACxxxxxxx')) {
    return res.status(500).json({ error: 'Twilio server credentials (TWILIO_SID, TWILIO_TOKEN, TWILIO_FROM) not configured' });
  }

  try {
    const protocol = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    let baseUrl = process.env.PUBLIC_URL || process.env.APP_URL;
    if (!baseUrl) {
      baseUrl = `${protocol}://${host}`;
    }
    baseUrl = baseUrl.replace(/\/+$/, '');
    const bridgeUrl = `${baseUrl}/api/connect-customer?to=${encodeURIComponent(customerPhone)}`;

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Calls.json`, {
      method: 'POST',
      headers: {
        Authorization: 'Basic ' + Buffer.from(`${TWILIO_SID}:${TWILIO_TOKEN}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        To: agentPhone,
        From: TWILIO_FROM,
        Url: bridgeUrl
      })
    });

    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Twilio call failed' });
    }

    res.status(200).json({ sid: data.sid, status: data.status, error: data.message });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error initiating call' });
  }
}
