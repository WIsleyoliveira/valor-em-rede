// ─── api/pix.js — Vercel Serverless Function (MVP sem gateway externo) ──────
// Gera uma cobrança PIX simulada para desenvolvimento/demo sem ASAAS_API_KEY.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

function makeMockPixPayload(paymentId, value, name) {
  const normalizedName = (name || 'ASSOCIADO').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 25);
  const amount = Number(value || 0).toFixed(2);
  const now = Date.now().toString(36).toUpperCase();
  return `00020126360014BR.GOV.BCB.PIX0114+559999999999520400005303986540${amount.replace('.', '')}5802BR5925${normalizedName.padEnd(25, ' ')}6009SAO PAULO62140510${paymentId.slice(-10)}6304${now.slice(-4)}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { name, email, value } = body || {};
  if (!name || !email || !value) {
    return res.status(400).json({ error: 'name, email e value são obrigatórios' });
  }

  const paymentId = `pix_mock_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  return res.status(200).json({
    paymentId,
    qrCodeImage: '',
    copyPaste: makeMockPixPayload(paymentId, value, name),
    expiresAt,
    status: 'PENDING',
    simulated: true,
  });
}
