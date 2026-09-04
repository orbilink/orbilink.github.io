import { ref, uploadBytesResumable, getDownloadURL, deleteObject, getBlob } from 'firebase/storage';
import { getFirebaseStorage, isLiveFirebase, getFirebaseDiagnostics } from './firebaseApp';

export interface UploadProgressCallback {
  (progress: number): void;
}

export class StorageService {
  /**
   * Check whether Firebase Storage is configured and ready to use
   */
  public isStorageConfigured(): boolean {
    const diag = getFirebaseDiagnostics();
    const storage = getFirebaseStorage();
    return !!(isLiveFirebase() && storage && diag.storageInitialized);
  }

  /**
   * Uploads an encrypted backup blob to Firebase Storage under `users/{userId}/backups/{backupId}.enc`
   */
  public async uploadEncryptedBackup(
    userId: string,
    backupId: string,
    encryptedBlob: Blob,
    onProgress?: UploadProgressCallback
  ): Promise<{ downloadUrl: string; storagePath: string }> {
    const storage = getFirebaseStorage();

    if (this.isStorageConfigured() && storage) {
      const storagePath = `users/${userId}/backups/${backupId}.enc`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, encryptedBlob, {
        contentType: 'application/octet-stream',
        customMetadata: {
          backupId,
          userId,
          encrypted: 'true',
          algorithm: 'AES-256-GCM',
        },
      });

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => {
            console.error('[ORBILINK] Firebase Storage backup upload error:', error);
            reject(new Error(`Storage backup upload failed: ${error.message}`));
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve({ downloadUrl, storagePath });
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });
    }

    throw new Error(
      'Firebase Storage is not configured. Please check your Firebase Storage setup in environment settings.'
    );
  }

  /**
   * Downloads an encrypted backup blob from Firebase Storage by storagePath or downloadUrl
   */
  public async downloadEncryptedBackup(storagePathOrUrl: string): Promise<Blob> {
    const storage = getFirebaseStorage();

    if (this.isStorageConfigured() && storage && storagePathOrUrl.startsWith('users/')) {
      const storageRef = ref(storage, storagePathOrUrl);
      return await getBlob(storageRef);
    }

    // Fallback if URL is provided
    if (storagePathOrUrl.startsWith('http://') || storagePathOrUrl.startsWith('https://')) {
      const resp = await fetch(storagePathOrUrl);
      if (!resp.ok) {
        throw new Error(`Failed to download backup file: HTTP ${resp.status}`);
      }
      return await resp.blob();
    }

    if (storage) {
      const storageRef = ref(storage, storagePathOrUrl);
      return await getBlob(storageRef);
    }

    throw new Error('Firebase Storage is unavailable.');
  }

  /**
   * Deletes an encrypted backup file from Firebase Storage
   */
  public async deleteEncryptedBackup(storagePath: string): Promise<void> {
    const storage = getFirebaseStorage();
    if (this.isStorageConfigured() && storage) {
      try {
        const storageRef = ref(storage, storagePath);
        await deleteObject(storageRef);
      } catch (err: unknown) {
        console.warn('[ORBILINK] Storage delete notice:', err);
        // If file already deleted, do not break
      }
    }
  }

  /**
   * Uploads a File or Blob (image, voice recording, video, document)
   * to Firebase Storage under `chat_media/{chatId}/{timestamp}_{filename}`.
   */
  public async uploadChatMedia(
    chatId: string,
    fileOrBlob: File | Blob,
    fileName: string,
    onProgress?: UploadProgressCallback
  ): Promise<{ downloadUrl: string; storagePath?: string }> {
    const storage = getFirebaseStorage();

    if (this.isStorageConfigured() && storage) {
      const cleanName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `chat_media/${chatId}/${Date.now()}_${cleanName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, fileOrBlob, {
        contentType: fileOrBlob.type || 'application/octet-stream',
      });

      return new Promise((resolve, reject) => {
        uploadTask.on(
          'state_changed',
          (snapshot) => {
            const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
            if (onProgress) onProgress(Math.round(progress));
          },
          (error) => {
            console.error('[ORBILINK] Firebase Storage upload error:', error);
            reject(new Error(`Storage upload failed: ${error.message}`));
          },
          async () => {
            try {
              const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
              if (onProgress) onProgress(100);
              resolve({ downloadUrl, storagePath });
            } catch (urlErr) {
              reject(urlErr);
            }
          }
        );
      });
    }

    throw new Error(
      'Firebase Storage is not configured. Please verify VITE_FIREBASE_STORAGE_BUCKET in your environment.'
    );
  }

  /**
   * Uploads an avatar image to Firebase Storage under `avatars/{userId}/avatar_{timestamp}`.
   * If Firebase Storage is not configured, throws a clear error rather than faking the upload.
   */
  public async uploadAvatar(userId: string, fileOrBlob: File | Blob): Promise<string> {
    const storage = getFirebaseStorage();

    if (this.isStorageConfigured() && storage) {
      try {
        const fileExt = fileOrBlob.type === 'image/png' ? 'png' : fileOrBlob.type === 'image/webp' ? 'webp' : 'jpg';
        const storagePath = `avatars/${userId}/${Date.now()}_avatar.${fileExt}`;
        const storageRef = ref(storage, storagePath);
        
        const uploadTask = await uploadBytesResumable(storageRef, fileOrBlob, {
          contentType: fileOrBlob.type || 'image/jpeg',
        });
        
        return await getDownloadURL(uploadTask.ref);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`Avatar upload failed: ${msg}`);
      }
    }

    throw new Error(
      'Firebase Storage is not configured. Please verify VITE_FIREBASE_STORAGE_BUCKET in your environment to enable real profile photo uploads.'
    );
  }
}

export const storageService = new StorageService();

