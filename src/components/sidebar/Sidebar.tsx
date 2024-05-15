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
import Image from "next/image";

const sidebarMenuItems = [
  {
    label: "Dashboard",
    icon: <IoDesktopOutline size={25} />,
    path: "/dashboard",
  },
  {
    label: "Orders",
    icon: <IoGiftOutline size={25} />,
    path: "/dashboard/orders",
  },
  {
    label: "History",
    icon: <IoListCircleOutline size={25} />,
    path: "/dashboard/history",
  },
  {
    label: "Balance",
    icon: <IoWalletOutline size={25} />,
    path: "/dashboard/balance",
  },
  {
    label: "Help",
    icon: <IoHelpCircleOutline size={25} />,
    path: "/dashboard/help",
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
          <div className="mt-8 text-center">
            <Image
              src="profile.svg"
              alt=""
              width={150}
              height={150}
              className="m-auto h-24 w-24 rounded-full object-cover md:h-36 md:w-36"
            />
            <h5 className="mt-2 block text-xl font-semibold text-gray-600">
              Adrian Marval
            </h5>
            <span className="block text-gray-400">User</span>
          </div>

          <div className="mt-5 flex flex-1 flex-col overflow-y-auto pb-4 pt-5">
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
