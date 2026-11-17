'use client';

import { use, useEffect, useState } from 'react';
import Image from 'next/image';
import { gql, useMutation, useQuery } from '@apollo/client';
import { QRCodeSVG } from 'qrcode.react';
import { Check, ChevronLeft, Copy, MapPin, Store } from 'lucide-react';
import { estaLogado } from '@/lib/sessao';
import { EVENTO_SESSAO } from '@/components/BotaoDaConta';
import { AuthModal } from '@/components/AuthModal';
import { STATUS_PEDIDO, PODE_CANCELAR, formatarReais } from '@/lib/statusPedido';
import { formatWeight } from '@/lib/useCart';

const PEDIDO = gql`
  query PedidoDoCliente($id: String!) {
    order(id: $id) {
      id
      orderNumber
      status
      createdAt
      subtotal
      deliveryFee
      discount
      total
      paymentMethod
      pixQrCode
      pixQrCodeBase64
      checkoutUrl
      isPickup
      deliveryAddress
      notes
      rejectionReason
      store { id name slug }
      items {
        id
        quantity
        unitPrice
        totalPrice
        weightGrams
        notes
        product { id name }
      }
    }
  }
`;

const CANCELAR = gql`
  mutation CancelarPedido($orderId: String!) {
    cancelOrder(orderId: $orderId) { id status }
  }
`;

const PAGAMENTO: Record<string, string> = {
  PIX: 'PIX',
  CREDIT_CARD: 'Cartão de crédito',
  ON_DELIVERY: 'Na entrega / retirada',
};

