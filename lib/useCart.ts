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
}

interface CartStore {
  storeId: string | null;
  storeName: string | null;
  items: CartItem[];
  addItem: (storeId: string, storeName: string, item: CartItem) => 'added' | 'conflict';
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
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
                ? { ...i, quantity: i.quantity + item.quantity }
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

      updateNotes: (productId, notes) => {
        set({
          items: get().items.map((i) =>
            i.productId === productId ? { ...i, notes } : i,
          ),
        });
      },

      clearCart: () => set({ storeId: null, storeName: null, items: [] }),

      subtotal: () =>
        get().items.reduce(
          (sum, i) => sum + (i.promotionalPrice ?? i.price) * i.quantity,
          0,
        ),

      itemCount: () => get().items.reduce((sum, i) => sum + i.quantity, 0),
    }),
    { name: 'bcm-cart' },
  ),
);
