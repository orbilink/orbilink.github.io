export function generateWaveformData(length: number = 32): number[] {
  const data: number[] = [];
  for (let i = 0; i < length; i++) {
    // Generate organic-looking waveform heights between 15% and 100%
    const base = Math.sin((i / length) * Math.PI * 2.5) * 0.3 + 0.5;
    const noise = Math.random() * 0.4;
    const val = Math.min(1, Math.max(0.15, base + noise));
    data.push(Math.round(val * 100));
  }
  return data;
}

export function readFileAsDataURL(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

export function blobToDataURL(blob: Blob): Promise<string> {
  return readFileAsDataURL(blob);
}

export const AVATAR_PALETTES = [
  'from-emerald-500 to-teal-700',
  'from-cyan-500 to-blue-700',
  'from-indigo-500 to-purple-700',
  'from-violet-500 to-pink-700',
  'from-amber-500 to-orange-700',
  'from-rose-500 to-red-700',
  'from-lime-500 to-green-700',
  'from-sky-500 to-indigo-700',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_PALETTES.length;
  return AVATAR_PALETTES[index];
}

export function getInitials(name: string): string {
  if (!name) return 'VM';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const MEDIA_LIMITS = {
  IMAGE_MAX_SIZE_BYTES: 25 * 1024 * 1024, // 25MB
  VIDEO_MAX_SIZE_BYTES: 50 * 1024 * 1024, // 50MB
  DOC_MAX_SIZE_BYTES: 30 * 1024 * 1024,   // 30MB
  AUDIO_MAX_SIZE_BYTES: 20 * 1024 * 1024, // 20MB
};

const ALLOWED_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'image/bmp',
]);

const ALLOWED_VIDEO_TYPES = new Set([
  'video/mp4',
  'video/webm',
  'video/ogg',
  'video/quicktime',
]);

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

export function validateMediaFile(file: File, type: 'image' | 'video' | 'document' | 'audio'): ValidationResult {
  if (!file) {
    return { valid: false, error: 'No file provided' };
  }

  if (type === 'image') {
    if (file.size > MEDIA_LIMITS.IMAGE_MAX_SIZE_BYTES) {
      return { valid: false, error: 'Image size exceeds maximum limit of 25MB' };
    }
    if (file.type && !ALLOWED_IMAGE_TYPES.has(file.type.toLowerCase())) {
      return { valid: false, error: `Unsupported image format: ${file.type}. Please use JPG, PNG, WEBP, or GIF.` };
    }
  } else if (type === 'video') {
    if (file.size > MEDIA_LIMITS.VIDEO_MAX_SIZE_BYTES) {
      return { valid: false, error: 'Video size exceeds maximum limit of 50MB' };
    }
    if (file.type && !ALLOWED_VIDEO_TYPES.has(file.type.toLowerCase())) {
      return { valid: false, error: `Unsupported video format: ${file.type}. Please use MP4, WEBM, or MOV.` };
    }
  } else if (type === 'document') {
    if (file.size > MEDIA_LIMITS.DOC_MAX_SIZE_BYTES) {
      return { valid: false, error: 'Document size exceeds maximum limit of 30MB' };
    }
  } else if (type === 'audio') {
    if (file.size > MEDIA_LIMITS.AUDIO_MAX_SIZE_BYTES) {
      return { valid: false, error: 'Audio file exceeds maximum limit of 20MB' };
    }
  }

  return { valid: true };
}

