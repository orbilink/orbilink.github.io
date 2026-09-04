export interface GroundingSource {
  uri: string;
  title: string;
}

export interface SearchGroundingResult {
  text: string;
  sources: GroundingSource[];
  searchQueries: string[];
}

export class GeminiSearchService {
  /**
   * Performs real-time search grounding with Gemini 3.5 Flash and Google Search
   */
  async searchWithGoogle(query: string, conversationContext?: string): Promise<SearchGroundingResult> {
    const response = await fetch('/api/gemini/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        conversationContext,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Search request failed' }));
      throw new Error(errorData.error || `Search failed with status ${response.status}`);
    }

    const data = await response.json();
    return {
      text: data.text || '',
      sources: data.sources || [],
      searchQueries: data.searchQueries || [],
    };
  }
}

export const geminiSearchService = new GeminiSearchService();
