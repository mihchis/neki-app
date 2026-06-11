import { create } from 'zustand';
import { type Card, type Deck } from '../db/schema';
import { calculateSM2 } from '../utils/sm2';
import { dbFirestore, auth } from '../utils/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  writeBatch, 
  getDocs 
} from 'firebase/firestore';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut 
} from 'firebase/auth';

interface CardState {
  decks: Deck[];
  cards: Card[]; // all synced cards for counts and local queries
  activeDeck: Deck | null;
  queue: Card[];
  currentIndex: number;
  isShuffle: boolean;
  isQuickCardModalOpen: boolean;
  defaultQuickDeckId: string | null;
  editingCard: Card | null;
  sessionTotal: number;
  sessionCompleted: number;
  userId: string | null;

  // Actions
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  setUserId: (userId: string | null) => void;
  subscribeToData: (userId: string) => void;
  createDeck: (name: string, description: string) => Promise<string>;
  addCard: (card: Omit<Card, 'id' | 'userId' | 'repetitions' | 'interval' | 'easeFactor' | 'dueDate' | 'createdAt'>) => Promise<string>;
  editCard: (cardId: string, cardData: Partial<Omit<Card, 'id' | 'userId' | 'repetitions' | 'interval' | 'easeFactor' | 'dueDate' | 'createdAt'>>) => Promise<void>;
  deleteCard: (cardId: string) => Promise<void>;
  editDeck: (deckId: string, deckData: Partial<Omit<Deck, 'id' | 'userId' | 'createdAt'>>) => Promise<void>;
  deleteDeck: (deckId: string) => Promise<void>;
  startSession: (deckId: string) => Promise<void>;
  answerCard: (quality: 0 | 3 | 4 | 5) => Promise<void>;
  toggleShuffle: () => void;
  setQuickCardModalOpen: (open: boolean, deckId?: string | null, card?: Card) => void;
  seedSampleData: (userId: string) => Promise<void>;
  importCards: (deckId: string, cardsData: any[]) => Promise<void>;
  exportDeck: (deckId: string) => any;
}

let unsubscribeDecks: (() => void) | null = null;
let unsubscribeCards: (() => void) | null = null;

