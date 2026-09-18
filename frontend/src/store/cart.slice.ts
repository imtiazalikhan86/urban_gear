import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Product, QuotePreviewResponse } from '../types/api';
import type { RootState } from './store';

export interface CartLine {
  product: Pick<Product, 'id' | 'name' | 'price' | 'currency'>;
  quantity: number;
}

interface CartState {
  lines: Record<string, CartLine>;
  quote: QuotePreviewResponse['data'] | null;
}

const initialState: CartState = { lines: {}, quote: null };

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    itemAdded: (state, action: PayloadAction<Product>) => {
      const { id, name, price, currency } = action.payload;
      const line = state.lines[id];
      if (line) line.quantity += 1;
      else state.lines[id] = { product: { id, name, price, currency }, quantity: 1 };
      state.quote = null;
    },
    quantityChanged: (state, action: PayloadAction<{ productId: string; change: number }>) => {
      const line = state.lines[action.payload.productId];
      if (!line) return;
      line.quantity += action.payload.change;
      if (line.quantity <= 0) delete state.lines[action.payload.productId];
      state.quote = null;
    },
    quotePreviewed: (state, action: PayloadAction<QuotePreviewResponse['data']>) => {
      state.quote = action.payload;
    },
    cartCleared: (state) => {
      state.lines = {};
      state.quote = null;
    },
  },
});

export const { itemAdded, quantityChanged, quotePreviewed, cartCleared } = cartSlice.actions;
export const selectCartLines = (state: RootState) => Object.values(state.cart.lines);
export const selectCartCount = (state: RootState) =>
  Object.values(state.cart.lines).reduce((total, line) => total + line.quantity, 0);
export default cartSlice.reducer;
