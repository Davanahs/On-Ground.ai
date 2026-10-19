export default function handler(req, res) {
  const customerPhone = req.query.to || '';
  const cleanPhone = String(customerPhone).replace(/[<>&"']/g, '');

  res.setHeader('Content-Type', 'text/xml');
  res.send(`<Response><Dial>${cleanPhone}</Dial></Response>`);
}
