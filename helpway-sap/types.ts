
export interface KBEntry {
  error: string;
  response: string;
}

export enum MessageRole {
  USER = 'user',
  AGENT = 'agent',
  SYSTEM = 'system'
}

export interface Message {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
}

export interface ChatState {
  messages: Message[];
  isLoading: boolean;
  kbLoaded: boolean;
  kbData: KBEntry[];
}
