import { ProductCard } from './ProductCard';

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

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface Props {
  categories: Category[];
  storeId: string;
  storeName: string;
  onConflict: (product: Product) => void;
}

export function ProductGrid({ categories, storeId, storeName, onConflict }: Props) {
  const active = categories.filter((c) => c.products.length > 0);
  if (active.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center text-[var(--text-muted)]">
        Nenhum produto disponível no momento.
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pb-32">
      {active.map((category) => (
        <section key={category.id} id={`cat-${category.id}`} className="pt-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            {category.name}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {category.products.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                storeId={storeId}
                storeName={storeName}
                onConflict={onConflict}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
