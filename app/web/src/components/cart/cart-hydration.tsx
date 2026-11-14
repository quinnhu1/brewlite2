"use client";

import { useEffect } from "react";
import { useCartStore } from "@/store/useCartStore";

/**
 * Rehydrates the persisted cart after mount. The store opts into
 * `skipHydration` so the server-rendered markup matches the empty cart.
 */
export default function CartHydration() {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);

  return null;
}
