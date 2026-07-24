'use client';

import Image from 'next/image';
import { Plus } from 'lucide-react';
import { useCart } from '@/lib/useCart';
import { useState } from 'react';

interface Product {
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
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

interface Props {
  product: Product;
  storeId: string;
  storeName: string;
  onConflict: (product: Product) => void;
}

export function ProductCard({ product, storeId, storeName, onConflict }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);

  const cartItem = items.find((i) => i.productId === product.id);
  const displayPrice = product.promotionalPrice ?? product.price;

  const handleAdd = () => {
    const result = addItem(storeId, storeName, {
      productId: product.id,
      name: product.name,
      price: product.price,
      promotionalPrice: product.promotionalPrice,
      imageUrl: product.imageUrl,
      quantity: 1,
    });
    if (result === 'conflict') {
      onConflict(product);
      return;
    }
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  return (
    <div
      className={`bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-[var(--card-shadow)] transition-shadow hover:shadow-[var(--card-shadow-hover)] flex flex-col ${
        !product.isAvailable ? 'opacity-50' : ''
      }`}
    >
      {/* Imagem */}
      <div className="relative h-36 bg-[var(--bg-muted)] overflow-hidden">
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            /* KAN-249: sem `sizes`, o Next assume 100vw e serve a maior variante
               do srcset — thumbnails de grid baixavam em resolucao cheia,
               piorando LCP e consumo de dados justamente no mobile. */
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl select-none">
            🛍️
          </div>
        )}
        {product.promotionalPrice && (
          <span className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            PROMO
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug">
          {product.name}
        </p>
        {product.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <p className="text-base font-bold text-[var(--text-primary)]">
              {formatCurrency(displayPrice)}
            </p>
            {product.promotionalPrice && (
              <p className="text-xs text-[var(--text-muted)] line-through">
                {formatCurrency(product.price)}
              </p>
            )}
          </div>

          {product.isAvailable && (
            <button
              onClick={handleAdd}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                cartItem || added
                  ? 'bg-green-500 text-white'
                  : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
              }`}
            >
              {cartItem ? (
                <span className="text-xs font-bold">{cartItem.quantity}</span>
              ) : (
                <Plus size={16} />
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
