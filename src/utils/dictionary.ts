import { useLMStudioStore } from '@/store/lmStore';

export interface DictionaryEntry {
  word: string;
  ipa: string;
  definition: string;
  example: string;
  vietnamese: string;
}

/**
 * Fetches definition, phonetic spelling, and sample sentences using LM Studio AI
 */
export async function fetchDictionaryData(word: string): Promise<DictionaryEntry | null> {
  const cleanWord = word.trim();
  if (!cleanWord) return null;

  try {
    const baseUrl = useLMStudioStore.getState().baseUrl;
    console.log('Looking up word via direct LM Studio connection:', cleanWord);
    
    // Directly call LM Studio from browser
    const response = await fetch(`${baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'qwen/qwen3.5-9b',
        messages: [
          {
            role: 'system',
            content: `You are a dictionary assistant. Look up the English word and return ONLY a valid JSON object with this structure:
{
  "word": "the word",
  "ipa": "phonetic transcription, e.g., /ˈrɛzɪliənt/",
  "definition": "clear English definition",
  "example": "a natural example sentence",
  "vietnamese": "Vietnamese translation of the word"
}
Do not include markdown, code blocks, or any other text. Just pure JSON.`,
          },
          {
            role: 'user',
            content: `Word: ${cleanWord}`,
          },
        ],
        temperature: 0.3,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`LM Studio error: ${response.status}`);
    }

    const data = await response.json();
    console.log('LM Studio raw response:', data);
    
    let result = data.choices[0].message.content;
    
    // Clean up JSON
    const jsonMatch = result.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      result = jsonMatch[0];
    }
    
    console.log('Extracted JSON:', result);
    const parsed = JSON.parse(result);
    
    return {
      word: parsed.word || cleanWord,
      ipa: parsed.ipa || '',
      definition: parsed.definition || '',
      example: parsed.example || '',
      vietnamese: parsed.vietnamese || '',
    };
  } catch (error) {
    console.warn('Dictionary fetch failed:', error);
    // Fallback to simple object
    return {
      word: cleanWord,
      ipa: '',
      definition: '',
      example: '',
      vietnamese: '',
    };
  }
}
