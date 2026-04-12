// ─── src/hooks/useSync.js ─────────────────────────────────────────────────────
// Gerencia sincronização híbrida e notificações locais (Web Notifications API)
// ─────────────────────────────────────────────────────────────────────────────
import { useState, useEffect, useCallback, useRef } from 'react';
import { storage } from '../services/storageService';
import { syncPendingTransactions } from '../services/dbService';
import { isSupabaseEnabled } from '../services/supabase';

// ── Web Notifications ─────────────────────────────────────────────────────────
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  const result = await Notification.requestPermission();
  return result;
}

export function sendLocalNotification(title, body, icon = '/favicon.ico') {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, icon, tag: 'valor-em-rede', silent: false });
  } catch (_) {}
}

// ── useSync hook ──────────────────────────────────────────────────────────────
export function useSync(pending, setPending, setTransactions) {
  const [isOnline, setIsOnline]   = useState(() => navigator.onLine);
  const [syncing, setSyncing]     = useState(false);
  const [lastSync, setLastSync]   = useState(() => {
    try { return localStorage.getItem('ver_last_sync') || null; } catch { return null; }
  });
  const [toast, setToast]         = useState(null); // { msg, type: 'success'|'info'|'error' }
  const syncedRef                 = useRef(false);

  // ── Show toast ──────────────────────────────────────────────────────────────
  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ── Sync pending to Supabase (or simulate if not configured) ──────────────
  const syncPending = useCallback(async () => {
    if (syncing || pending.length === 0) return;
    setSyncing(true);
    try {
      if (isSupabaseEnabled) {
        // Envia pendentes para o Supabase de verdade
        await syncPendingTransactions(pending);
      } else {
        // Sem Supabase: simula delay de rede
        await new Promise((r) => setTimeout(r, 900));
      }

      // Marca como sincronizados na UI
      setTransactions((prev) =>
        prev.map((t) =>
          pending.some((p) => p.id === t.id) ? { ...t, synced: true } : t
        )
      );

      setPending([]);
      storage.savePending([]);

      const now = new Date().toISOString();
      setLastSync(now);
      localStorage.setItem('ver_last_sync', now);

      showToast(`${pending.length} registro(s) sincronizado(s) com sucesso`, 'success');
      sendLocalNotification(
        'Valor em Rede — Sincronizado ✓',
        `${pending.length} registro(s) enviado(s) ao servidor.`
      );
    } catch (err) {
      console.error('[Sync]', err);
      showToast('Erro na sincronização. Tentando novamente...', 'error');
    } finally {
      setSyncing(false);
    }
  }, [syncing, pending, setTransactions, setPending, showToast]);

  // ── Listen to online/offline events ────────────────────────────────────────
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncedRef.current = false; // reset so we sync when back online
    };
    const handleOffline = () => {
      setIsOnline(false);
      showToast('Você está offline. Os dados serão sincronizados quando a internet voltar.', 'info');
      sendLocalNotification(
        'Valor em Rede — Offline',
        'Você está sem internet. Os registros serão sincronizados automaticamente.'
      );
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [showToast]);

  // ── Auto-sync when coming back online ──────────────────────────────────────
  useEffect(() => {
    if (isOnline && pending.length > 0 && !syncedRef.current) {
      syncedRef.current = true;
      syncPending();
    }
  }, [isOnline, pending.length, syncPending]);

  return { isOnline, syncing, lastSync, toast, showToast, syncPending };
}
