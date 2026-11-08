'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProductDetail from '@/components/menu/product-detail';
import type { Product } from '@/components/menu/product-detail';
import { fetchProducts } from '@/lib/api/products';
import { getProductImageUrl } from '@/data/categories';
import { useCartStore } from '@/store/useCartStore';

function ProductDetailPageContent() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const addItem = useCartStore((state) => state.addItem);
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetchProducts(controller.signal)
      .then((apiProducts) => {
        const item = apiProducts.find((candidate) => candidate.productId === params.id);
        if (!item) {
          setProduct(null);
          setError('Không tìm thấy sản phẩm này trong menu.');
          return;
        }

        setError('');
        setProduct({
          id: item.productId,
          name: item.productName,
          price: Number(item.basePrice),
          category: item.categories || 'Khác',
          image: getProductImageUrl(item.imageUrl),
          stock: item.stock,
          isBestSeller: item.isBestSeller,
        });
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Không tải được sản phẩm.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [params.id]);

  // Khi URL đổi ID, không hiển thị sản phẩm cũ trong lúc request mới đang chạy.
  const isCurrentProductLoaded = product?.id === params.id;

  if (error && !isCurrentProductLoaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f2ebe4] px-6 pt-24">
        <div className="max-w-lg rounded-2xl border border-rose-200 bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-rose-800">Không thể tải sản phẩm</h1>
          <p className="mt-2 text-sm text-stone-700">{error}</p>
          <button
            type="button"
            onClick={() => router.push('/menu')}
            className="mt-4 rounded-lg bg-[#6F4E37] px-4 py-2 text-sm font-bold text-white"
          >
            Quay lại menu
          </button>
        </div>
      </main>
    );
  }

  if (loading || !isCurrentProductLoaded || !product) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#f2ebe4] px-6 pt-24 text-[#6F4E37]">
        Đang tải sản phẩm…
      </main>
    );
  }

  return (
    <main className="min-h-screen w-full bg-[#f2ebe4] px-6 pb-10 pt-24 md:px-12">
      <ProductDetail
        key={product.id}
        product={product}
        onBack={() => router.push('/menu')}
        onAddToCart={(payload) => {
          addItem(payload);
          router.push('/cart');
        }}
      />
    </main>
  );
}

export default function ProductDetailPage() {
  return (
    <Suspense
      fallback={(
        <div className="flex min-h-screen w-full items-center justify-center bg-[#f2ebe4] pb-10 text-[#6F4E37]">
          Đang tải trang sản phẩm…
        </div>
      )}
    >
      <ProductDetailPageContent />
    </Suspense>
  );
}
