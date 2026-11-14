"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { fetchProducts, type ApiProduct } from "@/lib/api/products";
import { getProductImageUrl } from "@/data/categories";
export default function FeaturedProducts() {
  const [products, setProducts] = useState<ApiProduct[]>([]);
  useEffect(() => {
    const c = new AbortController();
    fetchProducts(c.signal)
      .then((items) => setProducts(items.slice(0, 3)))
      .catch(() => {});
    return () => c.abort();
  }, []);
  if (!products.length) return null;
  return (
    <section className="home-featured" aria-label="Explore our drinks">
      {products.map((product) => (
        <Link
          key={product.productId}
          href={`/menu/${product.productId}`}
          className="featured-card"
        >
          <div>
            <Image
              src={getProductImageUrl(product.imageUrl)}
              alt={product.productName}
              fill
              sizes="(max-width:700px) 85vw, 30vw"
              className="object-contain"
            />
          </div>
          <h3>{product.productName}</h3>
          <span>{Number(product.basePrice).toLocaleString("vi-VN")} đ</span>
          <b aria-hidden="true">+</b>
        </Link>
      ))}
    </section>
  );
}
