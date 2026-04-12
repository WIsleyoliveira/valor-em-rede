// ─── src/services/dbService.js ───────────────────────────────────────────────
// Camada de acesso ao banco — Supabase quando configurado, localStorage como fallback
// Toda a lógica de persistência passa por aqui. useStore.js não chama Supabase diretamente.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase, isSupabaseEnabled } from './supabase';
import { storage } from './storageService';

// ── helpers ───────────────────────────────────────────────────────────────────
const toLocal = (row) => ({
  ...row,
  // Supabase usa snake_case; mapeamos de volta para camelCase onde necessário
  createdAt: row.created_at || row.createdAt,
  memberName: row.name,
});

const toRow = (obj) => ({
  id:          obj.id,
  type:        obj.type,
  name:        obj.name || obj.memberName || obj.donorName || null,
  description: obj.desc || obj.description || null,
  value:       Number(obj.value) || 0,
  category:    obj.category || null,
  date:        obj.date || new Date().toISOString().slice(0, 10),
  status:      obj.status || 'confirmed',
  synced:      true,
  nf_url:      obj.nfUrl || null,
  receipt_url: obj.receiptUrl || null,
  created_at:  obj.createdAt || new Date().toISOString(),
});

// ─────────────────────────────────────────────────────────────────────────────
// TRANSACTIONS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchTransactions() {
  if (!isSupabaseEnabled) return storage.getTransactions();

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('[DB] fetchTransactions:', error.message);
    return storage.getTransactions(); // fallback
  }

  const mapped = data.map(toLocal);
  storage.saveTransactions(mapped); // atualiza cache offline
  return mapped;
}

export async function insertTransaction(tx) {
  if (!isSupabaseEnabled) {
    // modo offline puro
    const current = storage.getTransactions();
    storage.saveTransactions([tx, ...current]);
    return tx;
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([toRow(tx)])
    .select()
    .single();

  if (error) {
    console.error('[DB] insertTransaction:', error.message);
    // Salva offline para sincronizar depois
    const current = storage.getTransactions();
    storage.saveTransactions([{ ...tx, synced: false }, ...current]);
    return { ...tx, synced: false };
  }

  const saved = toLocal(data);
  // Atualiza cache local
  const current = storage.getTransactions();
  storage.saveTransactions([saved, ...current.filter((t) => t.id !== saved.id)]);
  return saved;
}

export async function syncPendingTransactions(pending) {
  if (!isSupabaseEnabled || pending.length === 0) return [];

  const rows = pending.map(toRow);
  const { data, error } = await supabase
    .from('transactions')
    .upsert(rows, { onConflict: 'id' })
    .select();

  if (error) {
    console.error('[DB] syncPending:', error.message);
    return [];
  }
  return data.map(toLocal);
}

// ─────────────────────────────────────────────────────────────────────────────
// MEMBERS
// ─────────────────────────────────────────────────────────────────────────────
export async function fetchMembers() {
  if (!isSupabaseEnabled) return storage.getMembers();

  const { data, error } = await supabase
    .from('members')
    .select('*')
    .order('joined_at', { ascending: false });

  if (error) {
    console.error('[DB] fetchMembers:', error.message);
    return storage.getMembers();
  }

  storage.saveMembers(data);
  return data;
}

export async function insertMember(member) {
  if (!isSupabaseEnabled) {
    const current = storage.getMembers();
    storage.saveMembers([member, ...current]);
    return member;
  }

  const { data, error } = await supabase
    .from('members')
    .insert([{
      id:        member.id,
      name:      member.name,
      email:     member.email,
      role:      member.role || 'member',
      status:    member.status || 'active',
      joined_at: member.joinedAt || new Date().toISOString(),
    }])
    .select()
    .single();

  if (error) {
    console.error('[DB] insertMember:', error.message);
    return member;
  }
  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTH — Login / Register / Logout
// ─────────────────────────────────────────────────────────────────────────────

// Traduz erros do Supabase Auth para português (sem vazar info técnica)
function translateAuthError(msg = '') {
  if (!msg) return 'Ocorreu um erro. Tente novamente.';
  const m = msg.toLowerCase();
  if (m.includes('invalid login') || m.includes('invalid credentials') || m.includes('wrong password'))
    return 'E-mail ou senha incorretos.';
  if (m.includes('email not confirmed'))
    return '✉️ Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.';
  if (m.includes('user already registered') || m.includes('already been registered') || m.includes('duplicate'))
    return 'EMAIL_JA_CADASTRADO';
  if (m.includes('password') && m.includes('least'))
    return 'A senha deve ter no mínimo 6 caracteres.';
  if (m.includes('rate limit') || m.includes('too many'))
    return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
  if (m.includes('network') || m.includes('fetch'))
    return 'Sem conexão. Verifique sua internet.';
  if (m.includes('weak password'))
    return 'Senha muito fraca. Use letras, números e símbolos.';
  return 'Ocorreu um erro. Tente novamente.';
}

// Verifica se e-mail já está cadastrado na tabela members
export async function checkEmailExists(email) {
  if (!isSupabaseEnabled) return false;
  const { data } = await supabase
    .from('members')
    .select('id')
    .eq('email', email.toLowerCase().trim())
    .maybeSingle();
  return Boolean(data);
}

export async function signIn(email, password) {
  if (!isSupabaseEnabled) return { user: null, error: null, offline: true };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) return { user: null, error: translateAuthError(error.message) };

  // Busca perfil do membro
  const { data: profile } = await supabase
    .from('members')
    .select('*')
    .eq('auth_id', data.user.id)
    .single();

  return {
    user: profile
      ? { id: profile.id, name: profile.name, email: profile.email, role: profile.role, authId: data.user.id }
      : { id: data.user.id, name: data.user.email, email: data.user.email, role: 'member', authId: data.user.id },
    error: null,
  };
}

export async function signUp(name, email, password) {
  if (!isSupabaseEnabled) return { user: null, error: null, offline: true };

  // Novos cadastros são SEMPRE membros — o gestor é único e pré-definido no banco
  const role = 'member';

  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) return { user: null, error: translateAuthError(error.message) };

  // Supabase retorna identities vazia quando e-mail já existe mas não confirmou
  if (data.user && data.user.identities && data.user.identities.length === 0) {
    return { user: null, error: 'EMAIL_JA_CADASTRADO' };
  }

  // Cria perfil na tabela members sempre como 'member'
  const { data: profile, error: profileError } = await supabase
    .from('members')
    .insert([{ auth_id: data.user.id, name, email: email.toLowerCase().trim(), role }])
    .select()
    .single();

  if (profileError) {
    // Se for duplicata na tabela members
    if (profileError.message?.includes('duplicate') || profileError.code === '23505') {
      return { user: null, error: 'EMAIL_JA_CADASTRADO' };
    }
    console.error('[DB] signUp profile:', profileError.message);
  }

  return {
    user: { id: profile?.id, name, email, role, authId: data.user.id },
    error: null,
  };
}

export async function signOut() {
  if (!isSupabaseEnabled) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!isSupabaseEnabled) return null;
  const { data } = await supabase.auth.getSession();
  return data?.session || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// REALTIME — escuta mudanças em transactions e chama callback
// ─────────────────────────────────────────────────────────────────────────────
export function subscribeTransactions(callback) {
  if (!isSupabaseEnabled) return () => {};

  const channel = supabase
    .channel('transactions-changes')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'transactions' },
      (payload) => callback(payload)
    )
    .subscribe();

  return () => supabase.removeChannel(channel);
}
