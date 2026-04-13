export type StickerTone = 'party' | 'sweet' | 'shine' | 'retro';

export interface StickerOption {
  id: string;
  emoji: string;
  label: string;
  tone: StickerTone;
}

export interface BirthdayPost {
  id: number;
  author: string;
  initials: string;
  handle: string;
  createdAt: string;
  emoji: string;
  sticker: StickerOption;
  message: string;
}

export interface CreateBirthdayPostPayload {
  author: string;
  emoji: string;
  message: string;
  stickerId: string;
}

export const EMOJI_OPTIONS = ['🥳', '🎉', '💖', '🎂', '✨', '🫶', '😄'];

export const STICKER_OPTIONS: StickerOption[] = [
  {
    id: 'confetti-turbo',
    emoji: '🎉',
    label: 'Confete turbo',
    tone: 'party',
  },
  {
    id: 'bolo-liberado',
    emoji: '🎂',
    label: 'Modo bolo',
    tone: 'sweet',
  },
  {
    id: 'brilho-maximo',
    emoji: '✨',
    label: 'Brilho máximo',
    tone: 'shine',
  },
  {
    id: 'abraco-pixelado',
    emoji: '🫶',
    label: 'Abraço pixelado',
    tone: 'retro',
  },
];
