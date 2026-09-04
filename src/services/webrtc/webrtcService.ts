import {
  collection,
  doc,
  setDoc,
  updateDoc,
  onSnapshot,
  query,
  where,
  getDocs,
  deleteDoc,
} from 'firebase/firestore';
import { CallSignalingData, CallState, CallType, CallHistoryItem, IceCandidatePayload } from '../../types/call';
import { UserProfile, Contact } from '../../types/user';
import { getFirebaseDb, isLiveFirebase } from '../firebase/firebaseApp';
import { soundEffects } from '../sound/soundEffects';
import { notificationService } from '../notifications/notificationService';
import { indexedDbService } from '../storage/indexedDbService';
import { toast } from '../../components/ToastContainer';
import { firestoreService } from '../firebase/firestoreService';

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
  iceCandidatePoolSize: 10,
};

type CallStateListener = (state: {
  activeSession: CallSignalingData | null;
  incomingSession: CallSignalingData | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isCameraOff: boolean;
  durationSeconds: number;
}) => void;

class WebRTCService {
  private peerConnection: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;

  private activeSession: CallSignalingData | null = null;
  private incomingSession: CallSignalingData | null = null;
  private isCaller: boolean = false;

  private isMuted: boolean = false;
  private isCameraOff: boolean = false;

  // Real connection timer
  private timerInterval: number | null = null;
  private durationSeconds: number = 0;
  private connectedTimestamp: number | null = null;

  // Timeout for unanswered outgoing calls (35 seconds)
  private callTimeoutTimer: number | null = null;

  // Firestore listeners
  private callDocUnsub: (() => void) | null = null;
  private candidatesUnsub: (() => void) | null = null;
  private incomingCallsUnsub: (() => void) | null = null;

  private candidateQueue: RTCIceCandidateInit[] = [];
  private stateListeners: Set<CallStateListener> = new Set();
  private callHistory: CallHistoryItem[] = [];

  constructor() {
    this.loadCachedHistory();
  }

  private async loadCachedHistory() {
    try {
      const cached = await indexedDbService.getCallHistory?.();
      if (cached) {
        this.callHistory = cached;
      }
    } catch {
      this.callHistory = [];
    }
  }

