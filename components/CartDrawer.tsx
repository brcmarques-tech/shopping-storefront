'use client';

import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useCart, itemTotal, formatWeight } from '@/lib/useCart';
import { motion, AnimatePresence } from 'framer-motion';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface Props {
  open: boolean;
  onClose: () => void;
  onCheckout: () => void;
  storeOpen: boolean;
}

export function CartDrawer({ open, onClose, onCheckout, storeOpen }: Props) {
  const {
    items,
    updateQuantity,
    updateWeight,
    removeItem,
    clearCart,
    subtotal,
    storeName,
    pricesUpdated,
    dismissPricesUpdated,
  } = useCart();
  // 8.11: item que sumiu/esgotou desde a ultima visita bloqueia o checkout ate
  // ser removido (remover em silencio esconderia o problema do cliente).
  const temIndisponivel = items.some((i) => i.unavailable);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-[var(--z-overlay)]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-sm bg-[var(--bg-card)] z-[var(--z-drawer)] flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--border-color)]">
              <div>
                <h2 className="font-bold text-[var(--text-primary)]">
                  Seu carrinho
                </h2>
                {storeName && (
                  <p className="text-xs text-[var(--text-muted)]">{storeName}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {items.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-xs text-[var(--status-error-text)] hover:underline"
                  >
                    Limpar
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[var(--bg-hover)]"
                >
                  <X size={18} className="text-[var(--text-secondary)]" />
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {/* 8.11: o carrinho persiste entre visitas — se preco/estoque
                  mudou desde a ultima vez, o cliente precisa saber ANTES de
                  confirmar, nao descobrir na fatura. */}
              {pricesUpdated && (
                <div className="flex items-start justify-between gap-2 text-xs rounded-xl p-3 bg-amber-50 text-amber-900 border border-amber-200">
                  <span>
                    A loja atualizou preços ou disponibilidade desde sua última
                    visita — os valores abaixo já estão atualizados.
                  </span>
                  <button onClick={dismissPricesUpdated} className="font-semibold shrink-0">
                    OK
                  </button>
                </div>
              )}
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
                  <ShoppingCart size={40} />
                  <p className="text-sm">Carrinho vazio</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className={`flex gap-3 rounded-xl p-3 ${
                      item.unavailable
                        ? 'bg-[var(--status-error-bg)] opacity-90'
                        : 'bg-[var(--bg-muted)]'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.name}
                      </p>
                      {item.unavailable ? (
                        <p className="text-xs text-[var(--status-error-text)] font-semibold mt-0.5">
                          Produto indisponível — remova para continuar
                        </p>
                      ) : (
                      <p className="text-xs text-[var(--brand-primary)] font-semibold mt-0.5">
                        {/* KAN-282: itemTotal sabe calcular peso variavel
                            (preco/kg * gramas) — antes preco/kg era somado como
                            preco unitario */}
                        {formatCurrency(itemTotal(item))}
                        {item.isVariableWeight && item.weightGrams && (
                          <span className="text-[var(--text-muted)] font-normal">
                            {' '}· {formatWeight(item.weightGrams)}
                          </span>
                        )}
                      </p>
                      )}
                    </div>

                    {item.unavailable ? (
                      <button
                        onClick={() => removeItem(item.productId)}
                        className="w-8 h-8 self-center rounded-full bg-[var(--bg-card)] flex items-center justify-center shrink-0"
                      >
                        <Trash2 size={14} className="text-[var(--status-error-text)]" />
                      </button>
                    ) : (
                    <div className="flex items-center gap-1.5 shrink-0">
                      {item.isVariableWeight ? (
                        <>
                          <button
                            onClick={() =>
                              updateWeight(item.productId, (item.weightGrams || 0) - 50)
                            }
                            className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
                          >
                            {(item.weightGrams || 0) <= 50 ? (
                              <Trash2 size={12} className="text-[var(--status-error-text)]" />
                            ) : (
                              <Minus size={12} className="text-[var(--text-secondary)]" />
                            )}
                          </button>
                          <span className="text-sm font-bold text-[var(--text-primary)] w-10 text-center">
                            {formatWeight(item.weightGrams || 0)}
                          </span>
                          <button
                            onClick={() =>
                              updateWeight(item.productId, (item.weightGrams || 0) + 50)
                            }
                            className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center"
                          >
                            <Plus size={12} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity - 1)
                            }
                            className="w-6 h-6 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
                          >
                            {item.quantity === 1 ? (
                              <Trash2 size={12} className="text-[var(--status-error-text)]" />
                            ) : (
                              <Minus size={12} className="text-[var(--text-secondary)]" />
                            )}
                          </button>
                          <span className="text-sm font-bold text-[var(--text-primary)] w-5 text-center">
                            {item.quantity}
                          </span>
                          {/* KAN-282: `stock` era buscado e nunca usado — o
                              cliente so descobria o limite no fim do checkout */}
                          <button
                            onClick={() =>
                              updateQuantity(item.productId, item.quantity + 1)
                            }
                            disabled={item.stock != null && item.quantity >= item.stock}
                            className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center disabled:opacity-40"
                          >
                            <Plus size={12} />
                          </button>
                        </>
                      )}
                    </div>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            {items.length > 0 && (
              <div className="px-4 py-4 border-t border-[var(--border-color)] space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">Subtotal</span>
                  <span className="font-bold text-[var(--text-primary)]">
                    {formatCurrency(subtotal())}
                  </span>
                </div>
                {/* KAN-282: loja fechada deixava percorrer o checkout inteiro e
                    so falhava no ultimo toque */}
                {!storeOpen && (
                  <p className="text-xs text-center text-[var(--status-error-text)]">
                    A loja está fechada no momento. Os itens ficam salvos para
                    quando ela reabrir.
                  </p>
                )}
                {temIndisponivel && (
                  <p className="text-xs text-center text-[var(--status-error-text)]">
                    Remova os itens indisponíveis para finalizar o pedido.
                  </p>
                )}
                <button
                  onClick={onCheckout}
                  disabled={!storeOpen || temIndisponivel}
                  className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Finalizar pedido
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
