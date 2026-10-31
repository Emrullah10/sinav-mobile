import { File } from 'expo-file-system';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { AudioQuality, IOSOutputFormat } from 'expo-audio';

export const MAX_IMAGES = 3;
export const MAX_RECORD_MS = 120 * 1000;

// Ses: iki platformda da AAC/m4a (CMS'te tarayıcı çalabilsin; Android'in düşük kalite ayarı AMR/3gp üretir).
export const VOICE_PRESET = {
  extension: '.m4a',
  sampleRate: 22050,
  numberOfChannels: 1,
  bitRate: 32000,
  android: { outputFormat: 'mpeg4', audioEncoder: 'aac' },
  ios: {
    outputFormat: IOSOutputFormat.MPEG4AAC,
    audioQuality: AudioQuality.LOW,
    linearPCMBitDepth: 16,
    linearPCMIsBigEndian: false,
    linearPCMIsFloat: false,
  },
  web: { mimeType: 'audio/webm', bitsPerSecond: 32000 },
};

/** Uzun kenarı en çok `max` px JPEG: { uri, data(base64) }. */
export const compressImage = async ({ uri, width, height }, { max = 1600, quality = 0.72 } = {}) => {
  const ctx = ImageManipulator.manipulate(uri);
  if (width && height && Math.max(width, height) > max) ctx.resize(width >= height ? { width: max } : { height: max });
  const img = await ctx.renderAsync();
  const out = await img.saveAsync({ format: SaveFormat.JPEG, compress: quality, base64: true });
  return { uri: out.uri, data: out.base64 };
};

export const readBase64 = (uri) => new File(uri).base64();

export const formatDuration = (ms) => {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};
