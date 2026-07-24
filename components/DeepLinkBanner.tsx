'use client';

import { useEffect, useState } from 'react';
import { X, Smartphone } from 'lucide-react';

export function DeepLinkBanner({ storeId }: { storeId: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const dismissed = sessionStorage.getItem('deeplink-dismissed');
    if (dismissed) return;
    const isMobile = /android|iphone|ipad|ipod/i.test(navigator.userAgent);
    if (isMobile) setVisible(true);
  }, []);

  if (!visible) return null;

  return (
    // KAN-257: era `fixed top-0`, mas o conteudo abaixo (banner da loja e a
    // CategoryNav, que tambem e sticky top-0) nao recebia offset nenhum — os
    // dois disputavam o topo no mobile, justamente onde este banner aparece.
    // Agora fica no fluxo: ocupa seu espaco, empurra o conteudo e some ao
    // rolar. E um aviso dispensavel, nao precisa ficar preso no topo.
    <div className="relative w-full z-[var(--z-toast)] bg-[var(--brand-primary)] text-white px-4 py-2 flex items-center justify-between gap-3 text-sm">
      <div className="flex items-center gap-2">
        <Smartphone size={16} />
        <span>Melhor experiência no app</span>
      </div>
      <div className="flex items-center gap-3">
        <a
          href={`shopping-app://loja/${storeId}`}
          className="font-semibold underline"
        >
          Abrir no App
        </a>
        <button
          onClick={() => {
            sessionStorage.setItem('deeplink-dismissed', '1');
            setVisible(false);
          }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
