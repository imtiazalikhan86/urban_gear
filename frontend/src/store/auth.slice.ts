import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types/api';

interface AuthState {
  token: string | null;
  user: User | null;
}

const initialState: AuthState = {
  token: localStorage.getItem('urbangear.accessToken'),
  user: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    signedIn: (state, action: PayloadAction<{ token: string; user: User }>) => {
      state.token = action.payload.token;
      state.user = action.payload.user;
      localStorage.setItem('urbangear.accessToken', action.payload.token);
    },
    signedOut: (state) => {
      state.token = null;
      state.user = null;
      localStorage.removeItem('urbangear.accessToken');
    },
    userUpdated: (state, action: PayloadAction<User>) => {
      state.user = action.payload;
    },
  },
});

export const { signedIn, signedOut, userUpdated } = authSlice.actions;
export default authSlice.reducer;
