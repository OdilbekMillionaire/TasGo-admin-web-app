import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { CartItem } from "@tasgo/types";
import { calculateDeliveryFee } from "@tasgo/config";

interface CartStore {
  items: CartItem[];
  promoCode: string | null;
  promoDiscount: number; // in tiyin
  totalItems: number;
  subtotalTiyin: number;
  deliveryFeeTiyin: number;
  totalTiyin: number;

  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  applyPromo: (code: string, discountTiyin: number) => void;
  clearPromo: () => void;
}

function computeTotals(items: CartItem[], promoDiscount: number) {
  const subtotalTiyin = items.reduce((sum, i) => sum + i.priceUzs * i.quantity, 0);
  const deliveryFeeTiyin = calculateDeliveryFee(subtotalTiyin);
  const totalTiyin = Math.max(0, subtotalTiyin + deliveryFeeTiyin - promoDiscount);
  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  return { subtotalTiyin, deliveryFeeTiyin, totalTiyin, totalItems };
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      promoCode: null,
      promoDiscount: 0,
      totalItems: 0,
      subtotalTiyin: 0,
      deliveryFeeTiyin: 0,
      totalTiyin: 0,

      addItem(newItem) {
        set((state) => {
          const existing = state.items.find((i) => i.productId === newItem.productId);
          const items = existing
            ? state.items.map((i) =>
                i.productId === newItem.productId
                  ? { ...i, quantity: i.quantity + (newItem.quantity ?? 1) }
                  : i
              )
            : [...state.items, { ...newItem, quantity: newItem.quantity ?? 1 }];
          return { items, ...computeTotals(items, state.promoDiscount) };
        });
      },

      removeItem(productId) {
        set((state) => {
          const items = state.items.filter((i) => i.productId !== productId);
          return { items, ...computeTotals(items, state.promoDiscount) };
        });
      },

      updateQuantity(productId, quantity) {
        set((state) => {
          const items =
            quantity <= 0
              ? state.items.filter((i) => i.productId !== productId)
              : state.items.map((i) =>
                  i.productId === productId ? { ...i, quantity } : i
                );
          return { items, ...computeTotals(items, state.promoDiscount) };
        });
      },

      clearCart() {
        set({ items: [], promoCode: null, promoDiscount: 0, totalItems: 0, subtotalTiyin: 0, deliveryFeeTiyin: 0, totalTiyin: 0 });
      },

      applyPromo(code, discountTiyin) {
        set((state) => ({
          promoCode: code,
          promoDiscount: discountTiyin,
          ...computeTotals(state.items, discountTiyin),
        }));
      },

      clearPromo() {
        set((state) => ({
          promoCode: null,
          promoDiscount: 0,
          ...computeTotals(state.items, 0),
        }));
      },
    }),
    {
      name: "tasgo-cart",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
