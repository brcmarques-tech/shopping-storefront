'use client';

import { ShoppingBag } from 'lucide-react';

export default function Error() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <ShoppingBag size={48} className="text-[var(--text-muted)]" />
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Loja não encontrada
      </h1>
      <p className="text-[var(--text-muted)] max-w-sm">
        O link que você acessou pode estar incorreto ou a loja foi desativada.
      </p>
    </div>
  );
}
