import { create } from "zustand";

type NotificationLabel =
  | "System Notification"
  | "Order Notification"
  | "Security Notification"
  | "Verification Notification";

interface Notification {
  id: number;
  label: NotificationLabel;
  content: string;
  date: Date;
  read: boolean;
}

interface NotificationStore {
  notifications: Notification[];
  notificationsBadgeOpen: boolean;
  toggleNotificationBadge: () => void;
  markAsRead: (id: number) => void;
}

const initialNotifications: Notification[] = [
  {
    id: 1,
    label: "Order Notification",
    content: "You recent order has ben placed order#1112-2225-33321",
    date: new Date(),
    read: false,
  },
  {
    id: 2,
    label: "System Notification",
    content:
      "We have added a new feature to the app. Check it out! Lorem ipsum dolor sit amet consectetur adipisicing elit. Quos eveniet repellendus minus quis harum atque!",
    date: new Date(),
    read: false,
  },
  {
    id: 3,
    label: "Verification Notification",
    content: "John Doe yor account has ben verifed!",
    date: new Date(),
    read: false,
  },
];

export const notificationStore = create<NotificationStore>()((set) => ({
  notifications: initialNotifications,
  markAsRead: (id) =>
    set((state) => ({
      ...state,
      notifications: state.notifications.map((notification) =>
        notification.id === id ? { ...notification, read: true } : notification,
      ),
    })),
  notificationsBadgeOpen: false,
  toggleNotificationBadge: () =>
    set((state) => ({
      notificationsBadgeOpen: !state.notificationsBadgeOpen,
    })),
}));
