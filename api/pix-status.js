// ─── api/pix-status.js — Vercel Serverless Function ──────────────────────────
// GET  → verifica status de uma cobrança
//         • Se ASAAS_API_KEY configurada: consulta o Asaas diretamente
//         • Fallback: verifica cache memória + Supabase (para QR Codes físicos/mock)
// POST → registra confirmação manual (chamado pelo pagar.html)
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

const ASAAS_URL = process.env.ASAAS_URL || 'https://sandbox.asaas.com/api/v3';

// Cache em memória para confirmações manuais (pagar.html)
if (!global._pixConfirmados) global._pixConfirmados = new Map();
const cache = global._pixConfirmados;

function limparCache() {
  const limite = Date.now() - 60 * 60 * 1000;
  for (const [k, v] of cache) {
    if (v.ts < limite) cache.delete(k);
  }
}

async function getSupabase() {
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  const { createClient } = await import('@supabase/supabase-js');
  return createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  limparCache();

  // ── POST: pagar.html registra confirmação manual ──────────────────────────
  if (req.method === 'POST') {
    let body = req.body;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = {}; } }

    const { id, valor, nome } = body || {};
    if (!id) return res.status(400).json({ error: 'id é obrigatório' });

    const entry = { valor: Number(valor) || 0, nome: nome || 'Associado', ts: Date.now() };
    cache.set(id, entry);

    try {
      const supabase = await getSupabase();
      if (supabase) {
        await supabase.from('pix_confirmacoes').upsert({
          payment_id: id,
          valor: entry.valor,
          nome: entry.nome,
          confirmed_at: new Date().toISOString(),
        }, { onConflict: 'payment_id' });
      }
    } catch { /* falha silenciosa */ }

    return res.status(200).json({ ok: true });
  }

  // ── GET: polling do PaymentForm ───────────────────────────────────────────
  if (req.method !== 'GET') return res.status(405).end();

  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'id é obrigatório' });

  const apiKey = process.env.ASAAS_API_KEY;
  const isMock = typeof id === 'string' && id.startsWith('pix_mock_');

  // ── Rota real: consulta o Asaas diretamente ───────────────────────────────
  if (apiKey && !isMock) {
    try {
      const asaasRes = await fetch(`${ASAAS_URL}/payments/${encodeURIComponent(id)}`, {
        headers: {
          'access_token': apiKey,
          'User-Agent': 'ValorEmRede/1.0',
        },
      });
      const asaasData = await asaasRes.json();
      const status = (asaasData?.status || 'PENDING').toUpperCase();

      return res.status(200).json({
        status,
        valor: asaasData?.value || 0,
        nome: asaasData?.customer || '',
        simulated: false,
      });
    } catch (err) {
      console.error('[PIX-STATUS] Erro ao consultar Asaas:', err.message);
      // Cai no fallback abaixo
    }
  }

  // ── Fallback 1: cache memória (confirmação manual via pagar.html) ─────────
  const cached = cache.get(id);
  if (cached) {
    return res.status(200).json({ status: 'CONFIRMED', valor: cached.valor, nome: cached.nome });
  }

  // ── Fallback 2: Supabase (outras instâncias serverless) ───────────────────
  try {
    const supabase = await getSupabase();
    if (supabase) {
      const { data } = await supabase
        .from('pix_confirmacoes')
        .select('valor, nome, confirmed_at')
        .eq('payment_id', id)
        .maybeSingle();

      if (data) {
        cache.set(id, { valor: data.valor, nome: data.nome, ts: Date.now() });
        return res.status(200).json({ status: 'CONFIRMED', valor: data.valor, nome: data.nome });
      }
    }
  } catch { /* falha silenciosa */ }

  // ── Fallback 3: mock expira após 30s ─────────────────────────────────────
  if (isMock) {
    const parts = id.split('_');
    const ts = parseInt(parts[2], 10);
    if (!isNaN(ts) && Date.now() - ts >= 30_000) {
      return res.status(200).json({ status: 'CONFIRMED', simulated: true });
    }
  }

  return res.status(200).json({ status: 'PENDING' });
}
