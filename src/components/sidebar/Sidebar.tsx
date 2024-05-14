"use client";
import { useUiStore } from "@/store";
import clsx from "clsx";
import Link from "next/link";
import { SidebarMenuItem } from "./SidebarMenuItem";
import {
  IoDesktopOutline,
  IoGiftOutline,
  IoHelpCircleOutline,
  IoListCircleOutline,
  IoWalletOutline,
} from "react-icons/io5";

const sidebarMenuItems = [
  {
    label: "Dashboard",
    icon: <IoDesktopOutline size={25} />,
    path: "/dashboard",
  },
  {
    label: "Orders",
    icon: <IoGiftOutline size={25} />,
    path: "/users",
  },
  {
    label: "History",
    icon: <IoListCircleOutline size={25} />,
    path: "/settings",
  },
  {
    label: "Balance",
    icon: <IoWalletOutline size={25} />,
    path: "/notifications",
  },
  {
    label: "Help",
    icon: <IoHelpCircleOutline size={25} />,
    path: "/help",
  },
];

export const Sidebar = () => {
  const isSideMenuOpen = useUiStore((state) => state.isSideMenuOpen);
  const closeMenu = useUiStore((state) => state.closeSideMenu);

  return (
    <div>
      {/* Blur */}
      {isSideMenuOpen && (
        <div
          onClick={closeMenu}
          className="fade-in fixed left-0 top-0 z-10 h-screen w-screen backdrop-blur-sm backdrop-filter"
        />
      )}
      <aside
        id="sidebar"
        className={clsx(
          "duration-250 fixed left-0 top-0 z-20 flex h-full w-64 flex-shrink-0 flex-col pt-16 transition-all lg:block",
          {
            hidden: !isSideMenuOpen,
          },
        )}
        aria-label="Sidebar"
      >
        <div className="relative flex min-h-0 flex-1 flex-col border-r border-gray-200 bg-white pt-0">
          <div className="flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
            <div className="flex-1 space-y-1 divide-y bg-white px-3">
              <ul className="space-y-2 pb-2">
                {sidebarMenuItems.map((item) => (
                  <SidebarMenuItem key={item.label} {...item} />
                ))}
              </ul>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
};
