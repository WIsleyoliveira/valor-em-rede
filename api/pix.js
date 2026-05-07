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

function makeMockQrBase64(paymentId, value) {
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220" viewBox="0 0 220 220">
  <rect width="220" height="220" fill="#ffffff"/>
  <rect x="10" y="10" width="200" height="200" fill="none" stroke="#111827" stroke-width="4"/>
  <rect x="24" y="24" width="44" height="44" fill="#111827"/>
  <rect x="152" y="24" width="44" height="44" fill="#111827"/>
  <rect x="24" y="152" width="44" height="44" fill="#111827"/>
  <rect x="84" y="24" width="8" height="8" fill="#111827"/>
  <rect x="100" y="24" width="8" height="8" fill="#111827"/>
  <rect x="116" y="24" width="8" height="8" fill="#111827"/>
  <rect x="84" y="40" width="8" height="8" fill="#111827"/>
  <rect x="116" y="40" width="8" height="8" fill="#111827"/>
  <rect x="84" y="56" width="8" height="8" fill="#111827"/>
  <rect x="100" y="56" width="8" height="8" fill="#111827"/>
  <rect x="116" y="56" width="8" height="8" fill="#111827"/>
  <rect x="84" y="84" width="8" height="8" fill="#111827"/>
  <rect x="100" y="84" width="8" height="8" fill="#111827"/>
  <rect x="116" y="84" width="8" height="8" fill="#111827"/>
  <rect x="132" y="84" width="8" height="8" fill="#111827"/>
  <rect x="148" y="84" width="8" height="8" fill="#111827"/>
  <rect x="164" y="84" width="8" height="8" fill="#111827"/>
  <rect x="84" y="100" width="8" height="8" fill="#111827"/>
  <rect x="116" y="100" width="8" height="8" fill="#111827"/>
  <rect x="148" y="100" width="8" height="8" fill="#111827"/>
  <rect x="164" y="100" width="8" height="8" fill="#111827"/>
  <rect x="84" y="116" width="8" height="8" fill="#111827"/>
  <rect x="100" y="116" width="8" height="8" fill="#111827"/>
  <rect x="132" y="116" width="8" height="8" fill="#111827"/>
  <rect x="164" y="116" width="8" height="8" fill="#111827"/>
  <rect x="84" y="132" width="8" height="8" fill="#111827"/>
  <rect x="116" y="132" width="8" height="8" fill="#111827"/>
  <rect x="132" y="132" width="8" height="8" fill="#111827"/>
  <rect x="148" y="132" width="8" height="8" fill="#111827"/>
  <rect x="164" y="132" width="8" height="8" fill="#111827"/>
  <rect x="84" y="148" width="8" height="8" fill="#111827"/>
  <rect x="100" y="148" width="8" height="8" fill="#111827"/>
  <rect x="116" y="148" width="8" height="8" fill="#111827"/>
  <rect x="132" y="148" width="8" height="8" fill="#111827"/>
  <rect x="148" y="148" width="8" height="8" fill="#111827"/>
  <text x="110" y="206" text-anchor="middle" font-size="10" fill="#374151" font-family="Arial">PIX MOCK ${String(value || 0)}</text>
  <text x="110" y="216" text-anchor="middle" font-size="8" fill="#6b7280" font-family="Arial">${paymentId.slice(-10)}</text>
</svg>`.trim();

  return Buffer.from(svg, 'utf8').toString('base64');
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
    qrCodeImage: makeMockQrBase64(paymentId, value),
    copyPaste: makeMockPixPayload(paymentId, value, name),
    expiresAt,
    status: 'PENDING',
    simulated: true,
  });
}
