'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  productId: string;
  name: string;
  price: number;
  promotionalPrice?: number;
  imageUrl?: string;
  quantity: number;
  notes?: string;
  // Peso variavel (KAN-282): para estes itens `price` e POR KG e o que conta e
  // weightGrams — quantity fica travado em 1, como no app e no servidor.
  isVariableWeight?: boolean;
  unit?: string;
  weightGrams?: number;
  /** Estoque conhecido no momento em que o item entrou no carrinho. */
  stock?: number;
}

/**
 * Total de UM item. Peso variavel: preco/kg * gramas, arredondado em CENTAVOS
 * com a MESMA formula do servidor (orders.service.ts) — divergir aqui mostraria
 * ao cliente um total diferente do que o pedido realmente grava.
 */
export function itemTotal(i: CartItem): number {
  const preco = i.promotionalPrice ?? i.price;
  if (i.isVariableWeight && i.weightGrams) {
    return Math.round((preco * i.weightGrams) / 10) / 100;
  }
  return preco * i.quantity;
}

/** 750 -> "750g", 1000 -> "1kg", 1500 -> "1.5kg" (mesma formatacao do app). */
export function formatWeight(grams: number): string {
  return grams >= 1000
    ? `${(grams / 1000).toFixed(grams % 1000 === 0 ? 0 : 1)}kg`
    : `${grams}g`;
}

interface CartStore {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  addItem: (storeId: string, storeName: string, item: CartItem) => 'added' | 'conflict';
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  updateWeight: (productId: string, weightGrams: number) => void;
  updateNotes: (productId: string, notes: string) => void;
  clearCart: () => void;
  forceAdd: (storeId: string, storeName: string, item: CartItem) => void;
  subtotal: () => number;
  itemCount: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      storeId: null,
      storeName: null,
      items: [],

      addItem: (storeId, storeName, item) => {
        const state = get();
        if (state.storeId && state.storeId !== storeId && state.items.length > 0) {
          return 'conflict';
        }
        const existing = state.items.find((i) => i.productId === item.productId);
        if (existing) {
          set({
            items: state.items.map((i) =>
              i.productId === item.productId
                ? item.isVariableWeight
                  ? { ...i, weightGrams: (i.weightGrams || 0) + (item.weightGrams || 0) }
                  : { ...i, quantity: i.quantity + item.quantity }
                : i,
            ),
          });
        } else {
          set({ storeId, storeName, items: [...state.items, item] });
        }
        return 'added';
      },

      forceAdd: (storeId, storeName, item) => {
        set({ storeId, storeName, items: [item] });
      },

      removeItem: (productId) => {
        const items = get().items.filter((i) => i.productId !== productId);
        set({ items, storeId: items.length === 0 ? null : get().storeId });
      },

      updateQuantity: (productId, quantity) => {
        if (quantity <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, quantity } : i,
          ),
        });
      },

      updateWeight: (productId, weightGrams) => {
        if (weightGrams <= 0) {
          get().removeItem(productId);
          return;
        }
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, weightGrams } : i,
          ),
        });
      },

      updateNotes: (productId, notes) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, notes } : i,
          ),
        });
      },

      clearCart: () => set({ storeId: null, storeName: null, items: [] }),

      // BUGFIX (KAN-282): a soma anterior era sempre preco * quantity — para
      // item de peso variavel `price` e POR KG, entao 500g de picanha a
      // R$ 79,90/kg somavam R$ 79,90 no subtotal (e o pedido saia sem peso).
      subtotal: () => get().items.reduce((sum, i) => sum + itemTotal(i), 0),

      itemCount: () =>
        get().items.reduce((sum, i) => sum + (i.isVariableWeight ? 1 : i.quantity), 0),
    }),
    { name: 'bcm-cart' },
  ),
);
