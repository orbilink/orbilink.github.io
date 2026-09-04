import { toast } from '../../components/ToastContainer';
import { soundEffects } from '../sound/soundEffects';

export interface NotificationOptions {
  chatId?: string;
  isGroup?: boolean;
  groupName?: string;
  avatarUrl?: string;
  previewEnabled?: boolean;
  onClick?: () => void;
}

class NotificationService {
  private hasNotificationSupport: boolean = false;

  constructor() {
    this.hasNotificationSupport = typeof window !== 'undefined' && 'Notification' in window;
  }

  public isSupported(): boolean {
    return this.hasNotificationSupport;
  }

  public getPermission(): NotificationPermission {
    if (!this.hasNotificationSupport) return 'denied';
    return Notification.permission;
  }

  public async requestPermission(): Promise<NotificationPermission> {
    if (!this.hasNotificationSupport) {
      toast.show('Browser notifications are not supported in this environment', 'info');
      return 'denied';
    }

    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        toast.show('Browser notifications enabled', 'success');
      } else if (permission === 'denied') {
        toast.show(
          'Notifications blocked. Please check your browser site permissions to enable.',
          'error'
        );
      }
      return permission;
    } catch {
      return 'denied';
    }
  }

  // Real incoming message notification
  public showMessageNotification(
    senderName: string,
    messageText: string,
    options?: NotificationOptions
  ) {
    // 1. Play message receive sound chime
    soundEffects.play('receive');

    // 2. Format title and body
    const title = options?.isGroup && options?.groupName
      ? `${options.groupName} · ${senderName}`
      : senderName;

    const body = options?.previewEnabled !== false
      ? messageText || 'Sent an attachment'
      : 'New message received';

    // 3. Desktop Notification if permission is granted
    if (this.hasNotificationSupport && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: options?.avatarUrl || '/icon.png',
          badge: '/icon.png',
          tag: options?.chatId ? `chat_${options.chatId}` : undefined,
          silent: true, // We trigger custom sound through soundEffects
        });

        notif.onclick = () => {
          window.focus();
          options?.onClick?.();
          notif.close();
        };
      } catch (err) {
        console.warn('Could not dispatch desktop notification:', err);
      }
    }

    // 4. In-App Notification Toast
    toast.show(`${title}: ${body}`, 'info');
  }

  // Real incoming call desktop notification
  public showCallNotification(
    callerName: string,
    callType: 'voice' | 'video',
    callId: string,
    onAccept?: () => void
  ) {
    const title = `Incoming ${callType === 'video' ? 'Video' : 'Voice'} Call`;
    const body = `${callerName} is calling you on ORBILINK`;

    if (this.hasNotificationSupport && Notification.permission === 'granted') {
      try {
        const notif = new Notification(title, {
          body,
          icon: '/icon.png',
          tag: `call_${callId}`,
          requireInteraction: true,
          silent: true,
        });

        notif.onclick = () => {
          window.focus();
          onAccept?.();
          notif.close();
        };
      } catch {
        // Fallback gracefully
      }
    }
  }
}

export const notificationService = new NotificationService();
