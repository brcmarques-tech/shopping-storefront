'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@apollo/client';
import { LogOut, Package, ChevronLeft, User } from 'lucide-react';
import { ME_APP, MY_ORDERS } from '@/lib/graphql';
import { estaLogado, sair } from '@/lib/sessao';
import { AuthModal } from '@/components/AuthModal';
import { EVENTO_SESSAO } from '@/components/BotaoDaConta';
import { ExcluirConta } from '@/components/ExcluirConta';
import { STATUS_PEDIDO as STATUS, formatarReais } from '@/lib/statusPedido';

const POR_PAGINA = 20;

/**
 * Minha conta: perfil e pedidos.
 *
 * A loja web não tinha página de conta — a pessoa entrava pelo checkout e não
 * tinha onde ver os próprios dados nem acompanhar o pedido feito. Sem sessão,
 * a página convida a entrar em vez de mandar para outro lugar.
 */

export default function ContaPage() {
  const [logado, setLogado] = useState<boolean | null>(null);
  const [loginAberto, setLoginAberto] = useState(false);

  useEffect(() => {
    const atualizar = () => setLogado(estaLogado());
    atualizar();
    window.addEventListener(EVENTO_SESSAO, atualizar);
    return () => window.removeEventListener(EVENTO_SESSAO, atualizar);
  }, []);

  const { data: perfil, loading: carregandoPerfil } = useQuery(ME_APP, {
    skip: !logado,
    fetchPolicy: 'network-only',
  });
  const [temMais, setTemMais] = useState(true);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const { data: pedidos, loading: carregandoPedidos, fetchMore } = useQuery(MY_ORDERS, {
    variables: { limit: POR_PAGINA, offset: 0 },
    onCompleted: (d) => setTemMais((d?.myOrders?.length || 0) >= POR_PAGINA),
    skip: !logado,
    fetchPolicy: 'network-only',
  });

  async function handleSair() {
    await sair();
    window.dispatchEvent(new Event(EVENTO_SESSAO));
    window.location.assign('/');
  }

  async function verMais() {
    setCarregandoMais(true);
    try {
      const { data } = await fetchMore({
        variables: { offset: lista.length, limit: POR_PAGINA },
        updateQuery: (anterior: any, { fetchMoreResult }: any) => {
          if (!fetchMoreResult) return anterior;
          const vistos = new Set(anterior.myOrders.map((o: any) => o.id));
          return { myOrders: [...anterior.myOrders, ...fetchMoreResult.myOrders.filter((o: any) => !vistos.has(o.id))] };
        },
      });
      setTemMais((data?.myOrders?.length || 0) >= POR_PAGINA);
    } finally {
      setCarregandoMais(false);
    }
  }

  const usuario = perfil?.meApp;
  const lista: any[] = pedidos?.myOrders || [];

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/" className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ChevronLeft size={18} /> Lojas
          </a>
          <div className="flex items-center gap-2 ml-2">
            <Image src="/logo.png" alt="BCM Shopping" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-[var(--text-primary)]">Minha conta</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {logado === null ? null : !logado ? (
          <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-[var(--brand-primary)]/10 text-[var(--brand-primary)] flex items-center justify-center mx-auto mb-4">
              <User size={26} />
            </div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] mb-1">Entre na sua conta</h1>
            <p className="text-sm text-[var(--text-secondary)] mb-5">
              Veja seus dados e acompanhe seus pedidos. Para olhar as lojas não precisa entrar.
            </p>
            <button
              onClick={() => setLoginAberto(true)}
              className="px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold"
            >
              Entrar ou criar conta
            </button>
          </div>
        ) : (
          <>
            <section className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6">
              {carregandoPerfil && !usuario ? (
                <p className="text-sm text-[var(--text-secondary)]">Carregando...</p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-full bg-[var(--brand-primary)] text-white text-xl font-bold flex items-center justify-center">
                    {(usuario?.name || '?').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-[var(--text-primary)] truncate">{usuario?.name}</p>
                    <p className="text-sm text-[var(--text-secondary)] truncate">{usuario?.email}</p>
                    {usuario?.phone && <p className="text-sm text-[var(--text-secondary)]">{usuario.phone}</p>}
                  </div>
                  <button
                    onClick={handleSair}
                    className="flex items-center gap-1.5 text-sm text-[var(--status-error-text)] hover:underline"
                  >
                    <LogOut size={16} /> Sair
                  </button>
                </div>
              )}
            </section>

            <section>
              <h2 className="font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
                <Package size={18} /> Meus pedidos
              </h2>
              {carregandoPedidos && lista.length === 0 ? (
                <p className="text-sm text-[var(--text-secondary)]">Carregando...</p>
              ) : lista.length === 0 ? (
                <div className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-6 text-center text-sm text-[var(--text-secondary)]">
                  Você ainda não fez nenhum pedido.{' '}
                  <a href="/" className="text-[var(--brand-primary)] font-semibold hover:underline">Ver lojas</a>
                </div>
              ) : (
                <ul className="space-y-3">
                  {lista.map((p) => {
                    const st = STATUS[p.status] || { texto: p.status, cor: 'bg-gray-100 text-gray-700' };
                    return (
                      <li key={p.id}>
                        <a href={`/conta/pedido/${p.id}`} className="bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-4 flex items-center gap-4 hover:border-[var(--brand-primary)]">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-[var(--text-primary)] truncate">{p.store?.name}</p>
                          <p className="text-xs text-[var(--text-muted)]">
                            #{p.orderNumber} · {new Date(p.createdAt).toLocaleDateString('pt-BR')}
                          </p>
                        </div>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.cor}`}>{st.texto}</span>
                        <span className="font-bold text-[var(--text-primary)] w-24 text-right">{formatarReais(p.total)}</span>
                        </a>
                      </li>
                    );
                  })}
                </ul>
              )}
              {lista.length > 0 && temMais && (
                <button
                  onClick={verMais}
                  disabled={carregandoMais}
                  className="mt-3 w-full py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-primary)] hover:border-[var(--brand-primary)] disabled:opacity-60"
                >
                  {carregandoMais ? 'Carregando...' : 'Ver mais pedidos'}
                </button>
              )}
            </section>

            <ExcluirConta />
          </>
        )}
      </main>

      <AuthModal
        open={loginAberto}
        onClose={() => setLoginAberto(false)}
        onSuccess={() => {
          setLoginAberto(false);
          setLogado(true);
        }}
      />
    </div>
  );
}
