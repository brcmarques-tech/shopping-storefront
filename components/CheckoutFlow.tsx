'use client';

import { useState } from 'react';
import { X, ChevronLeft, Loader2, CheckCircle, MapPin } from 'lucide-react';
import { useMutation } from '@apollo/client';
import { motion, AnimatePresence } from 'framer-motion';
import { useCart } from '@/lib/useCart';
import { CREATE_ORDER } from '@/lib/graphql';

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
}

export function CheckoutFlow({ open, onClose, storeId, deliveryFee, minimumOrder }: Props) {
  const [step, setStep] = useState<Step>('address');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [orderNumber, setOrderNumber] = useState<string | null>(null);
  const [error, setError] = useState('');

  const { items, subtotal, clearCart } = useCart();
  const total = subtotal() + deliveryFee;

  const [createOrder, { loading }] = useMutation(CREATE_ORDER);

  const handleConfirm = async () => {
    setError('');
    if (subtotal() < minimumOrder && minimumOrder > 0) {
      setError(`Pedido mínimo: ${formatCurrency(minimumOrder)}`);
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
                        <div className="flex justify-between text-sm text-[var(--text-secondary)]">
                          <span>Entrega</span>
                          <span>
                            {deliveryFee === 0
                              ? 'Grátis'
                              : formatCurrency(deliveryFee)}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-[var(--text-primary)]">
                          <span>Total</span>
                          <span>{formatCurrency(total)}</span>
                        </div>
                      </div>

                      <div className="text-xs text-[var(--text-muted)] bg-[var(--bg-muted)] rounded-xl p-3">
                        📍 {address}
                        <br />
                        💳 Pagamento na entrega
                        {notes && <><br />📝 {notes}</>}
                      </div>

                      <button
                        onClick={handleConfirm}
                        disabled={loading}
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
