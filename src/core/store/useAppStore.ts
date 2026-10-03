import { create } from 'zustand';

interface AppState {
  themeMode: 'light' | 'dark' | 'system';
  isSidebarOpen: boolean;
  activeWarehouseId: string | null;
  setThemeMode: (mode: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  setSidebarOpen: (isOpen: boolean) => void;
  setActiveWarehouseId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  themeMode: 'system',
  isSidebarOpen: true,
  activeWarehouseId: null,
  setThemeMode: (themeMode) => set({ themeMode }),
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (isSidebarOpen) => set({ isSidebarOpen }),
  setActiveWarehouseId: (activeWarehouseId) => set({ activeWarehouseId }),
}));
