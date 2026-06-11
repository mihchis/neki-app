const LM_STUDIO_URL = 'http://localhost:1234';

export interface GeneratedFlashcard {
  front: string;
  back: string;
  ipa?: string;
  definition?: string;
  example?: string;
}

export async function generateFlashcards(
  content: string,
  numCards: number = 5,
  language: string = 'vietnamese'
): Promise<GeneratedFlashcard[]> {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'qwen/qwen3.5-9b',
        messages: [
          {
            role: 'system',
            content: `You are a flashcard generator. Generate exactly ${numCards} high-quality flashcards from the provided content. 
Return ONLY a JSON array with the following structure (no extra text):
[
  {
    "front": "Term or question (English or from content)",
    "back": "Definition or answer in ${language}",
    "ipa": "Phonetic transcription (if English word)",
    "definition": "Detailed English definition",
    "example": "Example sentence in English"
  }
]
Make sure front and back are clear and concise.`,
          },
          {
            role: 'user',
            content: `Generate flashcards from this content:\n\n${content}`,
          },
        ],
        temperature: 0.7,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio API error: ${response.status}`);
    }

    const data = await response.json();
    const contentText = data.choices[0].message.content;
    
    // Try to parse JSON
    const jsonMatch = contentText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    
    throw new Error('Could not parse flashcards from AI response');
  } catch (error) {
    console.error('Error generating flashcards:', error);
    throw error;
  }
}

export async function getEmbeddings(text: string): Promise<number[]> {
  try {
    const response = await fetch(`${LM_STUDIO_URL}/v1/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-bge-m3',
        input: text,
      }),
    });

    if (!response.ok) {
      throw new Error(`LM Studio Embeddings API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error('Error getting embeddings:', error);
    throw error;
  }
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
