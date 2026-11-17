'use client';

import { useState } from 'react';
import { gql, useMutation } from '@apollo/client';
import { Loader2 } from 'lucide-react';

const PEDIR_LINK = gql`
  mutation RequestPasswordResetApp($email: String!) {
    requestPasswordResetApp(email: $email)
  }
`;

/**
 * "Esqueci a senha" da loja web. A API manda o link por e-mail (e WhatsApp);
 * a página de nova senha é servida pela própria API, igual ao app.
 * A resposta é sempre a mesma, exista ou não a conta (não revela e-mails).
 */
export function EsqueciASenha({ emailInicial }: { emailInicial: string }) {
  const [aberto, setAberto] = useState(false);
  const [email, setEmail] = useState(emailInicial);
  const [enviado, setEnviado] = useState('');
  const [erro, setErro] = useState('');
  const [pedir, { loading }] = useMutation(PEDIR_LINK);

  if (!aberto) {
    return (
      <button
        type="button"
        onClick={() => { setAberto(true); setEmail(emailInicial); }}
        className="w-full text-center text-sm text-[var(--brand-primary)] font-medium hover:underline"
      >
        Esqueci a senha
      </button>
    );
  }

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    setErro('');
    try {
      const { data } = await pedir({ variables: { email: email.trim() } });
      setEnviado(data?.requestPasswordResetApp || 'Se o e-mail estiver cadastrado, enviaremos um link de recuperação.');
    } catch (err: any) {
      const msg = err?.graphQLErrors?.[0]?.message || '';
      setErro(/too many|throttl/i.test(msg) ? 'Muitas tentativas. Espere um minuto e tente de novo.' : msg || 'Não consegui enviar agora. Tente de novo.');
    }
  }

  return (
    <div className="rounded-xl bg-[var(--bg-muted)] p-3 space-y-2">
      {enviado ? (
        <>
          <p className="text-sm text-[var(--text-primary)]">{enviado}</p>
          <p className="text-xs text-[var(--text-muted)]">Abra o link do e-mail para criar uma senha nova e depois entre aqui.</p>
          <button type="button" onClick={() => { setAberto(false); setEnviado(''); }} className="text-sm text-[var(--brand-primary)] font-medium hover:underline">
            Voltar
          </button>
        </>
      ) : (
        <form onSubmit={enviar} className="space-y-2">
          <p className="text-sm text-[var(--text-primary)]">Enviamos um link para você criar uma senha nova.</p>
          <input
            type="email"
            required
            placeholder="Seu e-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm"
          />
          {erro && <p className="text-xs text-[var(--status-error-text)]">{erro}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={() => setAberto(false)} className="flex-1 py-2 rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-primary)]">
              Cancelar
            </button>
            <button type="submit" disabled={loading} className="flex-1 py-2 rounded-xl bg-[var(--brand-primary)] text-white text-sm font-semibold disabled:opacity-60 flex items-center justify-center gap-2">
              {loading && <Loader2 size={14} className="animate-spin" />}
              Enviar link
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
