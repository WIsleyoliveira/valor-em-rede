import { useState, useEffect, useRef } from 'react';
import { Lock, User, LogIn, Building2, UserPlus, Eye, EyeOff, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { signIn, signUp, checkEmailExists } from '../services/dbService';
import { isSupabaseEnabled } from '../services/supabase';

const DEMO_USERS = [
  { email: 'membro@valorem.rede', password: '123456', role: 'member', name: 'Maria Silva' },
  { email: 'gestor@valorem.rede', password: '123456', role: 'manager', name: 'Carlos Gestor' },
];

// ── Validações ────────────────────────────────────────────────────────────────
const isValidEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

function getPasswordStrength(pwd) {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 6)  score++;
  if (pwd.length >= 10) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  if (score <= 1) return { score, label: 'Muito fraca', color: '#ef4444' };
  if (score === 2) return { score, label: 'Fraca',       color: '#f59e0b' };
  if (score === 3) return { score, label: 'Média',       color: '#eab308' };
  if (score === 4) return { score, label: 'Forte',       color: '#22c55e' };
  return               { score,   label: 'Muito forte',  color: '#10b981' };
}

// Bloqueia após 5 tentativas falhas por 2 minutos
const ATTEMPTS_KEY = 'ver_login_attempts';
function getAttempts() {
  try { return JSON.parse(localStorage.getItem(ATTEMPTS_KEY) || '{"count":0,"until":0}'); }
  catch { return { count: 0, until: 0 }; }
}
function recordFailedAttempt() {
  const a = getAttempts();
  const count = a.count + 1;
  const until = count >= 5 ? Date.now() + 2 * 60 * 1000 : a.until;
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify({ count, until }));
  return { count, until };
}
function clearAttempts() {
  localStorage.removeItem(ATTEMPTS_KEY);
}
function isBlocked() {
  const a = getAttempts();
  return a.until > Date.now();
}
function blockSecondsLeft() {
  const a = getAttempts();
  return Math.ceil((a.until - Date.now()) / 1000);
}

