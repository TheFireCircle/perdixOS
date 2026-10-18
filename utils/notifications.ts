export type SystemNotificationInput = {
  app: string;
  icon?: string;
  message: string;
  title: string;
};

export type SystemNotification = SystemNotificationInput & {
  createdAt: number;
  id: string;
};

export const SYSTEM_NOTIFICATION_EVENT = "daedalos:notification";

export const postSystemNotification = (
  notification: SystemNotificationInput
): void => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(SYSTEM_NOTIFICATION_EVENT, { detail: notification })
    );
  }
};
