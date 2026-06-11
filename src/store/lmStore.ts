import { create } from 'zustand';

interface LMStudioState {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  testConnection: () => Promise<boolean>;
}

export const useLMStudioStore = create<LMStudioState>((set, get) => ({
  baseUrl: 'http://127.0.0.1:1234',
  setBaseUrl: (url) => {
    set({ baseUrl: url });
    localStorage.setItem('lm-studio-url', url);
  },
  testConnection: async () => {
    try {
      const response = await fetch(`${get().baseUrl}/v1/models`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
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
}
