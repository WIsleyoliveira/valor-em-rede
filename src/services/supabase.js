// ─── src/services/supabase.js ─────────────────────────────────────────────────
// Cliente Supabase — configure as variáveis de ambiente no .env.local
// ─────────────────────────────────────────────────────────────────────────────
import { createClient } from '@supabase/supabase-js';

const URL  = import.meta.env.VITE_SUPABASE_URL  || '';
const KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!URL || !KEY) {
  console.warn(
    '[Supabase] VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY não configurados.\n' +
    'Crie um arquivo .env.local na raiz do projeto com essas variáveis.\n' +
    'O app funcionará no modo localStorage offline até você configurar.'
  );
}

export const supabase = (URL && KEY)
  ? createClient(URL, KEY, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
      realtime: { params: { eventsPerSecond: 10 } },
    })
  : null;

export const isSupabaseEnabled = Boolean(URL && KEY);

// ── Keep-alive: evita pausa automática do plano Free (pausa após 7 dias) ──────
// Faz um ping leve a cada 4 dias. Só roda uma vez por sessão do navegador.
if (supabase) {
  const LAST_PING_KEY = 'ver_last_keepalive';
  const FOUR_DAYS_MS  = 4 * 24 * 60 * 60 * 1000;

  const lastPing = parseInt(localStorage.getItem(LAST_PING_KEY) || '0', 10);
  if (Date.now() - lastPing > FOUR_DAYS_MS) {
    // Consulta mínima só para manter o projeto ativo
    supabase.from('members').select('id').limit(1).then(() => {
      localStorage.setItem(LAST_PING_KEY, String(Date.now()));
    });
  }
}
