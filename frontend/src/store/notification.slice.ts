import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { NotificationItem } from '../services/notification.service';
import type { RootState } from './store';

interface NotificationState {
  items: NotificationItem[];
}

const initialState: NotificationState = { items: [] };

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    notificationsLoaded: (state, action: PayloadAction<NotificationItem[]>) => {
      state.items = action.payload;
    },
    notificationReceived: (state, action: PayloadAction<NotificationItem>) => {
      if (state.items.some((item) => item.id === action.payload.id)) return;
      state.items.unshift(action.payload);
    },
    notificationRead: (state, action: PayloadAction<string>) => {
      const item = state.items.find((notification) => notification.id === action.payload);
      if (item) item.readAt = new Date().toISOString();
    },
  },
});

export const { notificationsLoaded, notificationReceived, notificationRead } = notificationSlice.actions;
export const selectNotifications = (state: RootState) => state.notifications.items;
export const selectUnreadCount = (state: RootState) =>
  state.notifications.items.filter((item) => !item.readAt).length;
export default notificationSlice.reducer;
