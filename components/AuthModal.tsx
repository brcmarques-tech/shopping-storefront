'use client';

import { useState } from 'react';
import { X, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { LOGIN_APP, REGISTER_APP } from '@/lib/graphql';

// Falha de rede ou de servidor nao e erro do cliente. O caso que escapava: com a
// API fora, o proxy /api/graphql responde 502 e o Apollo IGNORA o corpo
// ("Servico indisponivel") — a mensagem vira "Response not successful: Received
// status code 502", em ingles, direto na tela.
const FALHA_DE_REDE = /network|failed to fetch|timeout|indispon|status code 5[0-9][0-9]|response not successful/i;
const MSG_SEM_SERVIDOR = 'Nao consegui falar com o servidor. Verifique sua conexao e tente de novo.';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AuthModal({ open, onClose, onSuccess }: Props) {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  // Sessao unica (KAN-84): o servidor recusa o login quando a conta ja esta
  // aberta em outro lugar. Isso nao e erro do cliente — e uma PERGUNTA.
  const [sessaoAtiva, setSessaoAtiva] = useState(false);

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

  const handleLogin = async (e: React.FormEvent | null, forcar = false) => {
    e?.preventDefault();
    setError('');
    if (!forcar) setSessaoAtiva(false);
    try {
      const { data } = await loginMutation({
        variables: { input: loginForm, forceLogin: forcar },
      });
      // KAN-248: o token NAO volta mais para o navegador — o proxy
      // /api/graphql o guarda num cookie httpOnly e o arranca da resposta.
      // Aqui so fica o nome do cliente, para a interface cumprimentar.
      try {
        localStorage.setItem('user', JSON.stringify(data.loginApp.user));
      } catch {}
      setSessaoAtiva(false);
      onSuccess();
    } catch (err: unknown) {
      const mensagem = (err as { message?: string })?.message || '';

      // O servidor devolve o CODIGO `ACTIVE_SESSION`. Jogar esse codigo na
      // tela (era o que acontecia) nao diz nada para quem esta comprando: a
      // pessoa le "ACTIVE_SESSION" em cima do formulario e conclui que o site
      // quebrou. Aqui vira a pergunta que ele realmente representa.
      if (mensagem.includes('ACTIVE_SESSION')) {
        setSessaoAtiva(true);
        setError('');
        return;
      }
      if (FALHA_DE_REDE.test(mensagem)) {
        setError(MSG_SEM_SERVIDOR);
        return;
      }
      setError(
        /credenc|senha|invalid|unauthorized/i.test(mensagem)
          ? 'E-mail ou senha incorretos.'
          : mensagem || 'Erro ao entrar',
      );
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await registerMutation({
        variables: { input: registerForm },
      });
      // KAN-248: idem no cadastro — a sessao vem no cookie httpOnly.
      try {
        localStorage.setItem('user', JSON.stringify(data.registerApp.user));
      } catch {}
      onSuccess();
    } catch (err: unknown) {
      const mensagem = (err as { message?: string })?.message || '';
      // As validacoes do servidor ("e-mail ja cadastrado"...) vem em portugues e
      // seguem aparecendo como estao; so a falha de rede e traduzida.
      setError(FALHA_DE_REDE.test(mensagem) ? MSG_SEM_SERVIDOR : mensagem || 'Erro ao cadastrar');
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
              {sessaoAtiva && (
                <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs text-amber-900">
                  <p className="font-semibold mb-1">Voce ja esta conectado em outro dispositivo</p>
                  <p className="mb-2">
                    Sua conta so pode estar aberta em um lugar por vez. Quer entrar aqui e
                    desconectar o outro?
                  </p>
                  <button
                    type="button"
                    onClick={() => handleLogin(null, true)}
                    disabled={loading}
                    className="w-full py-2 rounded-lg bg-amber-500 text-white font-semibold disabled:opacity-60"
                  >
                    {loading ? 'Entrando...' : 'Entrar aqui mesmo'}
                  </button>
                </div>
              )}

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
