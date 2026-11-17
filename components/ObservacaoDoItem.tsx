'use client';

import { useState } from 'react';
import { useCart } from '@/lib/useCart';

/** Observação de um item do carrinho (ex.: "sem cebola"). Vai junto no pedido. */
export function ObservacaoDoItem({ productId, notes }: { productId: string; notes?: string }) {
  const { updateNotes } = useCart();
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(notes || '');

  if (!editando) {
    return (
      <button
        type="button"
        onClick={() => { setTexto(notes || ''); setEditando(true); }}
        className="mt-1 block text-left text-xs text-[var(--text-muted)] hover:text-[var(--brand-primary)]"
      >
        {notes ? <>📝 {notes}</> : '+ Observação'}
      </button>
    );
  }

  const salvar = () => {
    updateNotes(productId, texto.trim());
    setEditando(false);
  };

  return (
    <div className="mt-1.5 space-y-1.5">
      <textarea
        autoFocus
        rows={2}
        maxLength={200}
        value={texto}
        onChange={(e) => setTexto(e.target.value)}
        placeholder="Ex.: sem cebola, bem passado"
        aria-label="Observação do item"
        className="w-full px-2.5 py-1.5 rounded-lg border border-[var(--border-color)] bg-[var(--bg-card)] text-[var(--text-primary)] text-xs resize-none"
      />
      <div className="flex gap-3 text-xs">
        <button type="button" onClick={salvar} className="font-semibold text-[var(--brand-primary)]">Salvar</button>
        <button type="button" onClick={() => setEditando(false)} className="text-[var(--text-muted)]">Cancelar</button>
      </div>
    </div>
  );
}
