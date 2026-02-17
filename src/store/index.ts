import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem, User, Register, CashDrawer, Product } from '../types';

interface ViewedProduct {
  id: string;
  name: string;
  image_url: string;
  price: number;
  viewedAt: number;
}

interface StoreState {
  user: User | null;
  cart: CartItem[];
  activeRegister: Register | null;
  activeCashDrawer: CashDrawer | null;
  viewedProducts: ViewedProduct[];
  selectedProductId: string | null;
  showQuickView: boolean;

  setUser: (user: User | null) => void;
  setActiveRegister: (register: Register | null) => void;
  setActiveCashDrawer: (drawer: CashDrawer | null) => void;
  addToCart: (item: CartItem) => void;
  removeFromCart: (productId: string, variantId?: string) => void;
  updateCartQuantity: (productId: string, variantId?: string, change: number) => void;
  clearCart: () => void;

  addViewedProduct: (product: Product) => void;
  getRecentlyViewed: (limit?: number) => ViewedProduct[];
  clearViewHistory: () => void;
  setSelectedProduct: (productId: string | null) => void;
  setShowQuickView: (show: boolean) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      user: null,
      cart: [],
      activeRegister: null,
      activeCashDrawer: null,
      viewedProducts: [],
      selectedProductId: null,
      showQuickView: false,

      setUser: (user) => set({ user }),
      setActiveRegister: (register) => set({ activeRegister: register }),
      setActiveCashDrawer: (drawer) => set({ activeCashDrawer: drawer }),

      addToCart: (item) =>
        set((state) => {
          const existingItem = state.cart.find(
            (cartItem) =>
              cartItem.product.id === item.product.id &&
              cartItem.variant?.id === item.variant?.id
          );

          if (existingItem) {
            const newQuantity = existingItem.quantity + item.quantity;
            if (newQuantity > existingItem.product.stock) {
              return state;
            }

            return {
              ...state,
              cart: state.cart.map((cartItem) =>
                cartItem === existingItem
                  ? { ...cartItem, quantity: newQuantity }
                  : cartItem
              ),
            };
          }

          return { ...state, cart: [...state.cart, item] };
        }),

      updateCartQuantity: (productId, variantId, change) =>
        set((state) => {
          return {
            ...state,
            cart: state.cart.map((item) => {
              if (
                item.product.id === productId &&
                (variantId ? item.variant?.id === variantId : !item.variant)
              ) {
                const newQuantity = item.quantity + change;

                if (newQuantity < 1) {
                  return item;
                }

                if (newQuantity > item.product.stock) {
                  return item;
                }

                return {
                  ...item,
                  quantity: newQuantity,
                };
              }
              return item;
            }),
          };
        }),

      removeFromCart: (productId, variantId) =>
        set((state) => ({
          ...state,
          cart: state.cart.filter(
            (item) =>
              !(
                item.product.id === productId &&
                (variantId ? item.variant?.id === variantId : !item.variant)
              )
          ),
        })),

      clearCart: () => set((state) => ({ ...state, cart: [] })),

      addViewedProduct: (product) =>
        set((state) => {
          const viewed: ViewedProduct = {
            id: product.id,
            name: product.name,
            image_url: product.image_url,
            price: product.price,
            viewedAt: Date.now(),
          };

          const filtered = state.viewedProducts.filter((p) => p.id !== product.id);
          const updated = [viewed, ...filtered].slice(0, 20);

          return { ...state, viewedProducts: updated };
        }),

      getRecentlyViewed: (limit = 5) => {
        const state = get();
        return state.viewedProducts.slice(0, limit);
      },

      clearViewHistory: () => set({ viewedProducts: [] }),

      setSelectedProduct: (productId) => set({ selectedProductId: productId }),

      setShowQuickView: (show) => set({ showQuickView: show }),
    }),
    {
      name: 'penchic-farm-storage',
    }
  )
);