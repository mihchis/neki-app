import { NextRequest, NextResponse } from 'next/server';
import { generateFlashcards, getEmbeddings } from '@/utils/lmstudio';

export async function POST(request: NextRequest) {
  try {
    const { content, numCards = 5, language = 'vietnamese' } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: 'Content is required' },
        { status: 400 }
      );
    }

    const cards = await generateFlashcards(content, numCards, language);
    
    // Generate embeddings for each card
    const cardsWithEmbeddings = await Promise.all(
      cards.map(async (card) => {
        const combinedText = `${card.front} ${card.back} ${card.definition || ''} ${card.example || ''}`;
        const embedding = await getEmbeddings(combinedText);
        return {
          ...card,
          embedding,
        };
      })
    );

    return NextResponse.json({ cards: cardsWithEmbeddings });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json(
      { error: 'Failed to generate cards', details: (error as Error).message },
      { status: 500 }
    );
  }
}
