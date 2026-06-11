import { create } from 'zustand';

interface LMStudioState {
  baseUrl: string;
  chatModel: string;
  embeddingModel: string;
  loadedModels: string[];
  setBaseUrl: (url: string) => void;
  setChatModel: (model: string) => void;
  setEmbeddingModel: (model: string) => void;
  testConnection: () => Promise<boolean>;
  fetchModels: () => Promise<boolean>;
}

export const useLMStudioStore = create<LMStudioState>((set, get) => ({
  baseUrl: 'http://127.0.0.1:1234',
  chatModel: 'qwen/qwen3.5-9b',
  embeddingModel: 'text-embedding-bge-m3',
  loadedModels: [],
  setBaseUrl: (url) => {
    // Normalize url: strip trailing slash
    const normalized = url.trim().replace(/\/$/, '');
    set({ baseUrl: normalized });
    localStorage.setItem('lm-studio-url', normalized);
  },
  setChatModel: (model) => {
    set({ chatModel: model });
    localStorage.setItem('lm-studio-chat-model', model);
  },
  setEmbeddingModel: (model) => {
    set({ embeddingModel: model });
    localStorage.setItem('lm-studio-embed-model', model);
  },
  testConnection: async () => {
    return get().fetchModels();
  },
  fetchModels: async () => {
    try {
      // Fetch via Next.js proxy to avoid CORS
      const proxyResponse = await fetch('/api/ai/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetUrl: `${get().baseUrl}/v1/models`,
          method: 'GET'
        })
      });
      
      if (!proxyResponse.ok) {
        // Try fallback native endpoint via proxy
        const fallbackResponse = await fetch('/api/ai/proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            targetUrl: `${get().baseUrl}/api/v1/models`,
            method: 'GET'
          })
        });
        if (!fallbackResponse.ok) throw new Error();
        return handleModelsData(await fallbackResponse.json());
      }
      
      return handleModelsData(await proxyResponse.json());
      
      function handleModelsData(data: any) {
        const models = data?.data || [];
        if (models.length > 0) {
          const modelIds = models.map((m: any) => m.id);
          
          // Find embedding model
          const embed = models.find((m: any) => {
            const id = (m.id || '').toLowerCase();
            const type = (m.type || '').toLowerCase();
            return id.includes('embed') || id.includes('bge') || type.includes('embed');
          });
          
          // Find chat model (first non-embedding model)
          const chat = models.find((m: any) => {
            const id = (m.id || '').toLowerCase();
            const type = (m.type || '').toLowerCase();
            const isEmbed = id.includes('embed') || id.includes('bge') || type.includes('embed');
            return !isEmbed;
          });

          const chatModelName = chat?.id || models[0].id;
          const embedModelName = embed?.id || models[0].id;

          set({
            chatModel: chatModelName,
            embeddingModel: embedModelName,
            loadedModels: modelIds,
          });

          localStorage.setItem('lm-studio-chat-model', chatModelName);
          localStorage.setItem('lm-studio-embed-model', embedModelName);
        } else {
          set({ loadedModels: [] });
        }
        return true;
      }
    } catch (e) {
      console.warn('Failed to fetch models from LM Studio via proxy:', e);
      set({ loadedModels: [] });
      return false;
    }
  },
}));

// Initialize from localStorage
if (typeof window !== 'undefined') {
  const savedUrl = localStorage.getItem('lm-studio-url');
  if (savedUrl) {
    useLMStudioStore.setState({ baseUrl: savedUrl });
  }
  const savedChat = localStorage.getItem('lm-studio-chat-model');
  if (savedChat) {
    useLMStudioStore.setState({ chatModel: savedChat });
  }
  const savedEmbed = localStorage.getItem('lm-studio-embed-model');
  if (savedEmbed) {
    useLMStudioStore.setState({ embeddingModel: savedEmbed });
  }
}
