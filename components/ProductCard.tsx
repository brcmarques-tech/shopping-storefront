'use client';

import Image from 'next/image';
import { Plus, Minus, X } from 'lucide-react';
import { ObservacaoDoItem } from '@/components/ObservacaoDoItem';
import { useCart, formatWeight } from '@/lib/useCart';
import { useState } from 'react';
import { propsDeImagemRemota } from '@/lib/imagemRemota';

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
  /** Loja aberta AGORA (revalidado no cliente) — fechada esconde o botao. */
  storeOpen: boolean;
  onConflict: (product: Product) => void;
}

export function ProductCard({ product, storeId, storeName, storeOpen, onConflict }: Props) {
  const { addItem, items } = useCart();
  const [added, setAdded] = useState(false);
  // Seletor de peso (KAN-282): mesmo padrao do app — 500g default, passos de
  // 50g, minimo 50g. Sem ele, o site vendia o PRECO POR KG como preco unitario
  // e criava pedido sem peso nenhum.
  const [pesoAberto, setPesoAberto] = useState(false);
  const [pesoGramas, setPesoGramas] = useState(500);

  const cartItem = items.find((i) => i.productId === product.id);
  // Mesma regra do servidor: promocional vazio ou zerado vale o preço normal;
  // só mostra "promoção" quando o promocional é de fato menor.
  const displayPrice = product.promotionalPrice || product.price;
  const temPromo = !!product.promotionalPrice && product.promotionalPrice < product.price;
  const [noMaximo, setNoMaximo] = useState(false);
  // Detalhe do produto: foto grande, descrição inteira e observação do item.
  const [detalhe, setDetalhe] = useState(false);

  const handleAdd = () => {
    if (product.isVariableWeight && !pesoAberto) {
      // Já no carrinho: o seletor abre no peso atual para ajustar.
      if (cartItem?.weightGrams) setPesoGramas(cartItem.weightGrams);
      setPesoAberto(true);
      return;
    }
    const result = addItem(storeId, storeName, {
      productId: product.id,
      name: product.name,
      price: product.price,
      promotionalPrice: product.promotionalPrice,
      imageUrl: product.imageUrl,
      quantity: 1,
      ...(product.isVariableWeight
        ? {
            isVariableWeight: true,
            unit: product.unit || 'kg',
            weightGrams: pesoGramas,
          }
        : {}),
      stock: product.stock,
    });
    if (result === 'conflict') {
      onConflict(product);
      return;
    }
    if (result === 'max') {
      setNoMaximo(true);
      setTimeout(() => setNoMaximo(false), 2000);
      return;
    }
    setPesoAberto(false);
    setAdded(true);
    setTimeout(() => setAdded(false), 1200);
  };

  const seletorDePeso = (
          <div className="mt-2 flex items-center justify-between gap-2 bg-[var(--bg-muted)] rounded-xl p-2">
            <button
              onClick={() => pesoGramas > 50 && setPesoGramas(pesoGramas - 50)}
              disabled={pesoGramas <= 50}
              className="w-7 h-7 rounded-full bg-[var(--bg-card)] flex items-center justify-center disabled:opacity-40"
            >
              <Minus size={14} className="text-[var(--text-secondary)]" />
            </button>
            <div className="text-center leading-tight">
              <p className="text-sm font-bold text-[var(--text-primary)]">
                {formatWeight(pesoGramas)}
              </p>
              <p className="text-[10px] text-[var(--text-muted)]">
                {formatCurrency(Math.round((displayPrice * pesoGramas) / 10) / 100)}
              </p>
            </div>
            <button
              onClick={() => setPesoGramas(pesoGramas + 50)}
              className="w-7 h-7 rounded-full bg-[var(--bg-card)] flex items-center justify-center"
            >
              <Plus size={14} className="text-[var(--text-secondary)]" />
            </button>
            <button
              onClick={handleAdd}
              className="px-3 py-1.5 bg-[var(--brand-primary)] text-white rounded-lg text-xs font-semibold"
            >
              OK
            </button>
          </div>
  );

  return (
    <div
      className={`bg-[var(--bg-card)] rounded-2xl overflow-hidden shadow-[var(--card-shadow)] transition-shadow hover:shadow-[var(--card-shadow-hover)] flex flex-col ${
        !product.isAvailable ? 'opacity-50' : ''
      }`}
    >
      {/* Imagem (abre o detalhe) */}
      <button
        type="button"
        onClick={() => setDetalhe(true)}
        aria-label={`Ver detalhes de ${product.name}`}
        className="relative h-36 bg-[var(--bg-muted)] overflow-hidden block w-full text-left"
      >
        {product.imageUrl ? (
          <Image
            src={product.imageUrl}
            {...propsDeImagemRemota(product.imageUrl)}
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
        {temPromo && (
          <span className="absolute top-2 left-2 bg-[var(--brand-primary)] text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            PROMO
          </span>
        )}
      </button>

      {/* Info */}
      <div className="p-3 flex flex-col flex-1 gap-1">
        <button type="button" onClick={() => setDetalhe(true)} className="text-left">
          <p className="text-sm font-semibold text-[var(--text-primary)] line-clamp-2 leading-snug hover:text-[var(--brand-primary)]">
            {product.name}
          </p>
        </button>
        {product.description && (
          <p className="text-xs text-[var(--text-muted)] line-clamp-2">
            {product.description}
          </p>
        )}

        <div className="mt-auto pt-2 flex items-end justify-between">
          <div>
            <p className="text-base font-bold text-[var(--text-primary)]">
              {formatCurrency(displayPrice)}
              {/* KAN-282: sem a unidade, R$ 79,90/kg parecia preco da peca */}
              {product.isVariableWeight && (
                <span className="text-xs font-normal text-[var(--text-muted)]">
                  /{product.unit || 'kg'}
                </span>
              )}
            </p>
            {temPromo && (
              <p className="text-xs text-[var(--text-muted)] line-through">
                {formatCurrency(product.price)}
              </p>
            )}
          </div>

          {product.isAvailable && storeOpen && (
            <button
              onClick={handleAdd}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                cartItem || added
                  ? 'bg-green-500 text-white'
                  : 'bg-[var(--brand-primary)] text-white hover:bg-[var(--brand-primary-hover)]'
              }`}
            >
              {cartItem ? (
                <span className="text-xs font-bold">
                  {cartItem.isVariableWeight && cartItem.weightGrams
                    ? formatWeight(cartItem.weightGrams)
                    : cartItem.quantity}
                </span>
              ) : (
                <Plus size={16} />
              )}
            </button>
          )}
        </div>

        {noMaximo && (
          <p className="mt-1 text-[11px] font-medium text-[var(--text-muted)]">
            Você já tem todo o estoque no carrinho.
          </p>
        )}

        {/* Seletor de peso (produto de peso variavel) */}
        {pesoAberto && product.isAvailable && storeOpen && !detalhe && seletorDePeso}
      </div>

      {detalhe && (
        <div className="fixed inset-0 z-[var(--z-modal)] flex items-end sm:items-center justify-center bg-black/50" onClick={() => setDetalhe(false)}>
          <div
            role="dialog"
            aria-label={product.name}
            className="w-full sm:max-w-md bg-[var(--bg-card)] rounded-t-2xl sm:rounded-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative h-56 bg-[var(--bg-muted)]">
              {product.imageUrl ? (
                <Image src={product.imageUrl} {...propsDeImagemRemota(product.imageUrl)} alt={product.name} fill sizes="(max-width: 640px) 100vw, 448px" className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl select-none">🛍️</div>
              )}
              <button
                onClick={() => setDetalhe(false)}
                aria-label="Fechar"
                className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/50 text-white flex items-center justify-center"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-3">
              <h3 className="text-lg font-bold text-[var(--text-primary)]">{product.name}</h3>
              {product.description && (
                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-line">{product.description}</p>
              )}
              <div className="flex items-baseline gap-2">
                <span className="text-xl font-bold text-[var(--text-primary)]">
                  {formatCurrency(displayPrice)}
                  {product.isVariableWeight && <span className="text-sm font-normal text-[var(--text-muted)]">/{product.unit || 'kg'}</span>}
                </span>
                {temPromo && <span className="text-sm text-[var(--text-muted)] line-through">{formatCurrency(product.price)}</span>}
              </div>

              {!product.isAvailable ? (
                <p className="text-sm font-medium text-[var(--status-error-text)]">Indisponível no momento.</p>
              ) : !storeOpen ? (
                <p className="text-sm font-medium text-[var(--text-muted)]">A loja está fechada agora.</p>
              ) : (
                <>
                  {cartItem && (
                    <div className="rounded-xl bg-[var(--bg-muted)] px-3 py-2">
                      <p className="text-sm text-[var(--text-primary)]">
                        No carrinho: <strong>{cartItem.isVariableWeight && cartItem.weightGrams ? formatWeight(cartItem.weightGrams) : `${cartItem.quantity} un.`}</strong>
                      </p>
                      <ObservacaoDoItem productId={product.id} notes={cartItem.notes} />
                    </div>
                  )}
                  {pesoAberto && seletorDePeso}
                  {!pesoAberto && (
                    <button
                      onClick={handleAdd}
                      className={`w-full py-3 rounded-xl font-semibold text-white ${added ? 'bg-green-500' : 'bg-[var(--brand-primary)] hover:bg-[var(--brand-primary-hover)]'}`}
                    >
                      {added
                        ? 'Adicionado!'
                        : product.isVariableWeight
                          ? cartItem ? 'Mudar o peso' : 'Escolher o peso'
                          : cartItem ? 'Adicionar mais um' : 'Adicionar ao carrinho'}
                    </button>
                  )}
                  {noMaximo && <p className="text-xs text-[var(--text-muted)]">Você já tem todo o estoque no carrinho.</p>}
                  {!cartItem && <p className="text-xs text-[var(--text-muted)]">Depois de adicionar, dá para escrever uma observação (ex.: sem cebola).</p>}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
