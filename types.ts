
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  image?: string; // Base64 image data
}

export interface GuestSession {
  guestId: string;
  serverIp: string;
  createdDate: string;
  lastActive: number;
}

export enum ConnectionStatus {
  OFFLINE = 'OFFLINE',
  CONNECTING = 'CONNECTING',
  STABLE = 'STABLE',
  ERROR = 'ERROR'
}
