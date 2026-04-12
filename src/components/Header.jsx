import { Wifi, WifiOff, LogOut, Building2, RefreshCw, CloudOff } from 'lucide-react';

export default function Header({ user, ollamaStatus, onLogout, isOnline, pendingCount, syncing, onSyncNow }) {
  return (
    <header className="topbar">
      {/* Left — logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Building2 size={20} color="var(--primary)" />
          <span style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-primary)' }}>Valor em Rede</span>
        </div>
      </div>

      {/* Right — status chips + user */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>

        {/* Offline / pending badge */}
        {!isOnline ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: '#fef3c7', border: '1px solid #fcd34d', fontSize: '0.72rem', fontWeight: 700, color: '#92400e' }}>
            <CloudOff size={13} />
            <span className="hide-mobile">Offline</span>
            {pendingCount > 0 && (
              <span style={{ background: '#f59e0b', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.65rem', marginLeft: 2 }}>
                {pendingCount}
              </span>
            )}
          </div>
        ) : pendingCount > 0 ? (
          <button
            onClick={onSyncNow}
            disabled={syncing}
            style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 9px', borderRadius: 99, background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.72rem', fontWeight: 700, color: '#1e40af', cursor: 'pointer' }}
          >
            <RefreshCw size={12} style={syncing ? { animation: 'spin 1s linear infinite' } : {}} />
            <span className="hide-mobile">{syncing ? 'Sincronizando...' : `Sincronizar (${pendingCount})`}</span>
            {!syncing && <span style={{ background: '#3b82f6', color: '#fff', borderRadius: 99, padding: '1px 6px', fontSize: '0.65rem' }}>{pendingCount}</span>}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <Wifi size={15} color="#059669" />
            <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 500 }} className="hide-mobile">Online</span>
          </div>
        )}

        {/* IA status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }} className="hide-mobile">
          {ollamaStatus?.online
            ? <><Wifi size={13} color="#3b82f6" /><span style={{ fontSize: '0.72rem', color: '#3b82f6', fontWeight: 500 }}>IA</span></>
            : <><WifiOff size={13} color="#9ca3af" /><span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>IA off</span></>
          }
        </div>

        {/* User avatar + name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: '0.8rem' }}>
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="hide-mobile" style={{ lineHeight: 1.2 }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{user?.role === 'manager' ? 'Gestor' : 'Membro'}</div>
          </div>
        </div>

        {/* Logout */}
        <button className="btn btn-ghost" style={{ padding: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }} onClick={onLogout}>
          <LogOut size={16} />
          <span className="hide-mobile" style={{ fontSize: '0.8rem' }}>Sair</span>
        </button>
      </div>
    </header>
  );
}
