import { useAppStore } from '../../../store/useAppStore';
import { rjBackend } from '../services/rjBackend';
import { RjApi } from '../../../services/api/rjApi';
import { pushNotificationToBackend } from '../services/rjApiSync';

export const useNotifications = () => {
  const { rjStudio, updateRjStudioState, addRjNotification } = useAppStore();
  
  const notifications = rjStudio.rjNotifications;
  const setNotifications = (fn: ((prev: typeof notifications) => typeof notifications) | typeof notifications) => {
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
    void pushNotificationToBackend(type, message);
  };

  const markNotificationAsRead = async (id: number) => {
    const sid = rjBackend.getStudioId();
    const notif = notifications.find(n => n.id === id);
    if (rjBackend.isEnabled() && sid && notif && (notif as { serverId?: string }).serverId) {
      try {
        await RjApi.markNotificationRead(sid, String((notif as { serverId?: string }).serverId));
      } catch {
        /* local */
      }
    }
    setNotifications((prev) => prev.map(notif => notif.id === id ? { ...notif, read: true } : notif));
  };

  const markAllNotificationsAsRead = async () => {
    const sid = rjBackend.getStudioId();
    if (rjBackend.isEnabled() && sid) {
      try {
        await RjApi.markAllNotificationsRead(sid);
      } catch {
        /* local */
      }
    }
    setNotifications((prev) => prev.map(notif => ({ ...notif, read: true })));
  };

  const unreadCount = notifications.filter(n => !n.read).length;

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
