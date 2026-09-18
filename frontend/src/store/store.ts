import { configureStore } from '@reduxjs/toolkit';
import authReducer from './auth.slice';
import cartReducer from './cart.slice';
import notificationReducer from './notification.slice';
import uiReducer from './ui.slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    notifications: notificationReducer,
    ui: uiReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
