// ─── src/hooks/useStore.js ────────────────────────────────────────────────────
import { useState, useEffect, useMemo, useCallback } from 'react';
import { storage } from '../services/storageService';
import { genId } from '../utils/format';
import {
  fetchTransactions,
  insertTransaction,
  fetchMembers,
  insertMember as dbInsertMember,
  subscribeTransactions,
} from '../services/dbService';
import { isSupabaseEnabled } from '../services/supabase';

// One-time migration: merge any payments/donations stored in their own keys
// into ver_transactions so history and totals are complete after the refactor.
function migrateStorage() {
  const txs = storage.getTransactions();
  const txIds = new Set(txs.map((t) => t.id));
  const extras = [];

  storage.getPayments().forEach((p) => {
    if (!txIds.has(p.id)) {
      extras.push({ ...p, type: p.type || 'payment', name: p.name || p.memberName || 'Membro' });
    }
  });
  storage.getDonations().forEach((d) => {
    if (!txIds.has(d.id)) {
      extras.push({ ...d, type: d.type || 'donation', name: d.name || d.donorName || (d.anon ? 'Anônimo' : 'Doador') });
    }
  });

  if (extras.length > 0) {
    const merged = [...extras, ...txs];
    storage.saveTransactions(merged);
    return merged;
  }
  return txs;
}