  public subscribeState(listener: CallStateListener): () => void {
    this.stateListeners.add(listener);
    this.emitState();
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  private emitState() {
    const payload = {
      activeSession: this.activeSession,
      incomingSession: this.incomingSession,
      localStream: this.localStream,
      remoteStream: this.remoteStream,
      isMuted: this.isMuted,
      isCameraOff: this.isCameraOff,
      durationSeconds: this.durationSeconds,
    };
    this.stateListeners.forEach((l) => l(payload));
  }

  // --- Background listener for incoming calls targeting currentUser ---
  public listenForIncomingCalls(currentUser: UserProfile) {
    if (this.incomingCallsUnsub) {
      this.incomingCallsUnsub();
      this.incomingCallsUnsub = null;
    }

    const db = getFirebaseDb();
    if (!isLiveFirebase() || !db) return;

    try {
      const q = query(
        collection(db, 'calls'),
        where('receiverId', '==', currentUser.id),
        where('state', 'in', ['calling', 'ringing'])
      );

      this.incomingCallsUnsub = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            if (this.incomingSession && !this.activeSession) {
              soundEffects.stopRinging();
              this.incomingSession = null;
              this.emitState();
            }
            return;
          }

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as CallSignalingData;
            const callData: CallSignalingData = { ...data, id: docSnap.id };

            // If we are already in an active call, reject busy
            if (this.activeSession && this.activeSession.id !== callData.id) {
              updateDoc(doc(db, 'calls', callData.id), {
                state: 'rejected',
                endReason: 'busy',
                endedAt: Date.now(),
              }).catch(() => {});
              return;
            }

            // Fresh incoming call
            if (!this.incomingSession || this.incomingSession.id !== callData.id) {
              this.incomingSession = callData;
              soundEffects.startRinging();
              notificationService.showCallNotification(
                callData.callerName,
                callData.type,
                callData.id,
                () => this.acceptIncomingCall(currentUser)
              );

              // Notify caller that receiver device is ringing
              if (callData.state === 'calling') {
                updateDoc(doc(db, 'calls', callData.id), {
                  state: 'ringing',
                }).catch(() => {});
              }

              this.emitState();
            }
          });
        },
        (err) => {
          console.warn('Incoming calls listener warning:', err);
        }
      );
    } catch (err) {
      console.warn('Could not setup incoming calls listener:', err);
    }
  }

  // --- START OUTGOING CALL (Caller Flow) ---
  public async startCall(
    peer: { id: string; displayName: string; username: string; avatarUrl?: string; avatarColor?: string },
    type: CallType,
    currentUser: UserProfile,
    chatId?: string
  ): Promise<void> {
    if (this.activeSession) {
      toast.show('You already have an active call in progress', 'info');
      return;
    }

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.show('Media devices (Microphone/Camera) are not supported by your browser', 'error');
      return;
    }

    try {
      this.isCaller = true;
      this.isMuted = false;
      this.isCameraOff = false;
      this.durationSeconds = 0;
      this.connectedTimestamp = null;

      // 1. Request Local Media Stream
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          type === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        const error = mediaErr as Error;
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          toast.show(
            `Permission to access your ${type === 'video' ? 'Camera/Microphone' : 'Microphone'} was denied`,
            'error'
          );
        } else {
          toast.show(`Could not start media: ${error.message}`, 'error');
        }
        this.cleanup();
        return;
      }

      this.remoteStream = new MediaStream();

      // 2. Initialize RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Add local tracks to RTCPeerConnection
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle Remote Tracks
      this.peerConnection.ontrack = (event) => {
        if (this.remoteStream && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!this.remoteStream?.getTracks().includes(track)) {
              this.remoteStream?.addTrack(track);
            }
          });
          this.emitState();
        }
      };

      // 3. Generate Call ID & Session Data
      const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newSession: CallSignalingData = {
        id: callId,
        chatId: chatId || `direct_${[currentUser.id, peer.id].sort().join('_')}`,
        type,
        state: 'calling',
        callerId: currentUser.id,
        callerName: currentUser.displayName,
        callerAvatar: currentUser.avatarUrl,
        callerColor: currentUser.avatarColor,
        receiverId: peer.id,
        receiverName: peer.displayName,
        receiverAvatar: peer.avatarUrl,
        receiverColor: peer.avatarColor,
        createdAt: Date.now(),
      };

      this.activeSession = newSession;
      this.emitState();

      // 4. Handle ICE Candidates
      const db = getFirebaseDb();
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && isLiveFirebase() && db) {
          const candidateDoc = doc(collection(db, `calls/${callId}/callerCandidates`));
          setDoc(candidateDoc, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment || null,
            timestamp: Date.now(),
          }).catch(() => {});
        }
      };

      // Connection State Changes
      this.peerConnection.onconnectionstatechange = () => {
        if (!this.peerConnection) return;
        const state = this.peerConnection.connectionState;
        if (state === 'connected') {
          soundEffects.playCallConnected();
          this.onCallConnected();
        } else if (state === 'failed' || state === 'disconnected') {
          soundEffects.play('error');
          toast.show('Call connection interrupted', 'error');
          this.endCall('connection_failed');
        }
      };

      // 5. Create SDP Offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);

      newSession.offer = {
        type: 'offer',
        sdp: offer.sdp || '',
      };

      // 6. Write Call Document to Firestore
      if (isLiveFirebase() && db) {
        await setDoc(doc(db, 'calls', callId), newSession);

        // Start playing ringback tone
        soundEffects.startRingback();

        // 7. Subscribe to Call Document Updates
        this.callDocUnsub = onSnapshot(doc(db, 'calls', callId), async (snap) => {
          if (!snap.exists()) {
            this.endCall('cancelled');
            return;
          }

          const updated = snap.data() as CallSignalingData;
          if (this.activeSession) {
            this.activeSession.state = updated.state;
            this.emitState();
          }

          // Peer answered: Set Remote Description
          if (
            updated.answer &&
            this.peerConnection &&
            this.peerConnection.signalingState !== 'stable' &&
            !this.peerConnection.currentRemoteDescription
          ) {
            try {
              const remoteDesc = new RTCSessionDescription(updated.answer);
              await this.peerConnection.setRemoteDescription(remoteDesc);
              this.flushCandidateQueue();
            } catch (sdpErr) {
              console.warn('Error setting remote description:', sdpErr);
            }
          }

          if (updated.state === 'rejected') {
            soundEffects.stopRingback();
            soundEffects.playCallEnded();
            toast.show(`${peer.displayName} declined the call`, 'info');
            this.recordHistory('rejected', 0);
            this.cleanup();
          } else if (updated.state === 'missed') {
            soundEffects.stopRingback();
            soundEffects.playCallEnded();
            toast.show(`${peer.displayName} is unavailable`, 'info');
            this.recordHistory('missed', 0);
            this.cleanup();
          } else if (updated.state === 'ended') {
            soundEffects.stopRingback();
            soundEffects.playCallEnded();
            toast.show('Call ended', 'info');
            this.cleanup();
          }
        });

        // 8. Subscribe to Callee ICE Candidates
        this.candidatesUnsub = onSnapshot(
          collection(db, `calls/${callId}/calleeCandidates`),
          (candSnap) => {
            candSnap.docChanges().forEach(async (change) => {
              if (change.type === 'added') {
                const data = change.doc.data() as IceCandidatePayload;
                const candidate = new RTCIceCandidate({
                  candidate: data.candidate,
                  sdpMid: data.sdpMid,
                  sdpMLineIndex: data.sdpMLineIndex,
                });
                if (this.peerConnection?.remoteDescription) {
                  this.peerConnection.addIceCandidate(candidate).catch(() => {});
                } else {
                  this.candidateQueue.push(candidate);
                }
              }
            });
          }
        );

        // 9. Timeout after 35s if callee does not answer
        this.callTimeoutTimer = window.setTimeout(async () => {
          if (this.activeSession && this.activeSession.state !== 'connected') {
            toast.show(`${peer.displayName} did not answer`, 'info');
            await updateDoc(doc(db, 'calls', callId), {
              state: 'missed',
              endedAt: Date.now(),
              endReason: 'no_answer',
            }).catch(() => {});
            this.recordHistory('missed', 0);
            this.recordChatMessage(
              chatId || newSession.chatId!,
              `Missed ${type} call`,
              currentUser.id,
              currentUser.displayName
            );
            this.endCall('timeout');
          }
        }, 35000);
      }
    } catch (err: unknown) {
      soundEffects.stopRingback();
      soundEffects.play('error');
      const msg = err instanceof Error ? err.message : 'Could not initiate call';
      toast.show(msg, 'error');
      this.cleanup();
    }
  }

  // --- ACCEPT INCOMING CALL (Callee Flow) ---
  public async acceptIncomingCall(currentUser: UserProfile): Promise<void> {
    if (!this.incomingSession) return;
    const session = { ...this.incomingSession };
    this.incomingSession = null;
    soundEffects.stopRinging();

    try {
      this.isCaller = false;
      this.isMuted = false;
      this.isCameraOff = false;
      this.durationSeconds = 0;
      this.connectedTimestamp = null;

      // 1. Request Local Media Stream
      const constraints: MediaStreamConstraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video:
          session.type === 'video'
            ? {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user',
              }
            : false,
      };

      try {
        this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (mediaErr) {
        const error = mediaErr as Error;
        toast.show(`Could not access microphone/camera: ${error.message}`, 'error');
        this.rejectIncomingCall();
        return;
      }

      this.remoteStream = new MediaStream();

      // 2. Initialize RTCPeerConnection
      this.peerConnection = new RTCPeerConnection(RTC_CONFIG);

      // Add local tracks
      this.localStream.getTracks().forEach((track) => {
        if (this.peerConnection && this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      // Handle Remote Tracks
      this.peerConnection.ontrack = (event) => {
        if (this.remoteStream && event.streams[0]) {
          event.streams[0].getTracks().forEach((track) => {
            if (!this.remoteStream?.getTracks().includes(track)) {
              this.remoteStream?.addTrack(track);
            }
          });
          this.emitState();
        }
      };

      // 3. Handle Callee ICE Candidates
      const db = getFirebaseDb();
      this.peerConnection.onicecandidate = (event) => {
        if (event.candidate && isLiveFirebase() && db) {
          const candidateDoc = doc(collection(db, `calls/${session.id}/calleeCandidates`));
          setDoc(candidateDoc, {
            candidate: event.candidate.candidate,
            sdpMid: event.candidate.sdpMid,
            sdpMLineIndex: event.candidate.sdpMLineIndex,
            usernameFragment: event.candidate.usernameFragment || null,
            timestamp: Date.now(),
          }).catch(() => {});
        }
      };

      this.peerConnection.onconnectionstatechange = () => {
        if (!this.peerConnection) return;
        const state = this.peerConnection.connectionState;
        if (state === 'connected') {
          soundEffects.playCallConnected();
          this.onCallConnected();
        } else if (state === 'failed' || state === 'disconnected') {
          soundEffects.play('error');
          toast.show('Call connection disconnected', 'error');
          this.endCall('connection_lost');
        }
      };

      this.activeSession = {
        ...session,
        state: 'connecting',
      };
      this.emitState();

      // 4. Set Remote Description (Caller Offer)
      if (session.offer) {
        await this.peerConnection.setRemoteDescription(new RTCSessionDescription(session.offer));
        this.flushCandidateQueue();
      }

      // 5. Create SDP Answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);

      // 6. Update Firestore Call document with Answer
      if (isLiveFirebase() && db) {
        await updateDoc(doc(db, 'calls', session.id), {
          answer: {
            type: 'answer',
            sdp: answer.sdp || '',
          },
          state: 'connected',
          connectedAt: Date.now(),
        });

        // 7. Subscribe to Caller ICE Candidates
        this.candidatesUnsub = onSnapshot(
          collection(db, `calls/${session.id}/callerCandidates`),
          (candSnap) => {
            candSnap.docChanges().forEach(async (change) => {
              if (change.type === 'added') {
                const data = change.doc.data() as IceCandidatePayload;
                const candidate = new RTCIceCandidate({
                  candidate: data.candidate,
                  sdpMid: data.sdpMid,
                  sdpMLineIndex: data.sdpMLineIndex,
                });
                if (this.peerConnection?.remoteDescription) {
                  this.peerConnection.addIceCandidate(candidate).catch(() => {});
                } else {
                  this.candidateQueue.push(candidate);
                }
              }
            });
          }
        );

        // 8. Subscribe to Call Doc State
        this.callDocUnsub = onSnapshot(doc(db, 'calls', session.id), (snap) => {
          if (!snap.exists()) {
            this.cleanup();
            return;
          }
          const updated = snap.data() as CallSignalingData;
          if (updated.state === 'ended') {
            soundEffects.playCallEnded();
            toast.show('Call ended by peer', 'info');
            this.cleanup();
          }
        });
      }
    } catch (err: unknown) {
      soundEffects.play('error');
      const msg = err instanceof Error ? err.message : 'Error accepting call';
      toast.show(msg, 'error');
      this.cleanup();
    }
  }

  // --- REJECT INCOMING CALL ---
  public async rejectIncomingCall(): Promise<void> {
    if (!this.incomingSession) return;
    const session = { ...this.incomingSession };
    this.incomingSession = null;
    soundEffects.stopRinging();
    this.emitState();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'calls', session.id), {
          state: 'rejected',
          endedAt: Date.now(),
          endReason: 'rejected_by_callee',
        });
      } catch {
        // Ignore error
      }
    }

    this.recordHistory('rejected', 0, session);
  }

  // --- END ACTIVE CALL ---
  public async endCall(reason: string = 'user_ended'): Promise<void> {
    if (!this.activeSession) {
      this.cleanup();
      return;
    }

    const session = { ...this.activeSession };
    const duration = this.durationSeconds;
    soundEffects.stopRingback();
    soundEffects.stopRinging();
    soundEffects.playCallEnded();

    const db = getFirebaseDb();
    if (isLiveFirebase() && db) {
      try {
        await updateDoc(doc(db, 'calls', session.id), {
          state: 'ended',
          endedAt: Date.now(),
          duration,
          endReason: reason,
        });
      } catch {
        // Ignore error
      }
    }

    // Save Call Record in Call History & in Chat
    this.recordHistory(duration > 0 ? 'completed' : 'cancelled', duration, session);

    if (session.chatId) {
      const durationFormatted =
        duration > 0
          ? `${Math.floor(duration / 60)}m ${duration % 60}s`
          : 'Cancelled';
      const callSummary = `${session.type === 'video' ? 'Video' : 'Voice'} call (${durationFormatted})`;
      this.recordChatMessage(
        session.chatId,
        callSummary,
        session.callerId,
        session.callerName
      );
    }

    this.cleanup();
  }

  // Handle Connected State & Real Duration Timer
  private onCallConnected() {
    if (this.callTimeoutTimer !== null) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }

    soundEffects.stopRingback();
    soundEffects.stopRinging();

    if (this.activeSession) {
      this.activeSession.state = 'connected';
      this.connectedTimestamp = Date.now();
    }

    // Start real 1-second interval timer
    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
    }

    this.durationSeconds = 0;
    this.timerInterval = window.setInterval(() => {
      if (this.connectedTimestamp) {
        this.durationSeconds = Math.floor((Date.now() - this.connectedTimestamp) / 1000);
        this.emitState();
      }
    }, 1000);

    this.emitState();
  }

  // --- Controls: Toggle Mute & Camera ---
  public toggleMute(): boolean {
    if (!this.localStream) return this.isMuted;
    this.isMuted = !this.isMuted;
    this.localStream.getAudioTracks().forEach((track) => {
      track.enabled = !this.isMuted;
    });
    this.emitState();
    return this.isMuted;
  }

  public toggleCamera(): boolean {
    if (!this.localStream) return this.isCameraOff;
    this.isCameraOff = !this.isCameraOff;
    this.localStream.getVideoTracks().forEach((track) => {
      track.enabled = !this.isCameraOff;
    });
    this.emitState();
    return this.isCameraOff;
  }

  private flushCandidateQueue() {
    while (this.candidateQueue.length > 0) {
      const cand = this.candidateQueue.shift();
      if (cand && this.peerConnection) {
        this.peerConnection.addIceCandidate(cand).catch(() => {});
      }
    }
  }

  // Record call event message in chat conversation
  private recordChatMessage(chatId: string, text: string, senderId: string, senderName: string) {
    try {
      firestoreService.sendMessage(
        chatId,
        { id: senderId, displayName: senderName },
        `📞 ${text}`,
        'system'
      );
    } catch {
      // Ignore
    }
  }

  // Save item in call history
  private recordHistory(
    status: CallHistoryItem['status'],
    duration: number,
    sessionOverride?: CallSignalingData
  ) {
    const session = sessionOverride || this.activeSession;
    if (!session) return;

    const isOutgoing = this.isCaller;
    const peerId = isOutgoing ? session.receiverId : session.callerId;
    const peerName = isOutgoing ? session.receiverName : session.callerName;
    const peerAvatar = isOutgoing ? session.receiverAvatar : session.callerAvatar;
    const peerColor = isOutgoing ? session.receiverColor : session.callerColor;

    const item: CallHistoryItem = {
      id: `call_hist_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      callId: session.id,
      peerId,
      peerName,
      peerAvatar,
      peerColor,
      type: session.type,
      direction: isOutgoing ? 'outgoing' : 'incoming',
      status,
      timestamp: Date.now(),
      duration,
    };

    this.callHistory.unshift(item);
    indexedDbService.saveCallHistory?.(this.callHistory).catch(() => {});
  }

  public getCallHistory(): CallHistoryItem[] {
    return this.callHistory;
  }

  public clearCallHistory() {
    this.callHistory = [];
    indexedDbService.saveCallHistory?.([]).catch(() => {});
  }

  // --- Complete Cleanup & Releasing Camera/Mic Hardware ---
  private cleanup() {
    soundEffects.stopRingback();
    soundEffects.stopRinging();

    if (this.callTimeoutTimer !== null) {
      clearTimeout(this.callTimeoutTimer);
      this.callTimeoutTimer = null;
    }

    if (this.timerInterval !== null) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    if (this.callDocUnsub) {
      this.callDocUnsub();
      this.callDocUnsub = null;
    }

    if (this.candidatesUnsub) {
      this.candidatesUnsub();
      this.candidatesUnsub = null;
    }

    // Stop all media tracks to turn off camera and mic lights immediately
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.localStream = null;
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {
          // Ignore
        }
      });
      this.remoteStream = null;
    }

    // Close WebRTC Peer Connection
    if (this.peerConnection) {
      try {
        this.peerConnection.close();
      } catch {
        // Ignore
      }
      this.peerConnection = null;
    }

    this.activeSession = null;
    this.candidateQueue = [];
    this.isCaller = false;
    this.isMuted = false;
    this.isCameraOff = false;
    this.durationSeconds = 0;
    this.connectedTimestamp = null;

    this.emitState();
  }
}

export const webrtcService = new WebRTCService();
