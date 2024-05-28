'use client';

import { useUiStore } from '@/store';
import Link from 'next/link';

import { IoFingerPrintOutline, IoHeadsetOutline, IoPersonCircleOutline, IoShieldOutline } from 'react-icons/io5';

const dropDownItems = [
  {
    label: 'Perfil',
    path: '/dashboard/profile',
    icon: <IoPersonCircleOutline size={20} />,
  },
  {
    label: 'Verification',
    path: '/dashboard/verification',
    icon: <IoFingerPrintOutline size={20} />,
  },
  {
    label: 'Seguridad',
    path: '/dashboard/security',
    icon: <IoShieldOutline size={20} />,
  },
  {
    label: 'Soporte',
    path: '/dashboard/support',
    icon: <IoHeadsetOutline size={20} />,
  },
];

export const ProfileDropdown = () => {
  const { toggleProfileDropDown, profileDropDownOpen } = useUiStore((state) => state);

  return (
    <div className="flex justify-center">
      <div className="relative">
        <button onClick={toggleProfileDropDown} className="z-10 flex items-center rounded-full bg-white focus:ring-2 focus:ring-turquoise">
          <IoPersonCircleOutline size={35} className="text-slate-700" />
        </button>

        {profileDropDownOpen && (
          <div onClick={toggleProfileDropDown} className="fixed inset-0 z-10 h-full w-full bg-black opacity-10"></div>
        )}

        {profileDropDownOpen && (
          <ul className="absolute right-0 z-20 mr-2 w-48 rounded-md bg-white py-2 shadow-xl">
            {dropDownItems.map((item) => (
              <Link key={item.label} href={item.path}>
                <li onClick={toggleProfileDropDown} className="flex items-center px-4 py-2 text-sm font-semibold capitalize text-gray-700">
                  {item.icon} <span className="mx-2">{item.label}</span>
                </li>
              </Link>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
