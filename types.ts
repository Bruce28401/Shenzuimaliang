export enum AppState {
  IDLE = 'IDLE',
  LISTENING = 'LISTENING',
  GENERATING = 'GENERATING',
  READY_TO_OPEN = 'READY_TO_OPEN', // Image loaded, waiting for animation trigger or auto
  OPENING = 'OPENING',
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
}

export interface GenerationResult {
  imageUrl: string;
  prompt: string;
}