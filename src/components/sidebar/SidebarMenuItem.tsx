'use client';
import clsx from 'clsx';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

interface Props {
  label: string;
  icon: JSX.Element;
  path: string;
  subItems?: { label: string; icon: JSX.Element; path: string }[];
  closeSideMenu: () => void;
}

export const SidebarMenuItem = ({ label, icon, path, subItems, closeSideMenu }: Props) => {
  const [isOpenSubItem, setIsOpenSubItem] = useState(false);
  const pathName = usePathname();

  const handleClick = () => {
    if (subItems) {
      setIsOpenSubItem(!isOpenSubItem); // Toggle sub-items on click
    } else {
      closeSideMenu();
    }
  };

  const renderExpandableItem = (
    <button
      onClick={handleClick}
      className="group flex w-full cursor-pointer items-center rounded-lg p-2 text-base font-normal text-gray-900"
    >
      {icon}
      <span className="ml-3">{label}</span>
    </button>
  );

  const renderLinkItem = (
    <button className="w-full rounded-lg">
      <Link
        onClick={handleClick}
        href={path}
        className={clsx(
          'group flex items-center rounded-lg p-2 text-base font-normal text-gray-900',
          pathName === path && 'bg-turquoise', // Style for active item
        )}
      >
        {icon}
        <span className="ml-3">{label}</span>
      </Link>
    </button>
  );

  return (
    <>
      <li className="rounded-lg">{!subItems ? renderLinkItem : renderExpandableItem}</li>
      {subItems && isOpenSubItem && (
        <ul className="ml-4">
          {subItems.map((subItem) => (
            <li key={subItem.path} className="rounded-lg">
              <button className="w-full rounded-lg">
                <Link
                  href={subItem.path}
                  onClick={closeSideMenu}
                  className={clsx(
                    'flex items-center rounded-lg p-2 text-sm text-gray-700',
                    pathName === subItem.path && 'bg-turquoise', // Style for active sub-item
                  )}
                >
                  {subItem.icon}
                  <span className="ml-3">{subItem.label}</span>
                </Link>
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  );
};
