import Image from "next/image";
import Link from "next/link";
import { createServerApolloClient } from "@/lib/apollo";
import { GET_PUBLIC_STORES } from "@/lib/graphql";
import { Clock, ShoppingBag, Star, Truck } from "lucide-react";

export const dynamic = "force-dynamic";

interface StoreCard {
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

async function fetchStores(): Promise<StoreCard[]> {
  try {
    const client = createServerApolloClient();
    const { data } = await client.query({ query: GET_PUBLIC_STORES });
    return data.publicStores ?? [];
  } catch {
    return [];
  }
}

export const metadata = {
  title: "🛒 BCM Shopping — Lojas",
  description: "Encontre as melhores lojas e faça seu pedido diretamente.",
};

export default async function HomePage() {
  const stores = await fetchStores();
  const open = stores.filter((s) => s.isOpen);
  const closed = stores.filter((s) => !s.isOpen);
  const sorted = [...open, ...closed];

  return (
    <div className="min-h-screen bg-[var(--bg-page)]">
      {/* Header */}
      <header className="bg-[var(--bg-card)] border-b border-[var(--border-color)] sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-3">
          <Image src="/logo.png" alt="BCM Shopping" width={32} height={32} className="rounded-lg" />
          <span className="text-lg font-bold text-[var(--text-primary)]">
            BCM Shopping
          </span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-1">
          Lojas disponíveis
        </h1>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          {open.length} loja{open.length !== 1 ? "s" : ""} aberta
          {open.length !== 1 ? "s" : ""} agora
        </p>

        {sorted.length === 0 ? (
          <div className="text-center py-20 text-[var(--text-secondary)]">
            Nenhuma loja disponível no momento.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sorted.map((store) => (
              <StoreCard key={store.id} store={store} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function StoreCard({ store }: { store: StoreCard }) {
  const href = `/loja/${store.slug ?? store.id}`;

  return (
    <Link href={href} className="group block">
      <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl overflow-hidden hover:border-[var(--brand-primary)] transition-colors">
        {/* Banner */}
        <div className="relative h-32 bg-[var(--bg-secondary)]">
          {store.bannerUrl ? (
            <Image
              src={store.bannerUrl}
              alt={store.name}
              fill
              /* KAN-249: card de loja em grid — nunca ocupa 100vw. */
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[var(--brand-primary)] to-[var(--brand-primary-hover)] opacity-20" />
          )}
          {/* Status badge */}
          <span
            className={`absolute top-2 right-2 text-xs font-semibold px-2 py-0.5 rounded-full ${
              store.isOpen
                ? "bg-green-500/90 text-white"
                : "bg-black/60 text-white/80"
            }`}
          >
            {store.isOpen ? "Aberto" : "Fechado"}
          </span>
          {/* Logo */}
          <div className="absolute -bottom-5 left-4 w-12 h-12 rounded-xl border-2 border-[var(--bg-card)] bg-[var(--bg-card)] overflow-hidden shadow">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                fill
                /* KAN-249: logo tem 48px fixos (w-12 h-12) — servir 100vw aqui
                   era desperdicio puro de banda. */
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

          {/* Rating */}
          {store.totalRatings > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              <Star size={12} className="text-yellow-400 fill-yellow-400" />
              <span className="text-xs text-[var(--text-secondary)]">
                {store.averageRating.toFixed(1)} ({store.totalRatings})
              </span>
            </div>
          )}

          {/* Chips */}
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Clock size={11} />
              {store.estimatedDeliveryMinutes} min
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-secondary)]">
              <Truck size={11} />
              {store.freeDelivery
                ? "Entrega grátis"
                : new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(store.deliveryFee)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
