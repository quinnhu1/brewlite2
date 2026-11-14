import { apiRequest } from "./client";
export interface ApiProduct {
  productId: string;
  productName: string;
  description: string | null;
  basePrice: number | string;
  imageUrl: string | null;
  stock: number;
  categories: string | null;
  isBestSeller?: boolean;
}
export interface ApiSize {
  size_id: string;
  size: "S" | "M" | "L";
  add_price: number | string;
}
export interface ApiTopping {
  topping_id: string;
  topping_name: string;
  price: number | string;
}
export interface ApiProductDetail extends ApiProduct {
  product_size: ApiSize[];
  toppings: ApiTopping[];
}
export const fetchProducts = (signal?: AbortSignal) =>
  apiRequest<ApiProduct[]>("/products", { signal });
export const fetchProductById = (id: string, signal?: AbortSignal) =>
  apiRequest<ApiProductDetail>(`/products/${encodeURIComponent(id)}`, {
    signal,
  });
