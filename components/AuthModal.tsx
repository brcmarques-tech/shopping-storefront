'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGIN_APP, REGISTER_APP } from '@/lib/graphql';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({
    name: '',
    email: '',
    phone: '',
    cpf: '',
    password: '',
  });

  const [loginMutation, { loading: loginLoading }] = useMutation(LOGIN_APP);
  const [registerMutation, { loading: registerLoading }] =
    useMutation(REGISTER_APP);

  const loading = loginLoading || registerLoading;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await loginMutation({
        variables: { input: loginForm },
      });
      localStorage.setItem('token', data.loginApp.accessToken);
      localStorage.setItem('user', JSON.stringify(data.loginApp.user));
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erro ao entrar');
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await registerMutation({
        variables: { input: registerForm },
      });
      localStorage.setItem('token', data.registerApp.accessToken);
      localStorage.setItem('user', JSON.stringify(data.registerApp.user));
      onSuccess();
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erro ao cadastrar');
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[var(--z-overlay)]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 30, stiffness: 400 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-[var(--bg-card)] rounded-2xl shadow-2xl z-[var(--z-modal)] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <h2 className="font-bold text-lg text-[var(--text-primary)]">
                {tab === 'login' ? 'Entrar' : 'Criar conta'}
              </h2>
              <button
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-[var(--border-color)] px-5">
              {(['login', 'register'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => { setTab(t); setError(''); }}
                  className={`pb-2 text-sm font-medium mr-6 border-b-2 transition-colors ${
                    tab === t
                      ? 'border-[var(--brand-primary)] text-[var(--brand-primary)]'
                      : 'border-transparent text-[var(--text-muted)]'
                  }`}
                >
                  {t === 'login' ? 'Entrar' : 'Cadastrar'}
                </button>
              ))}
            </div>

            <div className="px-5 py-5">
              {error && (
                <p className="text-xs text-[var(--status-error-text)] bg-[var(--status-error-bg)] px-3 py-2 rounded-lg mb-4">
                  {error}
                </p>
              )}

              {tab === 'login' ? (
                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    type="email"
                    placeholder="E-mail"
                    value={loginForm.email}
                    onChange={(e) =>
                      setLoginForm((f) => ({ ...f, email: e.target.value }))
                    }
                    className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"
                    required
                  />
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Senha"
                      value={loginForm.password}
                      onChange={(e) =>
                        setLoginForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Entrar
                  </button>
                </form>
              ) : (
                <form onSubmit={handleRegister} className="space-y-3">
                  {[
                    { key: 'name', placeholder: 'Nome completo', type: 'text' },
                    { key: 'email', placeholder: 'E-mail', type: 'email' },
                    { key: 'phone', placeholder: 'Telefone', type: 'tel' },
                    { key: 'cpf', placeholder: 'CPF', type: 'text' },
                  ].map(({ key, placeholder, type }) => (
                    <input
                      key={key}
                      type={type}
                      placeholder={placeholder}
                      value={registerForm[key as keyof typeof registerForm]}
                      onChange={(e) =>
                        setRegisterForm((f) => ({ ...f, [key]: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"
                      required
                    />
                  ))}
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      placeholder="Senha"
                      value={registerForm.password}
                      onChange={(e) =>
                        setRegisterForm((f) => ({ ...f, password: e.target.value }))
                      }
                      className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm pr-10"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
                    >
                      {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 size={16} className="animate-spin" />}
                    Criar conta
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
