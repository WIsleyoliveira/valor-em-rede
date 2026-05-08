// ─── api/pix-status.js — Vercel Serverless Function ──────────────────────────
// Verifica o status de uma cobrança PIX.
// Checa primeiro as confirmações manuais (pagar.html) e depois simula
// confirmação automática para IDs mock (após 30s).
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

  // 1. Checa confirmações registradas pelo pagar.html (dispositivo do associado)
  if (global._pixConfirmados) {
    const entry = global._pixConfirmados.get(id);
    if (entry) {
      return res.status(200).json({
        status: 'CONFIRMED',
        valor: entry.valor,
        nome: entry.nome,
        confirmedAt: entry.confirmedAt,
      });
    }
  }

  // 2. Fallback: simula confirmação automática para IDs mock após 30s
  let status = 'PENDING';
  if (typeof id === 'string' && id.startsWith('pix_mock_')) {
    const parts = id.split('_');
    const ts = parseInt(parts[2], 10);
    if (!isNaN(ts) && Date.now() - ts >= 30_000) {
      status = 'CONFIRMED';
    }
  }

  return res.status(200).json({ status, simulated: true });
}
