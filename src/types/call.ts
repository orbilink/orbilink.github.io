export type CallType = 'voice' | 'video';

export type CallState =
  | 'idle'
  | 'calling'
  | 'ringing'
  | 'connecting'
  | 'connected'
  | 'rejected'
  | 'missed'
  | 'ended'
  | 'failed';

export interface CallSignalingData {
  id: string;
  chatId?: string;
  type: CallType;
  state: CallState;
  callerId: string;
  callerName: string;
  callerAvatar?: string;
  callerColor?: string;
  receiverId: string;
  receiverName: string;
  receiverAvatar?: string;
  receiverColor?: string;
  offer?: {
    type: 'offer';
    sdp: string;
  };
  answer?: {
    type: 'answer';
    sdp: string;
  };
  createdAt: number;
  connectedAt?: number;
  endedAt?: number;
  duration?: number; // In seconds
  endReason?: string;
}

export interface IceCandidatePayload {
  candidate: string;
  sdpMid: string | null;
  sdpMLineIndex: number | null;
  usernameFragment?: string | null;
  timestamp: number;
}

export interface CallHistoryItem {
  id: string;
  callId: string;
  peerId: string;
  peerName: string;
  peerUsername?: string;
  peerAvatar?: string;
  peerColor?: string;
  type: CallType;
  direction: 'incoming' | 'outgoing';
  status: 'completed' | 'missed' | 'rejected' | 'cancelled' | 'failed';
  timestamp: number;
  duration: number; // in seconds
}