export const useCardStore = create<CardState>((set, get) => ({
  decks: [],
  cards: [],
  activeDeck: null,
  queue: [],
  currentIndex: 0,
  isShuffle: false,
  isQuickCardModalOpen: false,
  defaultQuickDeckId: null,
  editingCard: null,
  sessionTotal: 0,
  sessionCompleted: 0,
  userId: null,

  signInWithEmail: async (email, password) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    set({ userId: credential.user.uid });
  },

  signUpWithEmail: async (email, password) => {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    set({ userId: credential.user.uid });
  },

  signOut: async () => {
    await firebaseSignOut(auth);
    if (unsubscribeDecks) unsubscribeDecks();
    if (unsubscribeCards) unsubscribeCards();
    set({ 
      decks: [], 
      cards: [], 
      userId: null, 
      activeDeck: null, 
      queue: [] 
    });
  },

  setUserId: (userId) => {
    set({ userId });
  },

  subscribeToData: (userId) => {
    // Clean up existing listeners if any
    if (unsubscribeDecks) unsubscribeDecks();
    if (unsubscribeCards) unsubscribeCards();

    // Subscribe to Decks
    const decksQuery = query(collection(dbFirestore, 'decks'), where('userId', '==', userId));
    unsubscribeDecks = onSnapshot(decksQuery, (snapshot) => {
      const decksList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Deck));
      
      // Sort by creation time descending
      decksList.sort((a, b) => b.createdAt - a.createdAt);
      set({ decks: decksList });

      // Automatically seed sample deck if the user has no decks at all and has not been seeded yet
      if (typeof window !== 'undefined') {
        const seedKey = `neki_seeded_${userId}`;
        if (decksList.length === 0 && !localStorage.getItem(seedKey)) {
          localStorage.setItem(seedKey, 'true');
          get().seedSampleData(userId);
        }
      }
    }, (error) => {
      console.error('Error listening to decks:', error);
    });

    // Subscribe to Cards
    const cardsQuery = query(collection(dbFirestore, 'cards'), where('userId', '==', userId));
    unsubscribeCards = onSnapshot(cardsQuery, (snapshot) => {
      const cardsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Card));
      set({ cards: cardsList });
    }, (error) => {
      console.error('Error listening to cards:', error);
    });
  },

  createDeck: async (name, description) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    const ref = await addDoc(collection(dbFirestore, 'decks'), {
      userId,
      name,
      description,
      createdAt: Date.now(),
    });
    return ref.id;
  },

  editDeck: async (deckId, deckData) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    const deckRef = doc(dbFirestore, 'decks', deckId);
    const updateData: any = {};
    
    if (deckData.name !== undefined) {
      updateData.name = deckData.name;
    }
    if (deckData.description !== undefined) {
      updateData.description = deckData.description;
    }

    await updateDoc(deckRef, updateData);
  },

  addCard: async (cardData) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    const now = Date.now();
    // Only include fields that have values
    const cardDoc: any = {
      deckId: cardData.deckId,
      front: cardData.front,
      back: cardData.back,
      userId,
      repetitions: 0,
      interval: 1,
      easeFactor: 2.5,
      dueDate: now,
      createdAt: now,
    };
    
    if (cardData.ipa && cardData.ipa.trim()) {
      cardDoc.ipa = cardData.ipa;
    }
    if (cardData.definition && cardData.definition.trim()) {
      cardDoc.definition = cardData.definition;
    }
    if (cardData.example && cardData.example.trim()) {
      cardDoc.example = cardData.example;
    }
    if (cardData.embedding && cardData.embedding.length > 0) {
      cardDoc.embedding = cardData.embedding;
    }

    const ref = await addDoc(collection(dbFirestore, 'cards'), cardDoc);
    return ref.id;
  },

  editCard: async (cardId, cardData) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    const cardRef = doc(dbFirestore, 'cards', cardId);
    const updateData: any = {};
    
    if (cardData.deckId !== undefined) {
      updateData.deckId = cardData.deckId;
    }
    if (cardData.front !== undefined) {
      updateData.front = cardData.front;
    }
    if (cardData.back !== undefined) {
      updateData.back = cardData.back;
    }
    if (cardData.ipa !== undefined) {
      if (cardData.ipa.trim()) {
        updateData.ipa = cardData.ipa;
      } else {
        updateData.ipa = null;
      }
    }
    if (cardData.definition !== undefined) {
      if (cardData.definition.trim()) {
        updateData.definition = cardData.definition;
      } else {
        updateData.definition = null;
      }
    }
    if (cardData.example !== undefined) {
      if (cardData.example.trim()) {
        updateData.example = cardData.example;
      } else {
        updateData.example = null;
      }
    }
    if (cardData.embedding !== undefined) {
      updateData.embedding = cardData.embedding;
    }

    await updateDoc(cardRef, updateData);
  },

  deleteCard: async (cardId) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    await deleteDoc(doc(dbFirestore, 'cards', cardId));
  },

  deleteDeck: async (deckId) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    try {
      // Delete deck document itself
      await deleteDoc(doc(dbFirestore, 'decks', deckId));

      // Batch delete all cards belonging to this deck, filtered by userId to satisfy security rules
      const cardsQuery = query(
        collection(dbFirestore, 'cards'), 
        where('deckId', '==', deckId),
        where('userId', '==', userId)
      );
      const querySnapshot = await getDocs(cardsQuery);
      
      if (!querySnapshot.empty) {
        const batch = writeBatch(dbFirestore);
        querySnapshot.forEach((docSnap) => {
          batch.delete(docSnap.ref);
        });
        await batch.commit();
      }
      console.log('Successfully deleted deck and cards:', deckId);
    } catch (error) {
      console.error('Failed to delete deck:', error);
      throw error;
    }
  },

  startSession: async (deckId) => {
    const deck = get().decks.find(d => d.id === deckId);
    if (!deck) return;

    const now = Date.now();
    
    // Filter due cards from already synced card list in store
    const dueCards = get().cards.filter(
      card => card.deckId === deckId && card.dueDate <= now
    );

    const isShuffle = get().isShuffle;
    const finalQueue = isShuffle ? shuffleArray(dueCards) : dueCards;

    set({
      activeDeck: deck,
      queue: finalQueue,
      currentIndex: 0,
      sessionTotal: finalQueue.length,
      sessionCompleted: 0,
    });
  },

  toggleShuffle: () => {
    const { isShuffle, queue, currentIndex } = get();
    const newShuffle = !isShuffle;

    if (newShuffle && queue.length > currentIndex) {
      const completed = queue.slice(0, currentIndex);
      const remaining = queue.slice(currentIndex);
      const shuffledRemaining = shuffleArray(remaining);
      set({
        isShuffle: newShuffle,
        queue: [...completed, ...shuffledRemaining],
      });
    } else {
      set({ isShuffle: newShuffle });
    }
  },

  answerCard: async (quality) => {
    const { queue, currentIndex, sessionCompleted } = get();
    if (currentIndex >= queue.length) return;

    const card = queue[currentIndex];

    // Calculate updated scheduling params
    const sm2Result = calculateSM2(
      quality,
      card.interval,
      card.easeFactor,
      card.repetitions
    );

    // Update document in Firestore
    await updateDoc(doc(dbFirestore, 'cards', card.id), {
      interval: sm2Result.interval,
      easeFactor: sm2Result.easeFactor,
      repetitions: sm2Result.repetitions,
      dueDate: sm2Result.dueDate,
    });

    if (quality === 0) {
      // Re-queue card for review in same session (Anki Again logic)
      const newQueue = [...queue];
      const insertIndex = Math.min(currentIndex + 4, newQueue.length);
      
      const updatedCard = {
        ...card,
        interval: sm2Result.interval,
        easeFactor: sm2Result.easeFactor,
        repetitions: sm2Result.repetitions,
        dueDate: sm2Result.dueDate,
      };

      newQueue.splice(insertIndex, 0, updatedCard);

      set({
        queue: newQueue,
        currentIndex: currentIndex + 1,
        sessionTotal: newQueue.length,
      });
    } else {
      set({
        currentIndex: currentIndex + 1,
        sessionCompleted: sessionCompleted + 1,
      });
    }
  },

  setQuickCardModalOpen: (open, deckId, card) => {
    set({
      isQuickCardModalOpen: open,
      defaultQuickDeckId: deckId !== undefined ? deckId : get().defaultQuickDeckId,
      editingCard: card || null,
    });
  },

  seedSampleData: async (userId) => {
    console.log('Seeding sample data for new user:', userId);

    // Create a sample deck
    const deckRef = await addDoc(collection(dbFirestore, 'decks'), {
      userId,
      name: '🎯 English Vocabulary (Sample)',
      description: 'Learn common English words with definitions, examples, and phonetic transcription.',
      createdAt: Date.now(),
    });

    const deckId = deckRef.id;
    const now = Date.now();

    // Create sample cards
    const sampleCards = [
      {
        deckId,
        userId,
        front: 'persistent',
        back: 'kiên trì, bền bỉ',
        ipa: '/pəˈsɪstənt/',
        definition: 'Continuing firmly or obstinately in a course of action in spite of difficulty or opposition.',
        example: 'She has been persistent in pursuing her goal despite all the setbacks.',
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: now,
        createdAt: now,
      },
      {
        deckId,
        userId,
        front: 'benevolent',
        back: 'nhân từ, rộng lượng',
        ipa: '/bəˈnevələnt/',
        definition: 'Well meaning and kindly.',
        example: 'A benevolent donor provided funding for the new library.',
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: now,
        createdAt: now,
      },
      {
        deckId,
        userId,
        front: 'ephemeral',
        back: 'phù du, sớm nở tối tàn',
        ipa: '/ɪˈfemərəl/',
        definition: 'Lasting for a very short time.',
        example: 'Fame in the age of the internet is often ephemeral.',
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: now,
        createdAt: now,
      },
      {
        deckId,
        userId,
        front: 'resilient',
        back: 'kiên cường, đàn hồi',
        ipa: '/rɪˈzɪliənt/',
        definition: 'Able to withstand or recover quickly from difficult conditions.',
        example: 'The local economy proved remarkably resilient to the global recession.',
        repetitions: 0,
        interval: 1,
        easeFactor: 2.5,
        dueDate: now,
        createdAt: now,
      },
    ];

    const batch = writeBatch(dbFirestore);
    sampleCards.forEach((card) => {
      const cardRef = doc(collection(dbFirestore, 'cards'));
      batch.set(cardRef, card);
    });
    
    await batch.commit();
  },

  importCards: async (deckId, cardsData) => {
    const { userId } = get();
    if (!userId) throw new Error('Not authenticated');

    const now = Date.now();
    const batch = writeBatch(dbFirestore);
    
    cardsData.forEach((cardData) => {
      const cardDoc: any = {
        deckId,
        userId,
        front: cardData.front || '',
        back: cardData.back || '',
        repetitions: cardData.repetitions || 0,
        interval: cardData.interval || 1,
        easeFactor: cardData.easeFactor || 2.5,
        dueDate: cardData.dueDate || now,
        createdAt: cardData.createdAt || now,
      };

      if (cardData.ipa && cardData.ipa.trim()) {
        cardDoc.ipa = cardData.ipa;
      }
      if (cardData.definition && cardData.definition.trim()) {
        cardDoc.definition = cardData.definition;
      }
      if (cardData.example && cardData.example.trim()) {
        cardDoc.example = cardData.example;
      }
      if (cardData.embedding && cardData.embedding.length > 0) {
        cardDoc.embedding = cardData.embedding;
      }

      const cardRef = doc(collection(dbFirestore, 'cards'));
      batch.set(cardRef, cardDoc);
    });

    await batch.commit();
  },

  exportDeck: (deckId) => {
    const { decks, cards } = get();
    const deck = decks.find(d => d.id === deckId);
    if (!deck) throw new Error('Deck not found');

    const deckCards = cards.filter(c => c.deckId === deckId);
    
    return {
      deck: {
        name: deck.name,
        description: deck.description,
      },
      cards: deckCards.map(card => ({
        front: card.front,
        back: card.back,
        ipa: card.ipa,
        definition: card.definition,
        example: card.example,
        repetitions: card.repetitions,
        interval: card.interval,
        easeFactor: card.easeFactor,
        dueDate: card.dueDate,
        createdAt: card.createdAt,
      })),
    };
  },
}));

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
