import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface ToastMessage {
  message: string;
  tone: 'success' | 'error';
}

interface UiState {
  toast: ToastMessage | null;
}

const initialState: UiState = { toast: null };

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    toastShown: (state, action: PayloadAction<ToastMessage>) => {
      state.toast = action.payload;
    },
    toastCleared: (state) => {
      state.toast = null;
    },
  },
});

export const { toastShown, toastCleared } = uiSlice.actions;
export default uiSlice.reducer;
