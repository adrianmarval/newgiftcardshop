"use client";

import { notificationStore } from "@/store";
import {
  IoNotificationsOutline,
  IoRadioButtonOnOutline,
} from "react-icons/io5";

import clsx from "clsx";
import Link from "next/link";

export const NotificationsBadge = () => {
  const notifications = notificationStore((state) => state.notifications);
  const markAsRead = notificationStore((store) => store.markAsRead);
  const dropDownOpen = notificationStore(
    (state) => state.notificationsBadgeOpen,
  );
  const toggleDropDown = notificationStore(
    (state) => state.toggleNotificationBadge,
  );

  const unreadNotificationsCount = notifications.filter(
    (notification) => notification.read === false,
  ).length;

  return (
    <div className="mr-2 flex justify-center">
      <div className="relative">
        <button
          onClick={toggleDropDown}
          className="z-10 flex items-center rounded-full bg-white focus:ring-2 focus:ring-turquoise"
        >
          <span
            className={`absolute -right-1 -top-1 rounded-full ${unreadNotificationsCount > 0 ? "bg-red-600" : ""}  px-[5px] py-[1px] text-xs text-red-100`}
          >
            {unreadNotificationsCount > 0 && unreadNotificationsCount}
          </span>
          <IoNotificationsOutline size={30} className="text-slate-700" />
        </button>

        {dropDownOpen && (
          <div
            onClick={toggleDropDown}
            className="fixed inset-0 z-10 h-full w-full bg-black opacity-10"
          ></div>
        )}

        {dropDownOpen && (
          <>
            <ul className="absolute right-0 z-20 mr-2 w-96 rounded-lg bg-white p-2 py-2 shadow-xl">
              {notifications.map((notification) => (
                <li
                  onClick={() => markAsRead(notification.id)}
                  key={notification.id}
                  className="my-2 flex items-center  border-gray-50 px-2 py-1 text-sm font-semibold capitalize leading-none text-gray-700"
                >
                  <span className="mr-2">
                    {!notification.read && <IoRadioButtonOnOutline />}
                    {notification.read && (
                      <span className="inline-block h-4 w-4"></span>
                    )}{" "}
                  </span>

                  <span
                    className={clsx("rounded-lg p-1 ", {
                      "font-bold": !notification.read,
                      "font-light": notification.read,
                    })}
                  >
                    {notification.content}
                  </span>
                </li>
              ))}
              <Link
                className="flex items-center justify-center"
                href={"/dashboard/notifications"}
              >
                <button
                  onClick={toggleDropDown}
                  className="mt-3 flex rounded-lg bg-gray-200 px-2 py-1 text-sm font-bold"
                >
                  Ver todas
                </button>
              </Link>
            </ul>
          </>
        )}
      </div>
    </div>
  );
};
