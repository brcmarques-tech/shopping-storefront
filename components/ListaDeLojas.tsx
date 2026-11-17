'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { gql, useLazyQuery } from '@apollo/client';
import { Clock, Search, ShoppingBag, Star, Truck, X } from 'lucide-react';
import { propsDeImagemRemota } from '@/lib/imagemRemota';

export interface StoreCardData {
  id: string;
  slug?: string;
  name: string;
  description?: string;
  logoUrl?: string;
  bannerUrl?: string;
  city: string;
  state: string;
  isOpen: boolean;
  storeType: string;
  deliveryFee: number;
  freeDelivery: boolean;
  estimatedDeliveryMinutes: number;
  minimumOrder: number;
  verificationLevel: string;
  averageRating: number;
  totalRatings: number;
}

const BUSCAR_PRODUTOS = gql`
  query BuscarProdutos($query: String!, $limit: Int) {
    searchProducts(query: $query, limit: $limit) {
      id
      name
      price
      promotionalPrice
      imageUrl
      isVariableWeight
      unit
      store { id slug name }
    }
  }
`;

const reais = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
const semAcento = (t: string) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

type Filtro = 'abertas' | 'gratis' | 'PRODUCTS' | 'SERVICES';
const FILTROS: { id: Filtro; rotulo: string }[] = [
  { id: 'abertas', rotulo: 'Abertas agora' },
  { id: 'gratis', rotulo: 'Entrega grátis' },
  { id: 'PRODUCTS', rotulo: 'Produtos' },
  { id: 'SERVICES', rotulo: 'Serviços' },
];

/**
 * Lista da página inicial com busca e filtros. A lista de negócios já vem do
 * servidor; filtrar é local. A busca também procura PRODUTOS em todos os
 * negócios (searchProducts), mostrando só os de negócios que estão nesta lista.
 */
