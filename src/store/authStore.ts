import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  userRole: 'teacher' | 'student' | null;
  setUser: (user: User | null) => void;
  setUserRole: (role: 'teacher' | 'student' | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      userRole: null,
      setUser: (user) => set({ user }),
      setUserRole: (role) => set({ userRole: role }),
      logout: () => set({ user: null, userRole: null }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
