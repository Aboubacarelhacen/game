export enum AppView {
  HOME = 'HOME',
  ENCRYPTION_GAME = 'ENCRYPTION_GAME',
  CODING_GAME = 'CODING_GAME',
  IMAGE_CODE_GAME = 'IMAGE_CODE_GAME',
  CHARACTER_MAKER = 'CHARACTER_MAKER',
  PAINTING_GAME = 'PAINTING_GAME',
  BALLOON_GAME = 'BALLOON_GAME',
  ROCKET_GAME = 'ROCKET_GAME',
}

export interface Character {
  id: string;
  name: string;
  imageUrl: string;
  description: string;
}

// Helper type for the Veo window object
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
    aistudio?: {
      hasSelectedApiKey(): Promise<boolean>;
      openSelectKey(): Promise<void>;
    };
  }
}