export function ListaDeLojas({ stores }: { stores: StoreCardData[] }) {
  const [busca, setBusca] = useState('');
  const [filtros, setFiltros] = useState<Set<Filtro>>(new Set());
  const [buscarProdutos, { data: dadosProdutos, loading: buscandoProdutos }] = useLazyQuery(BUSCAR_PRODUTOS);
  const termo = busca.trim();

  // Espera o cliente parar de digitar antes de ir na API.
  useEffect(() => {
    if (termo.length < 2) return;
    const t = setTimeout(() => buscarProdutos({ variables: { query: termo, limit: 12 } }), 350);
    return () => clearTimeout(t);
  }, [termo, buscarProdutos]);

  const alternar = (f: Filtro) =>
    setFiltros((atual) => {
      const novo = new Set(atual);
      if (novo.has(f)) novo.delete(f);
      else {
        // Produtos e Serviços se excluem.
        if (f === 'PRODUCTS') novo.delete('SERVICES');
        if (f === 'SERVICES') novo.delete('PRODUCTS');
        novo.add(f);
      }
      return novo;
    });

  const lojas = useMemo(() => {
    const q = semAcento(termo);
    const lista = stores.filter((s) => {
      if (filtros.has('abertas') && !s.isOpen) return false;
      if (filtros.has('gratis') && !s.freeDelivery) return false;
      if (filtros.has('PRODUCTS') && s.storeType === 'SERVICES') return false;
      if (filtros.has('SERVICES') && s.storeType !== 'SERVICES') return false;
      if (q && !semAcento(`${s.name} ${s.description || ''} ${s.city}`).includes(q)) return false;
      return true;
    });
    return [...lista.filter((s) => s.isOpen), ...lista.filter((s) => !s.isOpen)];
  }, [stores, filtros, termo]);

  const idsVisiveis = new Set(stores.map((s) => s.id));
  const produtos: any[] =
    termo.length >= 2
      ? (dadosProdutos?.searchProducts || []).filter((p: any) => p.store && idsVisiveis.has(p.store.id))
      : [];

  return (
    <>
      <div className="relative mb-3">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
        <input
          type="text"
              inputMode="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar negócio ou produto"
          aria-label="Buscar negócio ou produto"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)]"
        />
        {busca && (
          <button onClick={() => setBusca('')} aria-label="Limpar busca" className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]">
            <X size={18} />
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2 mb-6">
        {FILTROS.map((f) => {
          const ativo = filtros.has(f.id);
          return (
            <button
              key={f.id}
              onClick={() => alternar(f.id)}
              aria-pressed={ativo}
              className={`px-3.5 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                ativo
                  ? 'bg-[var(--brand-primary)] border-[var(--brand-primary)] text-white'
                  : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-secondary)] hover:border-[var(--brand-primary)]'
              }`}
            >
              {f.rotulo}
            </button>
          );
        })}
      </div>

      {termo.length >= 2 && (
        <section className="mb-8">
          <h2 className="font-bold text-[var(--text-primary)] mb-3">Produtos</h2>
          {buscandoProdutos && produtos.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Procurando...</p>
          ) : produtos.length === 0 ? (
            <p className="text-sm text-[var(--text-secondary)]">Nenhum produto encontrado para &quot;{termo}&quot;.</p>
          ) : (
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {produtos.map((p) => {
                const preco = p.promotionalPrice && p.promotionalPrice < p.price ? p.promotionalPrice : p.price;
                return (
                  <li key={p.id}>
                    <Link
                      href={`/loja/${p.store.slug ?? p.store.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl bg-[var(--bg-card)] border border-[var(--border-color)] hover:border-[var(--brand-primary)]"
                    >
                      <div className="relative w-14 h-14 rounded-lg overflow-hidden bg-[var(--bg-muted)] shrink-0">
                        {p.imageUrl ? (
                          <Image src={p.imageUrl} {...propsDeImagemRemota(p.imageUrl)} alt={p.name} fill sizes="56px" className="object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xl">🛍️</div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[var(--text-primary)] truncate">{p.name}</p>
                        <p className="text-xs text-[var(--text-secondary)] truncate">{p.store.name}</p>
                        <p className="text-sm font-bold text-[var(--text-primary)]">
                          {reais(preco)}
                          {p.isVariableWeight && <span className="text-xs font-normal text-[var(--text-muted)]">/{p.unit || 'kg'}</span>}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}

      {termo.length >= 2 && <h2 className="font-bold text-[var(--text-primary)] mb-3">Negócios</h2>}
      {lojas.length === 0 ? (
        <div className="text-center py-16 text-[var(--text-secondary)]">
          <p>Nenhum negócio encontrado com esses filtros.</p>
          <button
            onClick={() => { setBusca(''); setFiltros(new Set()); }}
            className="mt-3 text-sm font-semibold text-[var(--brand-primary)] hover:underline"
          >
            Limpar busca e filtros
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lojas.map((store) => (
            <StoreCard key={store.id} store={store} />
          ))}
        </div>
      )}
    </>
  );
}

function StoreCard({ store }: { store: StoreCardData }) {
  const href = `/loja/${store.slug ?? store.id}`;

  return (
    <Link href={href} className="group block">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden hover:border-[var(--brand-primary)] transition-colors">
        {/* Banner */}
        <div className="relative h-32 bg-[var(--bg-secondary)]">
          {store.bannerUrl ? (
            <Image
              src={store.bannerUrl}
              {...propsDeImagemRemota(store.bannerUrl)}
              alt={store.name}
              fill
              /* KAN-249: card de loja em grid — nunca ocupa 100vw. */
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] opacity-20" />
          )}
          <span
            className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
              store.isOpen ? 'bg-green-500/90 text-white' : 'bg-black/60 text-white/80'
            }`}
          >
            {store.isOpen ? 'Aberto' : 'Fechado'}
          </span>
          {/* Logo */}
          <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl border-2 border-[var(--bg-card)] bg-[var(--bg-card)] overflow-hidden shadow">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                {...propsDeImagemRemota(store.logoUrl)}
                alt={store.name}
                fill
                /* KAN-249: logo tem 48px fixos (w-12 h-12). */
                sizes="48px"
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--brand-primary)]">
                <ShoppingBag size={20} className="text-white" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="pt-7 px-4 pb-4">
          <h2 className="font-semibold text-[var(--text-primary)] truncate group-hover:text-[var(--brand-primary)] transition-colors">
            {store.name}
          </h2>
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {store.city}, {store.state}
          </p>

          {store.totalRatings > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-[var(--text-secondary)]">
                {store.averageRating.toFixed(1)} ({store.totalRatings})
              </span>
            </div>
          )}

          <div className="flex flex-wrap gap-2 mt-3">
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Clock size={11} />
              {store.estimatedDeliveryMinutes} min
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Truck size={11} />
              {store.freeDelivery ? 'Entrega grátis' : reais(store.deliveryFee)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
