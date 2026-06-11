import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { word } = await request.json();

    if (!word) {
      return NextResponse.json(
        { error: 'Word is required' },
        { status: 400 }
      );
    }

    console.log('Looking up word:', word);
    
    // Try to connect to LM Studio
    try {
      const response = await fetch('http://127.0.0.1:1234/v1/chat/completions', {
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
              content: `Word: ${word}`,
            },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('LM Studio error:', response.status, errorText);
        throw new Error('LM Studio error');
      }

      const data = await response.json();
      console.log('LM Studio response:', data);
      let result = data.choices[0].message.content;
      
      // Clean up JSON
      const jsonMatch = result.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        result = jsonMatch[0];
      }
      
      console.log('Extracted JSON:', result);
      const parsed = JSON.parse(result);
      return NextResponse.json(parsed);
    } catch (lmError) {
      console.error('LM Studio connection failed:', lmError);
      // Fallback to simple manual entry
      return NextResponse.json({
        word: word,
        ipa: '',
        definition: '',
        example: '',
        vietnamese: '',
      });
    }
  } catch (error) {
    console.error('Dictionary API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dictionary data', details: (error as Error).message },
      { status: 500 }
    );
  }
}
