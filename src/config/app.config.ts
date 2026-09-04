export const APP_CONFIG = {
  name: 'Vault Mesh',
  tagline: 'Private, decentralized-inspired web messaging',
  version: '1.0.0-phase1',
  maxUploadSizeBytes: 25 * 1024 * 1024, // 25 MB
  maxAudioRecordingSeconds: 120, // 2 minutes
  supportedImageTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  supportedVideoTypes: ['video/mp4', 'video/webm', 'video/ogg'],
  supportedDocTypes: [
    'application/pdf',
    'application/zip',
    'application/json',
    'text/plain',
    'text/markdown',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
};
