"use client";
import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";
export default function CartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
  return null;
}
