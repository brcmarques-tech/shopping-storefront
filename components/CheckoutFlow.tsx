'use client';

import { useRef, useState } from 'react';
import { X, ChevronLeft, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { useMutation, useQuery } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/useCart';
import { CREATE_ORDER, GET_MINIMUM_ORDER_PLATFORM } from '@/lib/graphql';

type Step = 'address' | 'payment' | 'confirm' | 'success';

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

interface Props {
  open: boolean;
  onClose: () => void;
  storeId: string;
  deliveryFee: number;
  minimumOrder: number;
  freeDelivery?: boolean;
  freeDeliveryAbove?: number | null;
  /**
   * BUGFIX: o checkout mandava `paymentMethod: 'ON_DELIVERY'` fixo e nunca
   * `isPickup`. O backend recusa exatamente essa combinacao quando a loja NAO
   * tem frota propria ("Pagamento na entrega nao disponivel para esta loja"),
   * entao 100% dos pedidos pelo site falhavam no ultimo toque para toda loja
   * que usa entregadores da plataforma — e o site nao oferece nenhuma outra
   * forma de pagamento nem a opcao de retirada. O dado ja vinha do servidor e
   * simplesmente nao era usado.
   */
  hasOwnDelivery?: boolean;
  /** Ha item +18 no carrinho? O backend exige confirmacao explicita. */
  hasAgeRestrictedItem?: boolean;
}

export function CheckoutFlow({ open, onClose, storeId, deliveryFee, minimumOrder, freeDelivery, freeDeliveryAbove, hasOwnDelivery, hasAgeRestrictedItem }: Props) {
  // Sem frota propria o site so consegue concluir na modalidade RETIRADA
  // (pagamento na retirada) — que o backend aceita.
  const somenteRetirada = hasOwnDelivery === false;
  const [ageConfirmed, setAgeConfirmed] = useState(false);
  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { items, subtotal, clearCart, storeId: cartStoreId } = useCart();
  // KAN-218: aplica a MESMA regra de frete gratis do backend
  // (orders.service.ts) — antes o checkout ignorava freeDelivery/freeDeliveryAbove
  // e cobrava a taxa mesmo com o cabecalho anunciando "Frete gratis".
  const isFreeDelivery =
    !!freeDelivery ||
    (freeDeliveryAbove != null && Number(freeDeliveryAbove) > 0 && subtotal() >= Number(freeDeliveryAbove));
  // BUGFIX: `somenteRetirada` nao entrava na conta. Como o site so consegue
  // concluir pedido de loja sem frota propria — e nesse caso envia
  // `isPickup: true`, que faz o servidor zerar o frete — a tela dizia
  // "Retirada no local" E somava a taxa de entrega ao mesmo tempo. O cliente
  // confirmava um total maior do que o pedido realmente criado.
  const { data: minPlatData } = useQuery(GET_MINIMUM_ORDER_PLATFORM);
  const minimoPlataforma = Number(minPlatData?.minimumOrderPlatform) || 0;
  const minimoEfetivo =
    hasOwnDelivery === false ? Math.max(minimoPlataforma, minimumOrder) : minimumOrder;

  const effectiveDeliveryFee = somenteRetirada || isFreeDelivery ? 0 : deliveryFee;
  const total = subtotal() + effectiveDeliveryFee;

  const [createOrder, { loading }] = useMutation(CREATE_ORDER);
  // KAN-247: trava sincrona de double-submit (o `loading` do useMutation so
  // atualiza no proximo render, tarde demais para um toque duplo).
  const submittingRef = useRef(false);

  const handleConfirm = async () => {
    // KAN-247: trava SINCRONA contra envio duplicado. A unica protecao era
    // `disabled={loading}`, mas `loading` so vira true depois do React
    // re-renderizar — um toque duplo rapido (comum no mobile) disparava
    // createOrder duas vezes antes disso, gerando pedido duplicado: retrabalho
    // para a loja e risco de cobranca/entrega em dobro. O ref muda no mesmo
    // tick, entao a segunda chamada volta imediatamente.
    if (submittingRef.current) return;
    submittingRef.current = true;

    setError('');
    // O carrinho é global e pertence a UMA loja (cartStoreId). Se o usuário
    // abre outra loja e finaliza por aqui, os itens são da loja do carrinho mas
    // o storeId da página é outro — o pedido sairia com itens de uma loja
    // atribuídos a outra (erro no backend ou pedido corrompido). Bloqueia.
    if (cartStoreId && cartStoreId !== storeId) {
      setError(
        'Seu carrinho é de outra loja. Abra a loja correta para finalizar ou limpe o carrinho.',
      );
      submittingRef.current = false;
      return;
    }
    // Mesma regra do backend: sem frota propria, vale o MAIOR entre o minimo da
    // loja e o da plataforma.
    if (subtotal() < minimoEfetivo && minimoEfetivo > 0) {
      setError(`Pedido mínimo: ${formatCurrency(minimoEfetivo)}`);
      submittingRef.current = false;
      return;
    }
    try {
      const { data } = await createOrder({
        variables: {
          input: {
            storeId,
            items: items.map((i) => ({
              productId: i.productId,
              quantity: i.quantity,
              notes: i.notes,
            })),
            deliveryAddress: address,
            paymentMethod: 'ON_DELIVERY',
            isPickup: somenteRetirada,
            ageVerified: hasAgeRestrictedItem ? ageConfirmed : undefined,
            notes,
          },
        },
      });
      setOrderNumber(data.createOrder.orderNumber);
      clearCart();
      setStep('success');
    } catch (err: unknown) {
      const e = err as { message?: string };
      setError(e.message || 'Erro ao criar pedido');
    } finally {
      // KAN-247: libera a trava para o usuario poder tentar de novo apos erro.
      submittingRef.current = false;
    }
  };

  const reset = () => {
    setStep('address');
    setAddress('');
    setNotes('');
    setOrderNumber(null);
    setError('');
    onClose();
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
            onClick={step === 'success' ? reset : undefined}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-[var(--bg-card)] rounded-t-2xl z-[var(--z-modal)] max-h-[90vh] overflow-y-auto"
          >
            {step === 'success' ? (
              <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-4">
                <CheckCircle size={56} className="text-green-500" />
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  Pedido realizado!
                </h2>
                <p className="text-[var(--text-secondary)]">
                  Pedido <strong>#{orderNumber}</strong> confirmado.
                  <br />
                  Acompanhe pelo app ou aguarde o contato da loja.
                </p>
                <button
                  onClick={reset}
                  className="mt-4 w-full max-w-xs py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                >
                  Voltar à loja
                </button>
              </div>
            ) : (
              <>
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[var(--border-color)]">
                  {step !== 'address' && (
                    <button
                      onClick={() =>
                        setStep(step === 'confirm' ? 'payment' : 'address')
                      }
                      className="text-[var(--text-muted)]"
                    >
                      <ChevronLeft size={20} />
                    </button>
                  )}
                  <h2 className="flex-1 font-bold text-[var(--text-primary)]">
                    {step === 'address' && 'Endereço de entrega'}
                    {step === 'payment' && 'Pagamento'}
                    {step === 'confirm' && 'Confirmar pedido'}
                  </h2>
                  <button onClick={onClose}>
                    <X size={20} className="text-[var(--text-muted)]" />
                  </button>
                </div>

                <div className="px-5 py-5 space-y-4">
                  {error && (
                    <p className="text-xs text-[var(--status-error-text)] bg-[var(--status-error-bg)] px-3 py-2 rounded-lg">
                      {error}
                    </p>
                  )}

                  {step === 'address' && (
                    <>
                      <div className="flex items-start gap-3 bg-[var(--bg-muted)] rounded-xl p-3">
                        <MapPin size={18} className="text-[var(--brand-primary)] mt-0.5 shrink-0" />
                        <textarea
                          value={address}
                          onChange={(e) => setAddress(e.target.value)}
                          placeholder="Rua, número, bairro, complemento..."
                          rows={3}
                          className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder-[var(--text-muted)] resize-none"
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!address.trim()) {
                            setError('Informe o endereço de entrega');
                            return;
                          }
                          setError('');
                          setStep('payment');
                        }}
                        className="w-full py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                      >
                        Continuar
                      </button>
                    </>
                  )}

                  {step === 'payment' && (
                    <>
                      <div className="bg-[var(--bg-muted)] rounded-xl p-4">
                        <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                          Pagamento na entrega
                        </p>
                        <p className="text-xs text-[var(--text-muted)]">
                          Pague em dinheiro ou cartão no momento da entrega.
                        </p>
                      </div>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Observações do pedido (opcional)"
                        rows={2}
                        className="w-full px-4 py-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-input)] text-[var(--text-primary)] text-sm resize-none"
                      />
                      <button
                        onClick={() => setStep('confirm')}
                        className="w-full py-3 bg-[var(--brand-primary)] text-white font-semibold rounded-xl"
                      >
                        Revisar pedido
                      </button>
                    </>
                  )}

                  {step === 'confirm' && (
                    <>
                      {/* Resumo dos itens */}
                      <div className="space-y-2">
                        {items.map((item) => (
                          <div
                            key={item.productId}
                            className="flex justify-between text-sm"
                          >
                            <span className="text-[var(--text-secondary)]">
                              {item.quantity}x {item.name}
                            </span>
                            <span className="font-medium text-[var(--text-primary)]">
                              {formatCurrency(
                                (item.promotionalPrice ?? item.price) * item.quantity,
                              )}
                            </span>
                          </div>
                        ))}
                      </div>

                      <div className="border-t border-[var(--border-color)] pt-3 space-y-1.5">
                        <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                          <span>Subtotal</span>
                          <span>{formatCurrency(subtotal())}</span>
                        </div>
                        {!somenteRetirada && (
                          <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                            <span>Entrega</span>
                            <span>
                              {effectiveDeliveryFee === 0
                                ? 'Grátis'
                                : formatCurrency(effectiveDeliveryFee)}
                            </span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-[var(--text-primary)]">
                          <span>Total</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl p-3">
                        📍 {address}
                        <br />
                        {somenteRetirada ? '🏪 Retirada no local — pague ao retirar' : '💳 Pagamento na entrega'}
                        {notes && <><br />📝 {notes}</>}
                      </div>

                      {somenteRetirada && (
                        <div className="text-xs rounded-xl p-3 bg-amber-50 text-amber-900 border border-amber-200">
                          Esta loja usa entregadores da plataforma, e o site aceita
                          apenas <strong>retirada no local</strong>. Para receber em
                          casa, faça o pedido pelo aplicativo.
                        </div>
                      )}

                      {hasAgeRestrictedItem && (
                        <label className="flex items-start gap-2 text-xs rounded-xl p-3 bg-red-50 text-red-900 border border-red-200 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={ageConfirmed}
                            onChange={(e) => setAgeConfirmed(e.target.checked)}
                            className="mt-0.5"
                          />
                          <span>
                            Este pedido contém produto com restrição de idade.
                            Confirmo que tenho <strong>18 anos ou mais</strong>.
                          </span>
                        </label>
                      )}

                      <button
                        onClick={handleConfirm}
                        disabled={loading || (hasAgeRestrictedItem && !ageConfirmed)}
                        className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl disabled:opacity-60 flex items-center justify-center gap-2"
                      >
                        {loading && <Loader2 size={16} className="animate-spin" />}
                        Confirmar pedido
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
