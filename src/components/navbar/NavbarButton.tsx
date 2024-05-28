'use client';

import { useUiStore } from '@/store';
import { IoMenuOutline } from 'react-icons/io5';

export const NavbarButton = () => {
  const isSideMenuOpen = useUiStore((state) => state.isSideMenuOpen);
  const closeMenu = useUiStore((state) => state.closeSideMenu);
  const openMenu = useUiStore((state) => state.openSideMenu);
  return (
    <button
      onClick={() => (isSideMenuOpen ? closeMenu() : openMenu())}
      id="toggleSidebarMobile"
      aria-expanded="true"
      aria-controls="sidebar"
      className=" mr-2 cursor-pointer rounded p-2  text-gray-600 hover:text-gray-900 focus:ring-2 focus:ring-turquoise lg:hidden"
    >
      <IoMenuOutline size={25} />
    </button>
  );
};
