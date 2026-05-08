// ─── api/pix-status.js — Vercel Serverless Function ──────────────────────────
// Verifica o status de uma cobrança PIX.
// Checa o Supabase por confirmações registradas pelo pagar.html,
// depois simula confirmação automática para IDs mock (após 30s).
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: false },
};

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id é obrigatório' });

  // 1. Checa confirmações registradas pelo pagar.html no Supabase
  try {
    const supabase = await getSupabase();
    const { data, error } = await supabase
      .from('pix_confirmacoes')
      .select('valor, nome, confirmed_at')
      .eq('payment_id', id)
      .single();

    if (!error && data) {
      return res.status(200).json({
        status: 'CONFIRMED',
        valor: data.valor,
        nome: data.nome,
        confirmedAt: data.confirmed_at,
      });
    }
  } catch {
    // falha silenciosa — cai no fallback abaixo
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
