'use client';

import { Suspense, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import ProductDetail from '@/components/menu/product-detail';
import type { AddToCartPayload, Product } from '@/components/menu/product-detail';
import { fetchProducts } from '@/lib/api/products';
import { getProductImageUrl } from '@/data/categories';
import { useCartStore } from '@/store/useCartStore';

const CATEGORY_TABS = ['Classic Coffee', 'Cold & Brewed', 'Tea', 'Pastry & Dessert', 'Best Sellers'] as const;
const CATEGORY_ALIASES: Record<string, string[]> = {
  'Classic Coffee': ['coffee', 'classic coffee', 'cà phê', 'cafe'],
  'Cold & Brewed': ['cold & brewed', 'cold brew', 'iced coffee', 'đá xay'],
  Tea: ['tea', 'trà', 'trà sữa'],
  'Pastry & Dessert': ['pastry & dessert', 'pastry', 'dessert', 'bánh', 'tráng miệng'],
};

function MenuContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addedMessage, setAddedMessage] = useState('');
  const addItem = useCartStore((state) => state.addItem);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal)
      .then((apiProducts) => {
        const normalized: Product[] = apiProducts.map((item) => ({
          id: item.productId,
          name: item.productName,
          price: Number(item.basePrice),
          category: item.categories || 'Other',
          image: getProductImageUrl(item.imageUrl),
          stock: item.stock,
          isBestSeller: item.isBestSeller,
        }));
        setProducts(normalized);
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load the menu.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, []);

  const defaultCategory = CATEGORY_TABS.find((category) => products.some((item) => CATEGORY_ALIASES[category]?.includes(item.category.trim().toLowerCase()))) ?? 'Classic Coffee';
  const activeCategory = searchParams.get('category') || (searchParams.get('search') ? 'All' : defaultCategory);
  const search = searchParams.get('search')?.trim().toLocaleLowerCase() ?? '';
  const filteredProducts = useMemo(() => products.filter((product) => {
    if(search && !product.name.toLocaleLowerCase().includes(search))return false;
    if (activeCategory === 'All') return true;
    if (activeCategory === 'Best Sellers') return Boolean(product.isBestSeller);
    const aliases = CATEGORY_ALIASES[activeCategory] ?? [activeCategory.toLowerCase()];
    return aliases.includes(product.category.toLowerCase());
  }), [activeCategory, products, search]);

  const handleAddToCart = (payload: AddToCartPayload) => {
    addItem(payload);
    setAddedMessage(`${payload.product_name} added to your cart.`);
  };

  return (
    <main className="min-h-screen w-full bg-[#f2ebe4] px-5 pb-20 pt-28 text-[#2b100c] md:px-10">
      <div className="mx-auto max-w-[1240px]">
        <nav className="mb-14 flex flex-wrap items-center justify-center gap-3 sm:gap-5" aria-label="Product categories">
          {CATEGORY_TABS.map((category) => {
            const active = activeCategory === category;
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  setSelectedProduct(null);
                  setAddedMessage('');
                  router.push(`/menu?category=${encodeURIComponent(category)}`, { scroll: false });
                }}
                className={`min-h-[48px] rounded-full px-5 py-3 text-sm font-semibold text-white transition-colors sm:min-w-[132px] sm:text-base ${active ? 'bg-[#2b100c]' : 'bg-[#715039] hover:bg-[#5b3c2a]'}`}
              >
                {category}
              </button>
            );
          })}
        </nav>

        {search && <p className="mb-5 text-center">Search: {search}</p>}
        {addedMessage && (
          <div className="mx-auto mb-5 flex max-w-[680px] flex-wrap items-center justify-between gap-3 rounded-lg border border-[#cbb7a6] bg-white/70 px-4 py-3 text-sm text-[#513421]">
            <span>{addedMessage}</span>
            <button type="button" onClick={() => router.push('/cart')} className="font-bold underline underline-offset-4">View cart</button>
          </div>
        )}

        {loading && <div className="py-20 text-center text-[#715039]">Loading menu…</div>}
        {error && (
          <div role="alert" className="mx-auto max-w-xl rounded-xl border border-[#c39f8c] bg-white p-5 text-[#552c1f]">
            <p className="font-bold">Could not load menu</p>
            <p className="mt-2 text-sm">{error}. Please try again later.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-4 rounded-full bg-[#2b100c] px-5 py-2 text-sm font-semibold text-white">Try again</button>
          </div>
        )}

        {!loading && !error && selectedProduct && (
          <ProductDetail
            key={selectedProduct.id}
            product={selectedProduct}
            onBack={() => setSelectedProduct(null)}
            onAddToCart={handleAddToCart}
          />
        )}

        {!loading && !error && !selectedProduct && (
          filteredProducts.length === 0 ? (
            <div className="py-24 text-center">
              <p className="text-xl font-semibold">No items in {activeCategory} yet</p>
              <p className="mt-2 text-sm text-[#715039]">Choose another category to browse the available menu.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {filteredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => { setSelectedProduct(product); setAddedMessage(''); }}
                  className="group flex min-h-[300px] flex-col rounded-[18px] bg-white p-5 text-left text-[#2b100c] transition hover:-translate-y-0.5"
                >
                  <div className="relative mb-5 h-[190px] w-full overflow-hidden bg-[#eee5dc]">
                    <Image src={product.image} alt={product.name} fill className="object-contain transition-transform duration-300 group-hover:scale-[1.03]" sizes="(max-width: 768px) 100vw, 33vw" />
                  </div>
                  <div className="mt-auto flex items-end justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-bold">{product.name}</h2>
                      <p className="mt-1 text-sm text-[#715039]">{product.stock > 0 ? `${product.stock} available` : 'Sold out'}</p>
                    </div>
                    <span className="flex items-center gap-2 font-bold tabular-nums">{new Intl.NumberFormat('vi-VN').format(product.price)}<span aria-hidden="true" className="rounded-full bg-[#715039] px-1.5 text-lg leading-5 text-white">+</span></span>
                  </div>
                </button>
              ))}
            </div>
          )
        )}
      </div>
    </main>
  );
}

export default function MenuPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#f2ebe4] text-[#715039]">Loading menu…</div>}>
      <MenuContent />
    </Suspense>
  );
}
