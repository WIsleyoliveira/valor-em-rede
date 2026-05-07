// ─── api/pix-status.js — Vercel Serverless Function ──────────────────────────
// Consulta o status de um pagamento no Asaas
// Chamado pelo polling do PaymentForm a cada 5 segundos
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: false },
};

const ASAAS_URL = process.env.ASAAS_URL || 'https://sandbox.asaas.com/api/v3';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const apiKey = process.env.ASAAS_API_KEY;
  if (!apiKey) return res.status(503).json({ error: 'ASAAS_API_KEY não configurada' });

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id é obrigatório' });

  try {
    const response = await fetch(`${ASAAS_URL}/payments/${id}`, {
      headers: {
        'access_token': apiKey,
        'User-Agent': 'ValorEmRede/1.0',
      },
    });

    const data = await response.json();

    // Retorna só o status — não expõe dados sensíveis pro browser
    return res.status(200).json({ status: data.status || 'PENDING' });

  } catch (err) {
    console.error('[PIX-STATUS] erro:', err.message);
    return res.status(500).json({ status: 'PENDING', error: err.message });
  }
}