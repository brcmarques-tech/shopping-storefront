'use client';

import { useEffect, useState } from 'react';

interface Category {
  id: string;
  name: string;
}

export function CategoryNav({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState<string>(categories[0]?.id ?? '');

  useEffect(() => {
    const handler = () => {
      for (const cat of [...categories].reverse()) {
        const el = document.getElementById(`cat-${cat.id}`);
        if (el && el.getBoundingClientRect().top <= 120) {
          setActive(cat.id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, [categories]);

  const scrollTo = (id: string) => {
    const el = document.getElementById(`cat-${id}`);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: 'smooth' });
      setActive(id);
    }
  };

  if (categories.length === 0) return null;

  return (
    <div
      className="sticky top-0 z-[var(--z-sticky)] bg-[var(--bg-card)] border-b border-[var(--border-color)] shadow-sm"
    >
      <div className="max-w-4xl mx-auto px-4 flex gap-1 overflow-x-auto scrollbar-none py-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => scrollTo(cat.id)}
            className={`whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              active === cat.id
                ? 'bg-[var(--brand-primary)] text-white'
                : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>
    </div>
  );
}
