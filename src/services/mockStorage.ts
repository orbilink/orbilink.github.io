import { ChatGroup, Message, User, GoogleContact, GoogleDriveFile } from '../types';

export const CURRENT_USER: User = {
  id: 'usr_me',
  name: 'Ritesh Kumar',
  username: 'ritesh',
  email: 'riteshkumarachar0@gmail.com',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  status: 'Building the future of communication ✨',
  isOnline: true,
  bio: 'Software engineer & builder. Passionate about real-time distributed systems and AI.'
};

export const INITIAL_USERS: User[] = [
  CURRENT_USER,
  {
    id: 'usr_ai',
    name: 'RYNOX Intelligence',
    username: 'ai_assistant',
    email: 'ai@rynox.app',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    status: 'Powered by Gemini 2.5 & Flash Live',
    isOnline: true,
    bio: 'Your real-time cognitive copilot across voice, code, search, and deep reasoning.'
  },
  {
    id: 'usr_sarah',
    name: 'Sarah Chen',
    username: 'sarahc',
    email: 'sarah.chen@techhub.io',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    status: 'In design review 🎨',
    isOnline: true,
    bio: 'Product Designer at Horizon Design Lab.'
  },
  {
    id: 'usr_alex',
    name: 'Alex Rivera',
    username: 'arivera',
    email: 'alex.rivera@devcore.org',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    status: 'Deploying staging v2.4 🚀',
    isOnline: false,
    lastSeen: '15m ago',
    bio: 'DevOps & Cloud Architect.'
  },
  {
    id: 'usr_elena',
    name: 'Elena Rostova',
    username: 'elena_r',
    email: 'elena@quantumlabs.ai',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    status: 'Focus mode 🎧',
    isOnline: true,
    bio: 'AI researcher and math enthusiast.'
  }
];

export const INITIAL_GROUPS: ChatGroup[] = [
  {
    id: 'chat_ai',
    name: 'RYNOX Intelligence',
    description: 'Instant AI assistant for multimodal chats, summaries, and Live Voice calls',
    avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
    type: 'ai',
    participants: [CURRENT_USER, INITIAL_USERS[1]],
    participantIds: ['usr_me', 'usr_ai'],
    unreadCount: 0,
    isPinned: true,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: 'group_core',
    name: 'Core Architecture & Launch',
    description: 'Engineering sync for RYNOX real-time engine & WebSocket cluster',
    avatarUrl: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150&auto=format&fit=crop&q=80',
    type: 'group',
    participants: [CURRENT_USER, INITIAL_USERS[2], INITIAL_USERS[3], INITIAL_USERS[4]],
    participantIds: ['usr_me', 'usr_sarah', 'usr_alex', 'usr_elena'],
    unreadCount: 2,
    isPinned: true,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: 'chat_sarah',
    name: 'Sarah Chen',
    description: 'Direct Message',
    avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    type: 'direct',
    participants: [CURRENT_USER, INITIAL_USERS[2]],
    participantIds: ['usr_me', 'usr_sarah'],
    unreadCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: 'chat_alex',
    name: 'Alex Rivera',
    description: 'Direct Message',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    type: 'direct',
    participants: [CURRENT_USER, INITIAL_USERS[3]],
    participantIds: ['usr_me', 'usr_alex'],
    unreadCount: 0,
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  }
];

export const INITIAL_MESSAGES: Record<string, Message[]> = {
  chat_ai: [
    {
      id: 'msg_ai_1',
      chatId: 'chat_ai',
      senderId: 'usr_ai',
      senderName: 'RYNOX Intelligence',
      senderAvatar: INITIAL_USERS[1].avatarUrl,
      content: 'Hello Ritesh! I am your RYNOX AI Assistant. You can chat with me, ask me to summarize threads, draft replies, or tap the Voice Call button in the top right to start a low-latency live audio conversation!',
      timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
      type: 'ai',
      status: 'read'
    }
  ],
  group_core: [
    {
      id: 'msg_core_1',
      chatId: 'group_core',
      senderId: 'usr_sarah',
      senderName: 'Sarah Chen',
      senderAvatar: INITIAL_USERS[2].avatarUrl,
      content: 'Hey everyone! Here is the latest design mock for the audio waveform and Live Voice interface.',
      timestamp: new Date(Date.now() - 3600000 * 4).toISOString(),
      type: 'text',
      status: 'read'
    },
    {
      id: 'msg_core_2',
      chatId: 'group_core',
      senderId: 'usr_alex',
      senderName: 'Alex Rivera',
      senderAvatar: INITIAL_USERS[3].avatarUrl,
      content: 'The WebSocket streaming multiplexer is connected and verified. Low latency under 120ms.',
      timestamp: new Date(Date.now() - 3600000 * 1).toISOString(),
      type: 'text',
      status: 'read'
    }
  ],
  chat_sarah: [
    {
      id: 'msg_s_1',
      chatId: 'chat_sarah',
      senderId: 'usr_sarah',
      senderName: 'Sarah Chen',
      senderAvatar: INITIAL_USERS[2].avatarUrl,
      content: 'Loved the new Google Drive picker integration! Tested with sample PDFs and it works seamlessly.',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      type: 'text',
      status: 'read'
    }
  ],
  chat_alex: [
    {
      id: 'msg_a_1',
      chatId: 'chat_alex',
      senderId: 'usr_alex',
      senderName: 'Alex Rivera',
      senderAvatar: INITIAL_USERS[3].avatarUrl,
      content: 'Let me know once you push the updated server build.',
      timestamp: new Date(Date.now() - 900000).toISOString(),
      type: 'text',
      status: 'read'
    }
  ]
};

export const INITIAL_GOOGLE_CONTACTS: GoogleContact[] = [
  {
    id: 'gc_1',
    name: 'Sarah Chen',
    email: 'sarah.chen@techhub.io',
    phone: '+1 (555) 234-5678',
    photoUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    isRynoxUser: true
  },
  {
    id: 'gc_2',
    name: 'Alex Rivera',
    email: 'alex.rivera@devcore.org',
    phone: '+1 (555) 876-5432',
    photoUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    isRynoxUser: true
  },
  {
    id: 'gc_3',
    name: 'Marcus Vance',
    email: 'm.vance@ventureglobal.com',
    phone: '+1 (555) 432-1098',
    isRynoxUser: false
  },
  {
    id: 'gc_4',
    name: 'Dr. Evelyn Reed',
    email: 'evelyn.reed@biotech-research.edu',
    phone: '+1 (555) 321-9876',
    isRynoxUser: false
  }
];

export const INITIAL_DRIVE_FILES: GoogleDriveFile[] = [
  {
    id: 'drv_1',
    name: 'RYNOX_Platform_Architecture_2026.pdf',
    mimeType: 'application/pdf',
    size: '4.8 MB',
    modifiedTime: '2 hours ago'
  },
  {
    id: 'drv_2',
    name: 'Live_Voice_Streaming_Protocol_Spec.docx',
    mimeType: 'application/vnd.google-apps.document',
    size: '1.2 MB',
    modifiedTime: 'Yesterday'
  },
  {
    id: 'drv_3',
    name: 'UI_Color_Palette_Dark_Luxury.png',
    mimeType: 'image/png',
    size: '850 KB',
    modifiedTime: '3 days ago',
    thumbnailUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200&auto=format&fit=crop&q=80'
  }
];
