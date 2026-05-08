// ─── api/pix-confirm.js — Vercel Serverless Function ─────────────────────────
// Recebe a confirmação do pagar.html (celular do associado) e persiste no
// Supabase para que o app do operador detecte via polling no pix-status.
// Tenta pix_confirmacoes primeiro; se falhar, usa transactions como fallback.
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
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
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).end();

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { id, valor, nome } = body || {};
  if (!id) return res.status(400).json({ error: 'id é obrigatório' });

  const supabase = await getSupabase();

  // Tenta tabela dedicada pix_confirmacoes
  const { error: e1 } = await supabase
    .from('pix_confirmacoes')
    .upsert({
      payment_id: id,
      valor: Number(valor) || 0,
      nome: nome || 'Associado',
      confirmed_at: new Date().toISOString(),
    }, { onConflict: 'payment_id' });

  if (!e1) return res.status(200).json({ ok: true });

  // Fallback: usa a tabela transactions com status 'pending' + pix_id para lookup
  console.warn('[pix-confirm] pix_confirmacoes falhou, usando transactions:', e1.message);
  const { error: e2 } = await supabase
    .from('transactions')
    .upsert({
      id: `pix-confirm-${id}`,
      type: 'payment',
      name: nome || 'Associado',
      value: Number(valor) || 0,
      date: new Date().toISOString().slice(0, 10),
      status: 'pending',
      synced: false,
      description: `__pix_confirm__${id}`,
    }, { onConflict: 'id' });

  if (e2) {
    console.error('[pix-confirm] fallback também falhou:', e2.message);
    return res.status(500).json({ error: e2.message });
  }

  return res.status(200).json({ ok: true });
}
