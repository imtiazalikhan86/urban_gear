import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import { tokenStorage } from '../services/http';
import type { User } from '../types/api';

interface AuthState {
  token: string | null;
  user: User | null;
  sessionExpired: boolean;
}

const initialState: AuthState = {
  token: tokenStorage.access(),
  user: null,
  sessionExpired: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn: (state, action: PayloadAction<{ token: string; refreshToken: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.sessionExpired = false;
      tokenStorage.save(action.payload.token, action.payload.refreshToken);
    },
    tokenRefreshed: (state) => {
      state.token = tokenStorage.access();
    },
    signedOut: (state) => {
      state.token = null;
      state.user = null;
      state.sessionExpired = false;
      tokenStorage.clear();
    },
    sessionExpired: (state) => {
      state.token = null;
      state.user = null;
      state.sessionExpired = true;
      tokenStorage.clear();
    },
    userUpdated: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
});

export const { signedIn, signedOut, sessionExpired, tokenRefreshed, userUpdated } = authSlice.actions;
export default authSlice.reducer;
