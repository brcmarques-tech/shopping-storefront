'use client';

import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@apollo/client';
import { ShoppingCart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoreHeader } from './StoreHeader';
import { CategoryNav } from './CategoryNav';
import { ProductGrid } from './ProductGrid';
import { CartDrawer } from './CartDrawer';
import { AuthModal } from './AuthModal';
import { CheckoutFlow } from './CheckoutFlow';
import { DeepLinkBanner } from './DeepLinkBanner';
import { useCart } from '@/lib/useCart';
import { GET_STORE_STATUS } from '@/lib/graphql';

interface StorefrontData {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  city: string;
  state: string;
  isOpen: boolean;
  verificationLevel: string;
  hasOwnDelivery: boolean;
  freeDelivery: boolean;
  deliveryFee: number;
  estimatedDeliveryMinutes: number;
  minimumOrder: number;
  freeDeliveryAbove?: number;
  averageRating: number;
  totalRatings: number;
  categories: Array<{
    id: string;
    name: string;
    imageUrl?: string;
    sortOrder: number;
    requiresAgeVerification: boolean;
    products: Array<{
      id: string;
      name: string;
      description?: string;
      price: number;
      promotionalPrice?: number;
      imageUrl?: string;
      isAvailable: boolean;
      stock?: number;
      unit?: string;
      isVariableWeight: boolean;
    }>;
  }>;
}

interface ConflictState {
  product: StorefrontData['categories'][0]['products'][0];
  storeId: string;
}

export function StorefrontClient({ initialData }: { initialData: StorefrontData }) {
  const [cartOpen, setCartOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [conflict, setConflict] = useState<ConflictState | null>(null);

  const { itemCount, items } = useCart();
  const count = itemCount();

  // 8.11: reconcilia o carrinho persistido com o catalogo FRESCO do SSR — preco
  // que mudou desde a ultima visita, item que sumiu/esgotou. Sem isto o cliente
  // confirmava um total que o servidor ja nao cobrava.
  useEffect(() => {
    const prods = (initialData.categories || []).flatMap((c) => c.products || []);
    useCart.getState().syncWithCatalog(initialData.id, prods);
  }, [initialData]);

  // KAN-282: `initialData.isOpen` e um snapshot do SSR. Sem revalidacao, quem
  // deixava a aba aberta via "Aberto" para sempre, montava o carrinho, criava
  // conta, digitava endereco — e so levava "loja fechada" no ultimo toque.
  // Poll leve a cada 60s; enquanto nao responde, vale o snapshot.
  const { data: statusData } = useQuery(GET_STORE_STATUS, {
    variables: { storeId: initialData.id },
    pollInterval: 60_000,
    fetchPolicy: 'network-only',
  });
  const lojaAberta = statusData?.publicStorefront?.isOpen ?? initialData.isOpen;

  // O backend exige confirmacao explicita de maioridade quando o pedido tem
  // item de categoria +18 — o site nunca oferecia essa confirmacao, entao esses
  // pedidos morriam no "Confirmar pedido" com um erro sem saida. Aqui
  // descobrimos, a partir do proprio catalogo ja carregado no SSR, se o carrinho
  // tem algum item restrito.
  const idsRestritos = useMemo(() => {
    const set = new Set<string>();
    for (const cat of initialData.categories || []) {
      if (!cat.requiresAgeVerification) continue;
      for (const p of cat.products || []) set.add(p.id);
    }
    return set;
  }, [initialData.categories]);
  const temItemMaiorDeIdade = items.some((i) => idsRestritos.has(i.productId));

  const handleCheckout = () => {
    // KAN-257: decidia "esta logado?" pelo `user` do localStorage, mas quem
    // autentica a mutation e o `token`. Com `user` presente e token expirado/
    // ausente, o cliente ia ate o fim do checkout e so descobria o problema no
    // confirmar (erro tardio, na pior hora). Agora exige o token.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    setCartOpen(false);
    if (!token) {
      setAuthOpen(true);
    } else {
      setCheckoutOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setAuthOpen(false);
    setCheckoutOpen(true);
  };

  const handleConflict = (product: ConflictState['product']) => {
    setConflict({ product, storeId: initialData.id });
  };

  const resolveConflict = (confirm: boolean) => {
    if (confirm && conflict) {
      const { forceAdd } = useCart.getState();
      forceAdd(initialData.id, initialData.name, {
        productId: conflict.product.id,
        name: conflict.product.name,
        price: conflict.product.price,
        promotionalPrice: conflict.product.promotionalPrice,
        imageUrl: conflict.product.imageUrl,
        quantity: 1,
        // KAN-282: sem isto, o caminho do conflito adicionava produto de peso
        // variavel como UNIDADE (o mesmo bug que o card tinha).
        ...(conflict.product.isVariableWeight
          ? {
              isVariableWeight: true,
              unit: conflict.product.unit || 'kg',
              weightGrams: 500,
            }
          : {}),
        stock: conflict.product.stock,
      });
    }
    setConflict(null);
  };

  const activeCategories = initialData.categories.filter(
    (c) => c.products.length > 0,
  );

  return (
    <>
      <DeepLinkBanner storeId={initialData.slug ?? initialData.id} />

      <div className="min-h-screen bg-[var(--bg-page)]">
        <StoreHeader store={initialData} />
        <CategoryNav categories={activeCategories} />
        <ProductGrid
          categories={initialData.categories}
          storeId={initialData.id}
          storeName={initialData.name}
          storeOpen={lojaAberta}
          onConflict={handleConflict}
        />
      </div>

      {/* FAB carrinho — visivel enquanto HOUVER itens (mesmo so indisponiveis:
          o cliente precisa conseguir abrir o carrinho para remove-los) */}
      <AnimatePresence>
        {items.length > 0 && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-6 w-14 h-14 bg-[var(--brand-primary)] text-white rounded-full shadow-lg flex items-center justify-center z-[var(--z-header)]"
          >
            <ShoppingCart size={22} />
            <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-[11px] font-bold flex items-center justify-center">
              {count > 9 ? '9+' : count}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onCheckout={handleCheckout}
        storeOpen={lojaAberta}
      />
      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        onSuccess={handleAuthSuccess}
      />
      <CheckoutFlow
        open={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        storeId={initialData.id}
        deliveryFee={initialData.deliveryFee}
        minimumOrder={initialData.minimumOrder}
        freeDelivery={initialData.freeDelivery}
        freeDeliveryAbove={initialData.freeDeliveryAbove}
        hasOwnDelivery={initialData.hasOwnDelivery}
        hasAgeRestrictedItem={temItemMaiorDeIdade}
        storeOpen={lojaAberta}
      />

      {/* Dialog conflito de loja */}
      <AnimatePresence>
        {conflict && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-[var(--z-overlay)]"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-x-6 top-1/2 -translate-y-1/2 max-w-sm mx-auto bg-[var(--bg-card)] rounded-2xl p-6 z-[var(--z-modal)] shadow-2xl"
            >
              <h3 className="font-bold text-[var(--text-primary)] mb-2">
                Carrinho de outra loja
              </h3>
              <p className="text-sm text-[var(--text-secondary)] mb-5">
                Seu carrinho tem itens de outra loja. Deseja limpar e adicionar{' '}
                <strong>{conflict.product.name}</strong>?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => resolveConflict(false)}
                  className="flex-1 py-2.5 border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl text-sm font-medium"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => resolveConflict(true)}
                  className="flex-1 py-2.5 bg-[var(--brand-primary)] text-white rounded-xl text-sm font-semibold"
                >
                  Limpar e adicionar
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
