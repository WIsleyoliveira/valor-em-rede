// ─── api/pix-status.js — Vercel Serverless Function ──────────────────────────
// GET  → verifica status de uma cobrança PIX (polling pelo app)
// POST → registra confirmação (chamado pelo pagar.html no celular do associado)
//
// Estratégia de persistência em camadas:
//  1. global._pixConfirmados (memória local da instância) — mais rápido
//  2. Supabase tabela pix_confirmacoes — persiste entre instâncias
//  3. Fallback mock para IDs pix_mock_* (após 30s)
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

// Cache em memória local — compartilhado dentro da mesma instância Vercel
if (!global._pixConfirmados) {
  global._pixConfirmados = new Map();
}
const cache = global._pixConfirmados;

function limparCache() {
  const limite = Date.now() - 60 * 60 * 1000; // 1 hora
  for (const [k, v] of cache) {
    if (v.ts < limite) cache.delete(k);
  }
}

async function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return null;
  }
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  limparCache();

  // ── POST: pagar.html registra a confirmação ────────────────────────────────
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') {
      try { body = JSON.parse(body); } catch { body = {}; }
    }

    const { id, valor, nome } = body || {};
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });

    const entry = {
      valor: Number(valor) || 0,
      nome: nome || 'Associado',
      ts: Date.now(),
    };

    // 1. Salva em memória local (instância atual)
    cache.set(id, entry);

    // 2. Persiste no Supabase para outras instâncias
    try {
      const supabase = await getSupabase();
      if (supabase) {
        await supabase
          .from('pix_confirmacoes')
          .upsert({
            payment_id: id,
            valor: entry.valor,
            nome: entry.nome,
            confirmed_at: new Date().toISOString(),
          }, { onConflict: 'payment_id' });
      }
    } catch {
      // falha silenciosa — memória local já está preenchida
    }

    return res.status(200).json({ ok: true });
  }

  // ── GET: app do operador faz polling ──────────────────────────────────────
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id é obrigatório' });

  // 1. Checa cache em memória local (instância atual)
  const cached = cache.get(id);
  if (cached) {
    return res.status(200).json({
      status: 'CONFIRMED',
      valor: cached.valor,
      nome: cached.nome,
    });
  }

  // 2. Checa Supabase (outras instâncias podem ter recebido o POST)
  try {
    const supabase = await getSupabase();
    if (supabase) {
      const { data, error } = await supabase
        .from('pix_confirmacoes')
        .select('valor, nome, confirmed_at')
        .eq('payment_id', id)
        .maybeSingle();

      if (!error && data) {
        // Guarda em cache local para próximos pollings nesta instância
        cache.set(id, { valor: data.valor, nome: data.nome, ts: Date.now() });
        return res.status(200).json({
          status: 'CONFIRMED',
          valor: data.valor,
          nome: data.nome,
          confirmedAt: data.confirmed_at,
        });
      }
    }
  } catch {
    // falha silenciosa — cai no fallback abaixo
  }

  // 3. Fallback: simula confirmação automática para IDs mock após 30s
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
