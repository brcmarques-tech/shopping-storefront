'use client';

import { X, Minus, Plus, Trash2, ShoppingCart } from 'lucide-react';
import { useCart } from '@/lib/useCart';
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
}

export function CartDrawer({ open, onClose, onCheckout }: Props) {
  const { items, updateQuantity, removeItem, clearCart, subtotal, storeName } =
    useCart();

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
              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-[var(--text-muted)]">
                  <ShoppingCart size={40} />
                  <p className="text-sm">Carrinho vazio</p>
                </div>
              ) : (
                items.map((item) => (
                  <div
                    key={item.productId}
                    className="flex gap-3 bg-[var(--bg-muted)] rounded-xl p-3"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--text-primary)] truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-[var(--brand-primary)] font-semibold mt-0.5">
                        {formatCurrency(
                          (item.promotionalPrice ?? item.price) * item.quantity,
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
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
                      <button
                        onClick={() =>
                          updateQuantity(item.productId, item.quantity + 1)
                        }
                        className="w-6 h-6 rounded-full bg-[var(--brand-primary)] text-white flex items-center justify-center"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
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
                <button
                  onClick={onCheckout}
                  className="w-full py-3 bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)] text-white font-semibold rounded-xl transition-colors"
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
