export default async function handler(req, res) {
  const sid = req.query?.sid || 'latest';
  global.__call_transcripts = global.__call_transcripts || {};
  global.__call_completed = global.__call_completed || {};

  const turns = global.__call_transcripts[sid] || global.__call_transcripts['latest'] || [];
  let isDone = global.__call_completed[sid] || false;
  let duration = null;

  // If Twilio SID is provided and not marked done yet, check Twilio status
  if (sid.startsWith('CA')) {
    try {
      let env = { ...process.env };
      const fs = await import('fs');
      if (fs.existsSync('.env')) {
        const content = fs.readFileSync('.env', 'utf8');
        content.split(/\r?\n/).forEach((l) => {
          const m = l.match(/^([A-Za-z0-9_]+)=(.*)$/);
          if (m) env[m[1].trim()] = m[2].trim();
        });
      }
      if (env.TWILIO_SID && env.TWILIO_TOKEN) {
        const twRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_SID}/Calls/${sid}.json`, {
          headers: {
            Authorization: 'Basic ' + Buffer.from(`${env.TWILIO_SID}:${env.TWILIO_TOKEN}`).toString('base64')
          }
        });
        if (twRes.ok) {
          const twData = await twRes.json();
          if (['completed', 'busy', 'no-answer', 'canceled', 'failed'].includes(twData.status)) {
            isDone = true;
            global.__call_completed[sid] = true;
            duration = twData.duration ? String(twData.duration) : null;
          }
        }
      }
    } catch {}
  }

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json({
    sid,
    turns,
    count: turns.length,
    completed: isDone,
    duration
  });
}