export function useStore() {
  // Inicia vazio se Supabase está ativo — dados virão do banco, não do cache local
  const [transactions, setTransactionsRaw] = useState(() =>
    isSupabaseEnabled ? [] : migrateStorage()
  );
  const [members, setMembersRaw] = useState(() =>
    isSupabaseEnabled ? [] : storage.getMembers()
  );
  const [donations, setDonationsRaw] = useState(() => storage.getDonations());
  const [payments, setPaymentsRaw] = useState(() => storage.getPayments());
  const [pending, setPendingRaw] = useState(() => storage.getPending());

  // ── Carrega dados do Supabase ao montar (se configurado) ─────────────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const load = () => {
      fetchTransactions().then((data) => {
        if (data && data.length >= 0) setTransactionsRaw(data);
      });
      fetchMembers().then((data) => {
        if (data && data.length >= 0) setMembersRaw(data);
      });
    };

    load(); // carrega ao montar

    // Polling a cada 30s — garante sincronia mesmo sem Realtime ativo
    const interval = setInterval(load, 30000);

    // Recarrega quando a janela volta ao foco (usuário troca de aba e volta)
    window.addEventListener('focus', load);
    // Recarrega quando volta a ficar online
    window.addEventListener('online', load);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', load);
      window.removeEventListener('online', load);
    };
  }, []);

  // ── Realtime: atualiza a lista quando outro usuário insere algo ──────────
  useEffect(() => {
    if (!isSupabaseEnabled) return;

    const unsubscribe = subscribeTransactions((payload) => {
      if (payload.eventType === 'INSERT') {
        const novo = payload.new;
        setTransactionsRaw((prev) => {
          if (prev.some((t) => t.id === novo.id)) return prev;
          const updated = [{ ...novo, createdAt: novo.created_at }, ...prev];
          storage.saveTransactions(updated);
          return updated;
        });
      }
      if (payload.eventType === 'UPDATE') {
        setTransactionsRaw((prev) => {
          const updated = prev.map((t) => t.id === payload.new.id ? { ...payload.new, createdAt: payload.new.created_at } : t);
          storage.saveTransactions(updated);
          return updated;
        });
      }
      if (payload.eventType === 'DELETE') {
        setTransactionsRaw((prev) => {
          const updated = prev.filter((t) => t.id !== payload.old.id);
          storage.saveTransactions(updated);
          return updated;
        });
      }
    });

    return unsubscribe;
  }, []);

  // ── persist on change ──
  const setTransactions = useCallback((fn) => {
    setTransactionsRaw((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      storage.saveTransactions(next);
      return next;
    });
  }, []);

  const setMembers = useCallback((fn) => {
    setMembersRaw((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      storage.saveMembers(next);
      return next;
    });
  }, []);

  const setDonations = useCallback((fn) => {
    setDonationsRaw((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      storage.saveDonations(next);
      return next;
    });
  }, []);

  const setPayments = useCallback((fn) => {
    setPaymentsRaw((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      storage.savePayments(next);
      return next;
    });
  }, []);

  const setPending = useCallback((fn) => {
    setPendingRaw((prev) => {
      const next = typeof fn === 'function' ? fn(prev) : fn;
      storage.savePending(next);
      return next;
    });
  }, []);

  // ── derived totals ──
  // All payments + donations land directly in `transactions` now.
  // expenses are also in transactions with type:'expense'.
  const totals = useMemo(() => {
    const inVal = transactions
      .filter((t) => t.type === 'payment' || t.type === 'donation' || t.type === 'income')
      .reduce((a, b) => a + Number(b.value), 0);
    const outVal = transactions
      .filter((t) => t.type === 'expense')
      .reduce((a, b) => a + Number(b.value), 0);
    const donVal = transactions
      .filter((t) => t.type === 'donation')
      .reduce((a, b) => a + Number(b.value), 0);
    return {
      in: inVal,
      out: outVal,
      balance: inVal - outVal,
      donations: donVal,
    };
  }, [transactions]);

  const categoryBreakdown = useMemo(() => {
    const map = {};
    transactions.filter((t) => t.type === 'expense').forEach((t) => {
      const cat = t.category || 'Outros';
      map[cat] = (map[cat] || 0) + Number(t.value);
    });
    return map;
  }, [transactions]);

  const memberStats = useMemo(() => {
    const map = {};
    // Count from both income transactions and direct payments
    const incomeTxs = transactions.filter((t) => t.type === 'income' || t.type === 'payment');
    incomeTxs.forEach((t) => {
      const name = t.name || t.memberName || 'Desconhecido';
      if (!map[name]) map[name] = { name, total: 0, count: 0, lastDate: t.date };
      map[name].total += Number(t.value);
      map[name].count += 1;
      if (t.date > map[name].lastDate) map[name].lastDate = t.date;
    });
    return Object.values(map).sort((a, b) => b.total - a.total);
  }, [transactions]);

  // ── actions ──
  const addTransaction = useCallback(async (tx) => {
    const localId = genId();
    const full = {
      ...tx,
      id: localId,
      synced: false,
      createdAt: new Date().toISOString(),
    };
    // Otimista: adiciona na UI imediatamente com ID local
    setTransactions((prev) => [full, ...prev]);
    if (!navigator.onLine) {
      setPending((prev) => [...prev, full]);
      return full;
    }
    // Persiste no Supabase e substitui o item local pelo retornado (UUID real)
    try {
      const saved = await insertTransaction(full);
      if (saved && saved.id && saved.id !== localId) {
        setTransactions((prev) => prev.map((t) => t.id === localId ? { ...saved, synced: true } : t));
      }
    } catch {
      setPending((prev) => [...prev, { ...full, synced: false }]);
    }
    return full;
  }, [setTransactions, setPending]);

  const addDonation = useCallback(async (don) => {
    const localId = genId();
    const full = {
      ...don,
      id: localId,
      type: 'donation',
      synced: false,
      name: don.name || don.donorName || (don.anon ? 'Anônimo' : 'Doador'),
      createdAt: new Date().toISOString(),
    };
    setDonations((prev) => [full, ...prev]);
    setTransactions((prev) => [full, ...prev]);
    if (!navigator.onLine) {
      setPending((prev) => [...prev, full]);
      return full;
    }
    try {
      const saved = await insertTransaction(full);
      if (saved && saved.id && saved.id !== localId) {
        setTransactions((prev) => prev.map((t) => t.id === localId ? { ...saved, synced: true } : t));
      }
    } catch {
      setPending((prev) => [...prev, { ...full, synced: false }]);
    }
    return full;
  }, [setDonations, setTransactions, setPending]);

  const addPayment = useCallback(async (pay) => {
    const localId = genId();
    const full = {
      ...pay,
      id: localId,
      type: 'payment',
      status: 'confirmed',
      synced: false,
      createdAt: new Date().toISOString(),
      name: pay.name || pay.memberName || 'Membro',
    };
    setPayments((prev) => [full, ...prev]);
    setTransactions((prev) => [full, ...prev]);
    if (!navigator.onLine) {
      setPending((prev) => [...prev, full]);
      return full;
    }
    try {
      const saved = await insertTransaction(full);
      if (saved && saved.id && saved.id !== localId) {
        setTransactions((prev) => prev.map((t) => t.id === localId ? { ...saved, synced: true } : t));
      }
    } catch {
      setPending((prev) => [...prev, { ...full, synced: false }]);
    }
    return full;
  }, [setPayments, setTransactions, setPending]);

  const addMember = useCallback(async (member) => {
    const full = { ...member, id: genId(), joinedAt: new Date().toISOString(), status: 'active' };
    setMembers((prev) => [full, ...prev]);
    if (isSupabaseEnabled) {
      dbInsertMember(full).catch((e) => console.error('[DB] addMember:', e));
    }
    return full;
  }, [setMembers]);

  const clearAll = useCallback(() => {
    setTransactions([]);
    setMembers([]);
    setDonations([]);
    setPayments([]);
    setPending([]);
    storage.clearAll();
  }, [setTransactions, setMembers, setDonations, setPayments, setPending]);

  return {
    transactions, members, donations, payments, pending,
    totals, categoryBreakdown, memberStats,
    addTransaction, addDonation, addPayment, addMember,
    setTransactions, setMembers, setPending, clearAll,
  };
}
