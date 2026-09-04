import { Message } from '../types/chat';

export function getMessageDateLabel(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();

  if (date.toDateString() === now.toDateString()) {
    return 'TODAY';
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return 'YESTERDAY';
  }

  // Same year: "AUGUST 24"
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'long', day: 'numeric' }).toUpperCase();
  }

  // Different year: "AUGUST 24, 2025"
  return date.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase();
}

export interface DateGroupedMessages {
  dateLabel: string;
  dateKey: string;
  messages: Message[];
}

export function groupMessagesByDate(messages: Message[]): DateGroupedMessages[] {
  const groups: DateGroupedMessages[] = [];
  let currentGroup: DateGroupedMessages | null = null;

  messages.forEach((msg) => {
    const date = new Date(msg.timestamp);
    const dateKey = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
    const dateLabel = getMessageDateLabel(msg.timestamp);

    if (!currentGroup || currentGroup.dateKey !== dateKey) {
      currentGroup = {
        dateKey,
        dateLabel,
        messages: [msg],
      };
      groups.push(currentGroup);
    } else {
      currentGroup.messages.push(msg);
    }
  });

  return groups;
}
