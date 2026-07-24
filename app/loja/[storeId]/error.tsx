'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

/**
 * KAN-257: este error boundary dizia "Loja não encontrada" para QUALQUER erro
 * de runtime (GraphQL fora do ar, timeout, etc.) e não oferecia nenhuma saída.
 * Loja realmente inexistente já é tratada por `notFound()` (not-found.tsx), não
 * por aqui — então a mensagem antiga era enganosa: uma falha transitória de
 * rede aparecia como "essa loja não existe".
 *
 * Agora recebe `{ error, reset }` (contrato do App Router), mostra uma mensagem
 * genérica honesta e um botão que tenta renderizar o segmento de novo.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[storefront] erro ao carregar a loja:', error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[var(--bg-page)] flex flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle size={48} className="text-[var(--text-muted)]" />
      <h1 className="text-2xl font-bold text-[var(--text-primary)]">
        Algo deu errado
      </h1>
      <p className="text-[var(--text-muted)] max-w-sm">
        Não conseguimos carregar esta loja agora. Pode ser uma instabilidade
        temporária de conexão.
      </p>
      <button
        onClick={reset}
        className="inline-flex items-center gap-2 mt-2 px-5 py-2.5 rounded-xl bg-[var(--brand-primary)] text-white font-semibold hover:opacity-90 transition-opacity"
      >
        <RotateCw size={16} />
        Tentar novamente
      </button>
      {error?.digest && (
        <p className="text-xs text-[var(--text-muted)] mt-2">
          Código do erro: {error.digest}
        </p>
      )}
    </div>
  );
}
