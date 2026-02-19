export interface KnowledgeItem {
  id: number;
  question: string;
  answer: string;
  created_at: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}
