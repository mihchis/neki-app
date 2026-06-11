import { NextRequest, NextResponse } from 'next/server';
import { getEmbeddings, cosineSimilarity } from '@/utils/lmstudio';

export async function POST(request: NextRequest) {
  try {
    const { query, cards } = await request.json();

    if (!query || !cards) {
      return NextResponse.json(
        { error: 'Query and cards are required' },
        { status: 400 }
      );
    }

    const queryEmbedding = await getEmbeddings(query);

    // Calculate similarities
    const cardsWithScores = cards.map((card: any) => {
      if (!card.embedding) {
        // Fallback to basic text search
        const combinedText = `${card.front} ${card.back} ${card.definition || ''} ${card.example || ''}`.toLowerCase();
        const searchText = query.toLowerCase();
        const hasMatch = combinedText.includes(searchText);
        return { ...card, score: hasMatch ? 0.5 : 0 };
      }
      
      const similarity = cosineSimilarity(queryEmbedding, card.embedding);
      return { ...card, score: similarity };
    });

    // Sort by similarity score descending
    const sortedCards = cardsWithScores.sort((a: any, b: any) => b.score - a.score);
    
    // Filter out cards with too low score
    const filteredCards = sortedCards.filter((card: any) => card.score > 0.1);

    return NextResponse.json({ cards: filteredCards });
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Failed to search cards', details: (error as Error).message },
      { status: 500 }
    );
  }
}
