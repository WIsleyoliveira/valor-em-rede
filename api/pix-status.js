// ─── api/pix-status.js — Vercel Serverless Function (MVP sem gateway externo)
// Simula confirmação de PIX para permitir teste completo do fluxo no app.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: false },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id é obrigatório' });

  const status =
    typeof id === 'string' && id.startsWith('pix_mock_')
      ? 'CONFIRMED'
      : 'PENDING';

  return res.status(200).json({ status, simulated: true });
}
