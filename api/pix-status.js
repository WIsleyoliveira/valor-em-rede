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

  const supabase = await getSupabase();

  // 1. Checa tabela pix_confirmacoes
  const { data: conf, error: e1 } = await supabase
    .from('pix_confirmacoes')
    .select('valor, nome, confirmed_at')
    .eq('payment_id', id)
    .maybeSingle();

  if (!e1 && conf) {
    return res.status(200).json({
      status: 'CONFIRMED',
      valor: conf.valor,
      nome: conf.nome,
      confirmedAt: conf.confirmed_at,
    });
  }

  // 2. Fallback: checa tabela transactions (caso pix_confirmacoes não exista)
  const { data: tx } = await supabase
    .from('transactions')
    .select('name, value, created_at')
    .eq('description', `__pix_confirm__${id}`)
    .maybeSingle();

  if (tx) {
    return res.status(200).json({
      status: 'CONFIRMED',
      valor: tx.value,
      nome: tx.name,
      confirmedAt: tx.created_at,
    });
  }

  // 3. Simula confirmação automática para IDs mock após 30s
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
