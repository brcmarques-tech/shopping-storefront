import Image from 'next/image';
import { MapPin, Clock, Truck, ShoppingBag, Star } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { StoreStatusBadge } from './StoreStatusBadge';

interface StoreData {
  id: string;
  name: string;
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
  averageRating: number;
  totalRatings: number;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
}

export function StoreHeader({ store }: { store: StoreData }) {
  return (
    <div>
      {/* Banner */}
      <div className="relative w-full h-48 md:h-64 bg-[var(--bg-muted)] overflow-hidden">
        {store.bannerUrl ? (
          <Image
            src={store.bannerUrl}
            alt={`Banner de ${store.name}`}
            fill
            className="object-cover"
            priority
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={48} className="text-[var(--text-muted)]" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      </div>

      {/* Info card */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="relative -mt-14 pb-4">
          {/* Logo */}
          <div className="w-24 h-24 rounded-full border-4 border-[var(--bg-card)] bg-[var(--bg-card)] overflow-hidden shadow-md">
            {store.logoUrl ? (
              <Image
                src={store.logoUrl}
                alt={store.name}
                width={96}
                height={96}
                className="object-cover w-full h-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-[var(--bg-muted)]">
                <ShoppingBag size={32} className="text-[var(--text-muted)]" />
              </div>
            )}
          </div>

          <div className="mt-3 flex flex-wrap items-start gap-2">
            <h1 className="text-2xl font-bold text-[var(--text-primary)] mr-2">
              {store.name}
            </h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <StoreStatusBadge isOpen={store.isOpen} />
              <VerificationBadge level={store.verificationLevel} />
            </div>
          </div>

          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-[var(--text-muted)]">
            <span className="flex items-center gap-1">
              <MapPin size={13} />
              {store.city}, {store.state}
            </span>
            {store.averageRating > 0 && (
              <span className="flex items-center gap-1">
                <Star size={13} className="text-yellow-400 fill-yellow-400" />
                {store.averageRating.toFixed(1)} ({store.totalRatings})
              </span>
            )}
          </div>

          {/* Delivery info chips */}
          <div className="mt-3 flex flex-wrap gap-2">
            <span className="flex items-center gap-1.5 text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] px-3 py-1.5 rounded-full">
              <Clock size={12} />
              {store.estimatedDeliveryMinutes} min
            </span>
            <span className="flex items-center gap-1.5 text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] px-3 py-1.5 rounded-full">
              <Truck size={12} />
              {store.freeDelivery
                ? 'Frete grátis'
                : `Entrega ${formatCurrency(store.deliveryFee)}`}
            </span>
            {store.minimumOrder > 0 && (
              <span className="text-xs bg-[var(--bg-muted)] text-[var(--text-secondary)] px-3 py-1.5 rounded-full">
                Mín. {formatCurrency(store.minimumOrder)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