/** Detalhe de um pedido do cliente: itens, valores, pagar o PIX e cancelar. */
export default function PedidoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [logado, setLogado] = useState<boolean | null>(null);
  const [loginAberto, setLoginAberto] = useState(false);
  const [confirmandoCancelar, setConfirmandoCancelar] = useState(false);
  const [erro, setErro] = useState('');
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const atualizar = () => setLogado(estaLogado());
    atualizar();
    window.addEventListener(EVENTO_SESSAO, atualizar);
    return () => window.removeEventListener(EVENTO_SESSAO, atualizar);
  }, []);

  const { data, loading, error, refetch, startPolling, stopPolling } = useQuery(PEDIDO, {
    variables: { id },
    skip: !logado,
    fetchPolicy: 'network-only',
  });
  const [cancelar, { loading: cancelando }] = useMutation(CANCELAR);
  const p = data?.order;
  // Aguardando pagamento: confere sozinho quando o PIX cai.
  const aguardando = p?.status === 'AWAITING_PAYMENT';
  useEffect(() => {
    if (!aguardando) return;
    startPolling(15000);
    return () => stopPolling();
  }, [aguardando, startPolling, stopPolling]);
  const st = p ? STATUS_PEDIDO[p.status] || { texto: p.status, cor: 'bg-gray-100 text-gray-700' } : null;

  async function confirmarCancelamento() {
    setErro('');
    try {
      await cancelar({ variables: { orderId: id } });
      setConfirmandoCancelar(false);
      refetch();
    } catch (e: any) {
      setErro(e?.graphQLErrors?.[0]?.message || e?.message || 'Não foi possível cancelar.');
      setConfirmandoCancelar(false);
    }
  }

  async function copiarPix() {
    try {
      await navigator.clipboard.writeText(p.pixQrCode);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      setErro('Não consegui copiar. Selecione o código e copie manualmente.');
    }
  }

  const cartao = 'bg-[var(--bg-card)] rounded-2xl border border-[var(--border-color)] p-5';

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <a href="/conta" className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
            <ChevronLeft size={18} /> Meus pedidos
          </a>
          <div className="flex items-center gap-2 ml-2">
            <Image src="/logo.png" alt="BCM Shopping" width={28} height={28} className="rounded-lg" />
            <span className="font-bold text-[var(--text-primary)]">{p ? `Pedido #${p.orderNumber}` : 'Pedido'}</span>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        {logado === null ? null : !logado ? (
          <div className={`${cartao} text-center`}>
            <p className="text-[var(--text-primary)] font-semibold mb-3">Entre na sua conta para ver o pedido.</p>
            <button onClick={() => setLoginAberto(true)} className="px-6 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold">
              Entrar
            </button>
          </div>
        ) : loading && !p ? (
          <p className="text-sm text-[var(--text-secondary)]">Carregando...</p>
        ) : !p ? (
          <div className={`${cartao} text-center text-sm text-[var(--text-secondary)]`}>
            {error ? 'Não encontramos este pedido na sua conta.' : 'Pedido não encontrado.'}{' '}
            <a href="/conta" className="text-[var(--brand-primary)] font-semibold hover:underline">Ver meus pedidos</a>
          </div>
        ) : (
          <>
            <section className={cartao}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="flex items-center gap-1.5 font-bold text-[var(--text-primary)]">
                    <Store size={16} />
                    <a href={`/loja/${p.store?.slug ?? p.store?.id}`} className="hover:underline truncate">{p.store?.name}</a>
                  </p>
                  <p className="text-xs text-[var(--text-muted)] mt-0.5">
                    #{p.orderNumber} · {new Date(p.createdAt).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                  </p>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ${st!.cor}`}>{st!.texto}</span>
              </div>
              {p.status === 'REJECTED' && p.rejectionReason && (
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Motivo: {p.rejectionReason}</p>
              )}
            </section>

            {p.status === 'AWAITING_PAYMENT' && p.paymentMethod === 'PIX' && p.pixQrCode && (
              <section className={`${cartao} text-center space-y-3`}>
                <p className="font-bold text-[var(--text-primary)]">Pague com PIX para a loja receber o pedido</p>
                <div className="inline-block bg-white p-3 rounded-xl">
                  <QRCodeSVG value={p.pixQrCode} size={180} />
                </div>
                <p className="text-xs text-[var(--text-muted)] break-all bg-[var(--bg-muted)] rounded-lg p-2 text-left">{p.pixQrCode}</p>
                <button
                  onClick={copiarPix}
                  className="w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold flex items-center justify-center gap-2"
                >
                  {copiado ? <><Check size={16} /> Código copiado</> : <><Copy size={16} /> Copiar código PIX</>}
                </button>
                <p className="text-xs text-[var(--text-muted)]">A página atualiza sozinha quando o pagamento for confirmado.</p>
              </section>
            )}

            {p.status === 'AWAITING_PAYMENT' && p.paymentMethod === 'CREDIT_CARD' && p.checkoutUrl && (
              <section className={`${cartao} text-center space-y-3`}>
                <p className="font-bold text-[var(--text-primary)]">Pagamento com cartão pendente</p>
                <a href={p.checkoutUrl} target="_blank" rel="noopener noreferrer" className="block w-full py-3 rounded-xl bg-[var(--brand-primary)] text-white font-semibold">
                  Pagar com cartão
                </a>
              </section>
            )}

            <section className={cartao}>
              <h2 className="font-bold text-[var(--text-primary)] mb-3">Itens</h2>
              <ul className="divide-y divide-[var(--border-color)]">
                {p.items.map((i: any) => (
                  <li key={i.id} className="py-2.5 flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="text-[var(--text-primary)]">
                        {i.weightGrams ? formatWeight(i.weightGrams) : `${i.quantity}x`} {i.product?.name}
                      </p>
                      {i.notes && <p className="text-xs text-[var(--text-muted)]">📝 {i.notes}</p>}
                    </div>
                    <span className="text-[var(--text-primary)] shrink-0">{formatarReais(i.totalPrice)}</span>
                  </li>
                ))}
              </ul>
              <dl className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-1 text-sm">
                <div className="flex justify-between text-[var(--text-secondary)]"><dt>Subtotal</dt><dd>{formatarReais(p.subtotal)}</dd></div>
                <div className="flex justify-between text-[var(--text-secondary)]">
                  <dt>{p.isPickup ? 'Retirada' : 'Entrega'}</dt>
                  <dd>{Number(p.deliveryFee) > 0 ? formatarReais(p.deliveryFee) : 'Grátis'}</dd>
                </div>
                {Number(p.discount) > 0 && (
                  <div className="flex justify-between text-green-700"><dt>Desconto</dt><dd>- {formatarReais(p.discount)}</dd></div>
                )}
                <div className="flex justify-between font-bold text-[var(--text-primary)] text-base pt-1"><dt>Total</dt><dd>{formatarReais(p.total)}</dd></div>
                <div className="flex justify-between text-[var(--text-secondary)]"><dt>Pagamento</dt><dd>{PAGAMENTO[p.paymentMethod] || p.paymentMethod}</dd></div>
              </dl>
            </section>

            {(p.deliveryAddress || p.notes) && (
              <section className={`${cartao} text-sm space-y-2`}>
                {p.deliveryAddress && (
                  <p className="flex items-start gap-2 text-[var(--text-primary)]">
                    <MapPin size={16} className="mt-0.5 shrink-0 text-[var(--brand-primary)]" />
                    <span>{p.isPickup ? 'Retirar em: ' : ''}{p.deliveryAddress}</span>
                  </p>
                )}
                {p.notes && <p className="text-[var(--text-secondary)]">📝 {p.notes}</p>}
              </section>
            )}

            {erro && <p className="text-sm text-[var(--status-error-text)]">{erro}</p>}

            {PODE_CANCELAR.includes(p.status) && (
              confirmandoCancelar ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-4 space-y-3">
                  <p className="text-sm text-red-900">
                    Cancelar o pedido #{p.orderNumber}? Se já foi pago, o valor volta para você.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmandoCancelar(false)} className="flex-1 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-sm font-semibold text-[var(--text-primary)]">
                      Não
                    </button>
                    <button
                      onClick={confirmarCancelamento}
                      disabled={cancelando}
                      className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-semibold disabled:opacity-50"
                    >
                      {cancelando ? 'Cancelando...' : 'Sim, cancelar'}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmandoCancelar(true)}
                  className="w-full py-3 rounded-xl border border-red-300 text-red-700 font-semibold hover:bg-red-50"
                >
                  Cancelar pedido
                </button>
              )
            )}
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
