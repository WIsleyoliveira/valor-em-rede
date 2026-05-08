// ─── api/pix-confirm.js — Vercel Serverless Function ─────────────────────────
// Recebe a confirmação do pagar.html (celular do associado) e persiste no
// Supabase para que o app do operador detecte via polling no pix-status.
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

  try {
    const supabase = await getSupabase();
    const { error } = await supabase
      .from('pix_confirmacoes')
      .upsert({
        payment_id: id,
        valor: Number(valor) || 0,
        nome: nome || 'Associado',
        confirmed_at: new Date().toISOString(),
      }, { onConflict: 'payment_id' });

    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[pix-confirm] erro:', err.message);
    return res.status(500).json({ error: err.message });
  }
}
