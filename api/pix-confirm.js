// ─── api/pix-confirm.js — Vercel Serverless Function ─────────────────────────
// Recebe a confirmação do pagar.html (celular do associado) e registra em
// memória para que o app do operador possa detectar via polling no pix-status.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

// Map global compartilhado entre invocações na mesma instância serverless.
// Chave: paymentId  Valor: { valor, nome, confirmedAt }
// TTL: 30 minutos — evita crescimento ilimitado em memória
if (!global._pixConfirmados) {
  global._pixConfirmados = new Map();
}
const confirmados = global._pixConfirmados;

// Limpa entradas expiradas (> 30 min)
function limparExpirados() {
  const limite = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of confirmados) {
    if (v.confirmedAt < limite) confirmados.delete(k);
  }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  limparExpirados();

  // GET — o pix-status.js delega para cá quando necessário
  if (req.method === 'GET') {
    const id = req.query?.id;
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });
    const entry = confirmados.get(id);
    if (entry) {
      return res.status(200).json({ status: 'CONFIRMED', ...entry });
    }
    return res.status(200).json({ status: 'PENDING' });
  }

  // POST — chamado pelo pagar.html quando o associado confirma
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { id, valor, nome } = body || {};
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });

    confirmados.set(id, {
      valor: Number(valor) || 0,
      nome: nome || 'Associado',
      confirmedAt: Date.now(),
    });

    return res.status(200).json({ ok: true });
  }

  return res.status(405).end();
}
