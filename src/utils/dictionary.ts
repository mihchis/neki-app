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
    const { baseUrl, chatModel } = useLMStudioStore.getState();
    console.log('Looking up word via proxy LM Studio connection:', cleanWord, 'using model:', chatModel);
    
    // Call LM Studio via proxy to avoid CORS
    const response = await fetch('/api/ai/proxy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUrl: `${baseUrl}/v1/chat/completions`,
        method: 'POST',
        body: {
          model: chatModel,
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
        }
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
    console.warn('LM Studio dictionary fetch failed, falling back to Free Dictionary API:', error);
    try {
      const dictRes = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(cleanWord)}`);
      if (dictRes.ok) {
        const dictData = await dictRes.json();
        if (Array.isArray(dictData) && dictData.length > 0) {
          const entry = dictData[0];
          const ipa = entry.phonetic || entry.phonetics?.find((p: any) => p.text)?.text || '';
          
          let definition = '';
          let example = '';
          
          const firstMeaning = entry.meanings?.[0];
          if (firstMeaning) {
            const firstDef = firstMeaning.definitions?.[0];
            if (firstDef) {
              definition = firstDef.definition || '';
              example = firstDef.example || '';
            }
          }
          
          return {
            word: cleanWord,
            ipa: ipa,
            definition: definition,
            example: example,
            vietnamese: '', // Free Dictionary API is English-only
          };
        }
      }
    } catch (fallbackError) {
      console.error('Free Dictionary API fallback failed:', fallbackError);
    }
    
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
