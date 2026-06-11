export interface Deck {
  id: string;
  userId: string;
  name: string;
  description: string;
  createdAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  userId: string;
  front: string;
  back: string;
  ipa?: string;
  definition?: string;
  example?: string;
  // SM-2 parameters
  repetitions: number;
  interval: number;
  easeFactor: number;
  dueDate: number; // timestamp representing exact due time
  createdAt: number;
  // Embedding for semantic search
  embedding?: number[];
}