// ─────────────────────────────────────────────────────────────────────────────
export default function LoginScreen({ onLogin }) {
  const [mode, setMode]             = useState('login');
  const [email, setEmail]           = useState('');
  const [password, setPassword]     = useState('');
  const [showPwd, setShowPwd]       = useState(false);
  const [name, setName]             = useState('');
  const [error, setError]           = useState('');
  const [loading, setLoading]       = useState(false);

  // Estados de validação em tempo real
  const [emailStatus, setEmailStatus] = useState(null); // null | 'checking' | 'ok' | 'invalid' | 'taken'
  const [pwdStrength, setPwdStrength] = useState(null);
  const [blocked, setBlocked]         = useState(isBlocked());
  const [countdown, setCountdown]     = useState(0);
  const emailTimer = useRef(null);

  // Countdown do bloqueio
  useEffect(() => {
    if (!blocked) return;
    const tick = () => {
      const secs = blockSecondsLeft();
      if (secs <= 0) { setBlocked(false); clearAttempts(); }
      else setCountdown(secs);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [blocked]);

  // Validação de e-mail com debounce (500ms)
  useEffect(() => {
    clearTimeout(emailTimer.current);
    if (!email) { setEmailStatus(null); return; }
    if (!isValidEmail(email)) { setEmailStatus('invalid'); return; }

    if (mode === 'register' && isSupabaseEnabled) {
      setEmailStatus('checking');
      emailTimer.current = setTimeout(async () => {
        const taken = await checkEmailExists(email);
        setEmailStatus(taken ? 'taken' : 'ok');
      }, 500);
    } else {
      setEmailStatus('ok');
    }
    return () => clearTimeout(emailTimer.current);
  }, [email, mode]);

  // Força da senha em tempo real
  useEffect(() => {
    if (mode === 'register') setPwdStrength(getPasswordStrength(password));
    else setPwdStrength(null);
  }, [password, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (blocked) return;
    if (!email.trim() || !password) { setError('Preencha e-mail e senha.'); return; }
    if (!isValidEmail(email))        { setError('E-mail inválido.'); return; }
    if (mode === 'register') {
      if (!name.trim())              { setError('Informe seu nome.'); return; }
      if (password.length < 6)       { setError('A senha deve ter no mínimo 6 caracteres.'); return; }
      if (emailStatus === 'taken')   { setError('Este e-mail já está cadastrado. Faça login.'); return; }
    }

    setLoading(true);
    try {
      if (!isSupabaseEnabled) {
        await new Promise((r) => setTimeout(r, 500));
        onLogin({ name: name.trim() || email.split('@')[0], email: email.trim(), role: 'member' });
        return;
      }

      if (mode === 'login') {
        const { user, error: err } = await signIn(email.trim(), password);
        if (err) {
          const { until } = recordFailedAttempt();
          if (until > Date.now()) { setBlocked(true); }
          setError(err);
          return;
        }
        clearAttempts();
        onLogin(user);
      } else {
        const { user, error: err } = await signUp(name.trim(), email.trim(), password);
        if (err === 'EMAIL_JA_CADASTRADO') {
          setEmailStatus('taken');
          setError('Este e-mail já está cadastrado. Faça login.');
          return;
        }
        if (err === 'CONFIRMAR_EMAIL') {
          setError('✉️ Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.');
          setMode('login');
          return;
        }
        if (err) { setError(err); return; }
        if (!user) {
          setError('Cadastro realizado! Faça login para continuar.');
          setMode('login');
          return;
        }
        onLogin(user);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (type) => {
    const u = DEMO_USERS.find((u) => u.role === type);
    if (u) { setEmail(u.email); setPassword(u.password); setName(u.name); }
  };

  // ── UI helpers ──────────────────────────────────────────────────────────────
  const EmailIcon = () => {
    if (!email) return <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />;
    if (emailStatus === 'checking') return <Loader2 size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', animation: 'spin 1s linear infinite' }} />;
    if (emailStatus === 'ok')      return <CheckCircle2 size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#22c55e' }} />;
    if (emailStatus === 'taken')   return <XCircle size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#ef4444' }} />;
    if (emailStatus === 'invalid') return <AlertCircle size={14} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: '#f59e0b' }} />;
    return null;
  };

  const emailBorder = {
    ok:      '2px solid #22c55e',
    taken:   '2px solid #ef4444',
    invalid: '2px solid #f59e0b',
    checking: '2px solid #94a3b8',
  }[emailStatus] || '1px solid var(--border)';

  return (
    <div className="login-bg">
      <div className="login-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 56, height: 56, borderRadius: '50%', background: 'var(--primary)', marginBottom: '0.75rem' }}>
            <Building2 size={28} color="#fff" />
          </div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>Valor em Rede</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', marginTop: '0.25rem' }}>Gestão financeira comunitária</p>
        </div>

        {/* Tabs Entrar / Cadastrar */}
        <div style={{ display: 'flex', background: 'var(--surface-alt, #f1f5f9)', borderRadius: 10, padding: 3, marginBottom: '1.25rem' }}>
          {[{ v: 'login', label: 'Entrar' }, { v: 'register', label: 'Cadastrar' }].map(({ v, label }) => (
            <button key={v} type="button"
              onClick={() => { setMode(v); setError(''); setEmailStatus(null); }}
              style={{ flex: 1, padding: '0.45rem', borderRadius: 8, border: 'none', fontWeight: mode === v ? 700 : 400, background: mode === v ? '#fff' : 'transparent', color: mode === v ? 'var(--primary)' : 'var(--text-muted)', boxShadow: mode === v ? '0 1px 4px rgba(0,0,0,0.10)' : 'none', cursor: 'pointer', fontSize: '0.875rem', transition: 'all 0.15s' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Bloqueio por tentativas */}
        {blocked && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '0.75rem', marginBottom: '1rem', textAlign: 'center' }}>
            <p style={{ color: '#dc2626', fontWeight: 700, margin: 0, fontSize: '0.875rem' }}>🔒 Acesso bloqueado temporariamente</p>
            <p style={{ color: '#ef4444', margin: '0.25rem 0 0', fontSize: '0.8rem' }}>Muitas tentativas incorretas. Aguarde {countdown}s.</p>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Nome — só no cadastro */}
          {mode === 'register' && (
            <div>
              <label className="form-label">Nome completo</label>
              <div style={{ position: 'relative' }}>
                <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input className="form-input" style={{ paddingLeft: 36 }} type="text" placeholder="Seu nome completo" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
            </div>
          )}

          {/* E-mail com validação em tempo real */}
          <div>
            <label className="form-label">E-mail</label>
            <div style={{ position: 'relative' }}>
              <User size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 36, paddingRight: 36, border: emailBorder, transition: 'border 0.2s' }}
                type="email"
                placeholder="seu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete={mode === 'login' ? 'email' : 'off'}
              />
              <EmailIcon />
            </div>
            {emailStatus === 'taken' && (
              <p style={{ fontSize: '0.75rem', color: '#ef4444', margin: '0.25rem 0 0 0' }}>
                E-mail já cadastrado. <button type="button" onClick={() => { setMode('login'); setError(''); }} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, padding: 0 }}>Fazer login</button>
              </p>
            )}
            {emailStatus === 'ok' && mode === 'register' && (
              <p style={{ fontSize: '0.75rem', color: '#22c55e', margin: '0.25rem 0 0 0' }}>✓ E-mail disponível</p>
            )}
          </div>

          {/* Senha com força e olho */}
          <div>
            <label className="form-label">Senha</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                style={{ paddingLeft: 36, paddingRight: 40 }}
                type={showPwd ? 'text' : 'password'}
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              />
              <button type="button" onClick={() => setShowPwd((v) => !v)}
                style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 2 }}>
                {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>

            {/* Barra de força da senha */}
            {mode === 'register' && password && pwdStrength && (
              <div style={{ marginTop: '0.4rem' }}>
                <div style={{ display: 'flex', gap: 3, marginBottom: 3 }}>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} style={{ flex: 1, height: 3, borderRadius: 99, background: i <= pwdStrength.score ? pwdStrength.color : '#e2e8f0', transition: 'background 0.2s' }} />
                  ))}
                </div>
                <p style={{ fontSize: '0.72rem', color: pwdStrength.color, margin: 0, fontWeight: 600 }}>{pwdStrength.label}</p>
              </div>
            )}
          </div>

          {/* Mensagem de erro */}
          {error && (
            <p style={{ color: error.startsWith('✉️') ? '#059669' : '#dc2626', fontSize: '0.85rem', margin: 0, padding: '0.5rem 0.75rem', background: error.startsWith('✉️') ? '#d1fae5' : '#fef2f2', borderRadius: 8, borderLeft: `3px solid ${error.startsWith('✉️') ? '#059669' : '#dc2626'}` }}>
              {error}
            </p>
          )}

          {/* Botão principal */}
          <button className="btn btn-primary" type="submit"
            disabled={loading || blocked || (mode === 'register' && emailStatus === 'taken')}
            style={{ width: '100%', justifyContent: 'center', gap: '0.5rem', display: 'flex', alignItems: 'center', opacity: (blocked || (mode === 'register' && emailStatus === 'taken')) ? 0.6 : 1 }}>
            {loading
              ? <Loader2 size={17} style={{ animation: 'spin 1s linear infinite' }} />
              : mode === 'login' ? <LogIn size={17} /> : <UserPlus size={17} />}
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {/* Botões demo — só sem Supabase */}
        {!isSupabaseEnabled && (
          <div style={{ marginTop: '1.25rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
            <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', marginBottom: '0.5rem' }}>Modo demo:</p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => fillDemo('member')}>Membro demo</button>
              <button className="btn btn-secondary" style={{ flex: 1, fontSize: '0.75rem' }} onClick={() => fillDemo('manager')}>Gestor demo</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
