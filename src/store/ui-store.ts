import { create } from 'zustand';

interface State {
  isSideMenuOpen: boolean;
  profileDropDownOpen: boolean;
  openSideMenu: () => void;
  closeSideMenu: () => void;
  toggleProfileDropDown: () => void;
}

export const useUiStore = create<State>()((set) => ({
  isSideMenuOpen: false,
  openSideMenu: () => set({ isSideMenuOpen: true }),
  closeSideMenu: () => set({ isSideMenuOpen: false }),

  profileDropDownOpen: false,
  toggleProfileDropDown: () => set((state) => ({ profileDropDownOpen: !state.profileDropDownOpen })),
}));
