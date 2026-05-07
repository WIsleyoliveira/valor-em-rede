// ─── api/webhook-pix.js — Vercel Serverless Function ─────────────────────────
// Recebe notificação do Asaas quando o PIX é pago
// Atualiza o status da transação no Supabase automaticamente
// ─────────────────────────────────────────────────────────────────────────────

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  // Asaas só envia POST
  if (req.method !== 'POST') return res.status(405).end();

  // ── Valida o token de autenticação do webhook ─────────────────────────────
  // Esse token você copiou do painel Asaas ao criar o webhook
  const webhookToken = process.env.ASAAS_WEBHOOK_TOKEN;
  const receivedToken = req.headers['asaas-access-token'];

  if (webhookToken && receivedToken !== webhookToken) {
    console.warn('[Webhook] Token inválido recebido:', receivedToken);
    return res.status(401).json({ error: 'Unauthorized' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }

  const { event, payment } = body || {};

  console.log('[Webhook] Evento recebido:', event, '| Payment ID:', payment?.id);

  // ── Só processa eventos de pagamento confirmado ───────────────────────────
  if (event === 'PAYMENT_RECEIVED' || event === 'PAYMENT_CONFIRMED') {
    try {
      // Importa o Supabase com a chave de SERVICE ROLE (permissão total)
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY // não use a anon key aqui!
      );

      // Atualiza a transação que tem o asaas_payment_id correspondente
      const { error } = await supabase
        .from('transactions')
        .update({
          status: 'confirmed',
          synced: true,
        })
        .eq('asaas_payment_id', payment.id);

      if (error) {
        console.error('[Webhook] Erro ao atualizar Supabase:', error.message);
        // Retorna 200 mesmo assim — evita que o Asaas fique reenviando
        return res.status(200).json({ received: true, dbError: error.message });
      }

      console.log('[Webhook] Transação confirmada no Supabase para payment:', payment.id);
    } catch (err) {
      console.error('[Webhook] Exceção:', err.message);
      return res.status(200).json({ received: true, error: err.message });
    }
  }

  // Sempre retorna 200 pro Asaas — se retornar 4xx/5xx ele fica tentando reenviar
  return res.status(200).json({ received: true, event });
}