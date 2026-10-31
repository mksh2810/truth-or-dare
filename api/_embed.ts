import { pseudoEmbed } from '../src/game/similarity';

/**
 * Generates text embeddings using Google Gemini API (text-embedding-004).
 * Falls back gracefully to character-trigram pseudo embeddings if API key
 * is missing, rate-limited, or fails.
 */
export async function getEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || !apiKey.trim()) {
    return pseudoEmbed(text);
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'models/text-embedding-004',
        content: {
          parts: [{ text }],
        },
      }),
    });

    if (!response.ok) {
      console.warn(`Gemini embedding failed with status ${response.status}, using trigram fallback`);
      return pseudoEmbed(text);
    }

    const data = await response.json();
    const values = data?.embedding?.values;
    if (Array.isArray(values) && values.length > 0) {
      return values;
    }
    return pseudoEmbed(text);
  } catch (err) {
    console.warn('Embedding request error, falling back to trigram pseudo embedding:', err);
    return pseudoEmbed(text);
  }
}
