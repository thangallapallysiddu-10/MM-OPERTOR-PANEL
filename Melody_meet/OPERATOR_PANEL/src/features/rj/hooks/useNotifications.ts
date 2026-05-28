// hooks/useNotifications.ts - Fixed
import { useAppStore } from '../../../store/useAppStore';

export const useNotifications = () => {
  // Get from Zustand store
  const { rjStudio, updateRjStudioState, addRjNotification } = useAppStore();
  
  // Get values from store (these persist across navigation)
  const notifications = rjStudio.rjNotifications;
  const setNotifications = (fn: any) => {
    if (typeof fn === 'function') {
      updateRjStudioState({ rjNotifications: fn(notifications) });
    } else {
      updateRjStudioState({ rjNotifications: fn });
    }
  };

  const addNotification = (type: "request" | "system" | "alert", message: string) => {
    addRjNotification({
      title: type === "request" ? "New Request" : type === "alert" ? "Alert" : "System",
      message,
      type: type,
      read: false,
    });
  };

  const markNotificationAsRead = (id: number) => {
    setNotifications((prev: any[]) => 
      prev.map(notif => 
        notif.id === id ? { ...notif, read: true } : notif
      )
    );
  };

  const markAllNotificationsAsRead = () => {
    setNotifications((prev: any[]) => 
      prev.map(notif => ({ ...notif, read: true }))
    );
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  // Convert store notifications to the format expected by NotificationsModal
  const formattedNotifications = notifications.map(n => ({
    id: n.id,
    type: n.type,
    message: n.message,
    time: new Date(n.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    read: n.read,
  }));

  return {
    notifications: formattedNotifications,
    unreadCount,
    addNotification,
    markNotificationAsRead,
    markAllNotificationsAsRead,
  };
};