'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { User } from 'lucide-react';
import { AuthModal } from './AuthModal';
import { estaLogado } from '@/lib/sessao';

/**
 * Acesso à conta, sempre visível no topo.
 *
 * Antes a loja web não tinha onde entrar nem ver o perfil: o login só aparecia
 * no meio do checkout. Navegar continua livre — quem não entrou vê as lojas e
 * os produtos normalmente; o login é exigido só para comprar.
 *
 * Sem sessão: "Entrar", que abre o mesmo modal de login/cadastro do checkout.
 * Com sessão: o primeiro nome, levando para /conta (perfil e pedidos).
 *
 * O estado só é lido depois de montar: o servidor não vê o cookie legível nem
 * o localStorage, e decidir no render daria diferença de hidratação.
 */
export const EVENTO_SESSAO = 'bcm-sessao';

function lerConta(): { logado: boolean; nome: string | null } {
  const logado = estaLogado();
  let nome: string | null = null;
  if (logado) {
    try {
      nome = JSON.parse(localStorage.getItem('user') || 'null')?.name || null;
    } catch {
      nome = null;
    }
  }
  return { logado, nome };
}

export function BotaoDaConta() {
  const [conta, setConta] = useState<{ logado: boolean; nome: string | null } | null>(null);
  const [loginAberto, setLoginAberto] = useState(false);

  useEffect(() => {
    const atualizar = () => setConta(lerConta());
    atualizar();
    // Login/cadastro feito no checkout, ou "Sair" na /conta, atualizam o topo
    // sem recarregar a página.
    window.addEventListener(EVENTO_SESSAO, atualizar);
    window.addEventListener('focus', atualizar);
    return () => {
      window.removeEventListener(EVENTO_SESSAO, atualizar);
      window.removeEventListener('focus', atualizar);
    };
  }, []);

  // Reserva o espaço antes de saber o estado, para o topo não "pular".
  if (!conta) return <div className="h-9 w-24" aria-hidden />;

  if (conta.logado) {
    const primeiroNome = (conta.nome || 'Minha conta').split(' ')[0];
    return (
      <a
        href="/conta"
        className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-full border border-[var(--border-color)] bg-[var(--bg-card)] hover:bg-[var(--bg-page)] transition-colors"
      >
        <span className="w-7 h-7 rounded-full bg-[var(--brand-primary)] text-white text-xs font-bold flex items-center justify-center">
          {primeiroNome.charAt(0).toUpperCase()}
        </span>
        <span className="text-sm font-medium text-[var(--text-primary)] max-w-[9rem] truncate">
          {primeiroNome}
        </span>
      </a>
    );
  }

  return (
    <>
      <button
        onClick={() => setLoginAberto(true)}
        className="flex items-center gap-2 h-9 px-4 rounded-full bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white text-sm font-semibold transition-colors"
      >
        <User size={16} />
        Entrar
      </button>
      {/* Fora do <header>: ele é sticky com z-index, e o modal desenhado lá
          dentro ficava preso na camada do topo. */}
      {createPortal(
        <AuthModal
          open={loginAberto}
          onClose={() => setLoginAberto(false)}
          onSuccess={() => {
            setLoginAberto(false);
            window.dispatchEvent(new Event(EVENTO_SESSAO));
          }}
        />,
        document.body,
      )}
    </>
  );
}
