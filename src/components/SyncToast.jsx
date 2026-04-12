// ─── src/components/SyncToast.jsx ────────────────────────────────────────────
import { CheckCircle, WifiOff, AlertCircle, RefreshCw, X } from 'lucide-react';

const CONFIGS = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', color: '#065f46', Icon: CheckCircle,  iconColor: '#059669' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', color: '#1e40af', Icon: WifiOff,       iconColor: '#3b82f6' },
  error:   { bg: '#fef2f2', border: '#fecaca', color: '#991b1b', Icon: AlertCircle,   iconColor: '#ef4444' },
  syncing: { bg: '#fffbeb', border: '#fde68a', color: '#92400e', Icon: RefreshCw,     iconColor: '#f59e0b' },
};

export default function SyncToast({ toast, onClose }) {
  if (!toast) return null;
  const cfg = CONFIGS[toast.type] || CONFIGS.info;
  const { Icon } = cfg;

  return (
    <div style={{
      position: 'fixed',
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 80px)',
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 999,
      minWidth: 260,
      maxWidth: 'calc(100vw - 32px)',
      background: cfg.bg,
      border: `1px solid ${cfg.border}`,
      borderRadius: 12,
      padding: '12px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 10,
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      animation: 'toast-in 0.3s ease',
    }}>
      <Icon size={17} color={cfg.iconColor}
        style={toast.type === 'syncing' ? { animation: 'spin 1s linear infinite' } : {}} />
      <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: cfg.color, lineHeight: 1.4 }}>
        {toast.msg}
      </span>
      <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: cfg.color, padding: 2, display: 'flex' }}>
        <X size={14} />
      </button>

      <style>{`
        @keyframes toast-in {
          from { opacity: 0; transform: translateX(-50%) translateY(12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
