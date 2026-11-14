'use client';

import { useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { getProductImageUrl } from '@/data/categories';
import { fetchProductById } from '@/lib/api/products';
import type { ApiProductDetail } from '@/lib/api/products';
import type { DrinkSize, ToppingOption } from '@/store/useCartStore';

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
  stock: number;
  isBestSeller?: boolean;
  bestSellerRank?: number | null;
}

export interface AddToCartPayload {
  product_id: string;
  product_name: string;
  image_url: string;
  base_price: number;
  size: DrinkSize;
  add_price: number;
  toppings: ToppingOption[];
  quantity: number;
  stock: number;
}

interface ProductDetailProps {
  product: Product;
  onBack?: () => void;
  onAddToCart: (orderData: AddToCartPayload) => void;
}

const money = (value: number) => new Intl.NumberFormat('vi-VN').format(value);

export default function ProductDetail({ product, onAddToCart }: ProductDetailProps) {
  const [details, setDetails] = useState<ApiProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSize, setSelectedSize] = useState<DrinkSize>('S');
  const [selectedToppings, setSelectedToppings] = useState<ToppingOption[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [addedMessage, setAddedMessage] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    fetchProductById(product.id, controller.signal)
      .then((data) => {
        setDetails(data);
        const firstSize = data.product_size[0]?.size;
        if (firstSize === 'S' || firstSize === 'M' || firstSize === 'L') {
          setSelectedSize(firstSize);
        }
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setError(reason instanceof Error ? reason.message : 'Could not load product details.');
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [product.id]);

  const basePrice = Number(details?.basePrice ?? product.price);
  const currentSize = details?.product_size.find((option) => option.size === selectedSize);
  const sizeExtra = Number(currentSize?.add_price ?? 0);
  const toppingsPrice = selectedToppings.reduce((sum, topping) => sum + topping.price, 0);
  const unitPrice = basePrice + sizeExtra + toppingsPrice;
  const sizeOptions = useMemo(() => details?.product_size ?? [], [details]);
  const toppingOptions = useMemo<ToppingOption[]>(
    () =>
      (details?.toppings ?? []).map((topping) => ({
        topping_id: topping.topping_id,
        topping_name: topping.topping_name,
        price: Number(topping.price),
        is_active: true,
      })),
    [details],
  );

  const toggleTopping = (topping: ToppingOption) => {
    setSelectedToppings((previous) =>
      previous.some((item) => item.topping_id === topping.topping_id)
        ? previous.filter((item) => item.topping_id !== topping.topping_id)
        : [...previous, topping],
    );
  };

  const handleAdd = () => {
    if (!details) return;
    if (!currentSize) {
      setError(`This product does not offer size ${selectedSize}.`);
      return;
    }
    if (details.stock < quantity) {
      setError(`Only ${details.stock} serving(s) remain in stock.`);
      return;
    }

    onAddToCart({
      product_id: details.productId,
      product_name: details.productName,
      image_url: getProductImageUrl(details.imageUrl),
      base_price: basePrice,
      size: selectedSize,
      add_price: sizeExtra,
      toppings: selectedToppings,
      quantity,
      stock: details.stock,
    });
    setAddedMessage(`${quantity} × ${details.productName} added to your cart.`);
    setError('');
  };

  return (
    <section className="mx-auto grid w-full max-w-[1120px] grid-cols-1 items-center gap-10 py-5 md:grid-cols-[395px_minmax(0,1fr)] md:gap-[76px]">
      <article className="mx-auto flex min-h-[470px] w-full max-w-[395px] flex-col rounded-[18px] bg-white px-7 py-6 text-[#2B100C]">
        <div className="relative mx-auto mb-8 h-[270px] w-full max-w-[236px] overflow-hidden bg-[#eee5dc]">
          <Image
            src={getProductImageUrl(product.image)}
            alt={product.name}
            fill
            priority
            className="object-contain"
            sizes="(max-width: 768px) 90vw, 236px"
          />
        </div>
        <h2 className="text-[25px] font-bold leading-tight">{product.name}</h2>
        <div className="mt-auto flex items-center justify-between gap-4 pt-7">
          <div className="flex items-center gap-3 text-[26px] font-bold tabular-nums">
            <svg aria-hidden="true" className="h-6 w-6 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8Z" />
              <circle cx="7.5" cy="7.5" r="1.2" />
            </svg>
            <span>{money(unitPrice)}</span>
          </div>
          <div className="flex h-9 items-center gap-4 rounded-full bg-[#715039] px-4 text-[17px] font-bold text-white">
            <button type="button" aria-label="Increase quantity" disabled={quantity >= product.stock} onClick={() => setQuantity((value) => Math.min(value + 1, product.stock))} className="leading-none disabled:opacity-40">+</button>
            <span className="min-w-3 text-center tabular-nums">{quantity}</span>
            <button type="button" aria-label="Decrease quantity" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="leading-none">-</button>
          </div>
        </div>
      </article>

      <div className="mx-auto w-full max-w-[560px] text-center text-[#2B100C]">
        {loading && <p className="py-8 text-sm text-[#715039]">Loading size and toppings…</p>}
        {error && <div role="alert" className="mb-4 rounded-lg border border-[#9C6C55] bg-white px-4 py-3 text-left text-sm text-[#602d20]">{error}</div>}

        {!loading && details && (
          <>
            <section className="mb-8">
              <h3 className="mb-5 text-[28px] font-bold lowercase">size</h3>
              <div className="flex flex-wrap justify-center gap-5">
                {sizeOptions.map((option) => (
                  <button
                    key={option.size_id}
                    type="button"
                    aria-pressed={selectedSize === option.size}
                    onClick={() => setSelectedSize(option.size)}
                    title={`${option.size}${Number(option.add_price) ? `, +${money(Number(option.add_price))} VND` : ''}`}
                    className={`min-w-[74px] rounded-[14px] px-4 py-2 text-[25px] font-semibold leading-none text-white transition-colors ${selectedSize === option.size ? 'bg-[#2B100C]' : 'bg-[#715039] hover:bg-[#5c3c2a]'}`}
                  >
                    {details.categories === 'Pastry & Dessert' ? 'Standard portion' : option.size}
                  </button>
                ))}
              </div>
            </section>

            <section className="mb-10">
              <h3 className="mb-5 text-[28px] font-bold lowercase">topping</h3>
              {toppingOptions.length === 0 ? (
                <p className="text-sm text-[#715039]">No toppings are available for this drink.</p>
              ) : (
                <div className="mx-auto grid max-w-[460px] grid-cols-1 gap-x-9 gap-y-4 text-left sm:grid-cols-2">
                  {toppingOptions.map((topping) => {
                    const checked = selectedToppings.some((item) => item.topping_id === topping.topping_id);
                    return (
                      <label key={topping.topping_id} className="flex cursor-pointer items-center gap-3 text-[17px]">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleTopping(topping)}
                          className="h-[17px] w-[17px] shrink-0 appearance-none rounded-full border border-[#8b6c56] bg-transparent checked:border-[#2B100C] checked:bg-[#2B100C] checked:ring-2 checked:ring-[#f2ebe4] checked:ring-offset-1 checked:ring-offset-[#f2ebe4]"
                        />
                        <span>{topping.topping_name}</span>
                      </label>
                    );
                  })}
                </div>
              )}
            </section>

            <button
              type="button"
              onClick={handleAdd}
              disabled={details.stock < 1 || !currentSize}
              className="mx-auto min-h-[60px] w-full max-w-[292px] rounded-[18px] bg-[#715039] px-7 py-4 text-[20px] font-semibold text-white transition hover:bg-[#2B100C] disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add to cart
            </button>
            {addedMessage && (
              <div role="status" className="mx-auto mt-4 max-w-[360px] rounded-lg border border-[#cbb7a6] bg-white/70 px-3 py-2 text-sm text-[#513421]">
                {addedMessage}
              </div>
            )}
            <p className="mt-3 text-xs text-[#7f6655]">{details.stock} serving(s) available</p>
          </>
        )}
      </div>
    </section>
  );
}
