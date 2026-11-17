import Link from 'next/link';
import { SearchX } from 'lucide-react';

/**
 * Página 404 do site (loja inexistente cai aqui via notFound()). Sem este
 * arquivo o Next mostrava a página padrão, em inglês.
 */
export default function NotFound() {
  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <SearchX size={48} className="text-[var(--text-muted)]" />
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">Página não encontrada</h1>
      <p className="text-[var(--text-muted)] max-w-sm">
        O endereço pode estar errado ou a loja saiu do ar.
      </p>
      <Link
        href="/"
        className="mt-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
      >
        Ver lojas
      </Link>
    </div>
  );
}
