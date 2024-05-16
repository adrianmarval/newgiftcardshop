"use client";
import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface Props {
  label: string;
  icon: JSX.Element;
  path: string;
  closeSideMenu: () => void;
}

export const SidebarMenuItem = ({
  label,
  icon,
  path,
  closeSideMenu,
}: Props) => {
  const pathName = usePathname();
  return (
    <li className="rounded-lg">
      <Link
        onClick={closeSideMenu}
        href={path}
        className={clsx(
          "group flex items-center rounded-lg p-2 text-base font-normal text-gray-900",
          pathName === path && "bg-turquoise hover:bg-gray-200",
        )}
      >
        {icon}
        <span className="ml-3">{label}</span>
      </Link>
    </li>
  );
};
