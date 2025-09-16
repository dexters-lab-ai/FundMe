import { create } from 'zustand';
import { Deal } from './visual';

interface AppState {
  aiSummary: string;
  summaryTimeout: number | null;
  searchResults: Deal[];
  isSearching: boolean;
  searchError: string | null;
  setAiSummary: (summary: string, duration?: number) => void;
  startSearch: () => void;
  setSearchResults: (deals: Deal[], summary: string) => void;
  setSearchError: (error: string | null) => void;
  clearSearch: () => void;
  clearSummary: () => void;
  clearError: () => void;
}

export const useStore = create<AppState>((set, get) => ({
  aiSummary: '',
  summaryTimeout: null,
  searchResults: [],
  isSearching: false,
  searchError: null,

  setAiSummary: (summary, duration = 60000) => {
    const { summaryTimeout } = get();
    if (summaryTimeout) clearTimeout(summaryTimeout);
    
    set({ aiSummary: summary });

    const newTimeout = window.setTimeout(() => {
      set({ aiSummary: '' });
    }, duration);

    set({ summaryTimeout: newTimeout });
  },

  startSearch: () => {
    get().clearSummary();
    set({ isSearching: true, searchResults: [] });
  },

  setSearchResults: (deals, summary) => {
    set({ searchResults: deals, isSearching: false });
    get().setAiSummary(summary);
  },
  
  clearSearch: () => {
    set({ searchResults: [] });
  },

  clearSummary: () => {
    const { summaryTimeout } = get();
    if (summaryTimeout) clearTimeout(summaryTimeout);
    set({ aiSummary: '', summaryTimeout: null });
  },
  
  setSearchError: (error) => {
    set({ searchError: error });
    // Clear error after 10 seconds
    if (error) {
      setTimeout(() => {
        set(state => state.searchError === error ? { searchError: null } : {});
      }, 10000);
    }
  },
  
  clearError: () => set({ searchError: null }),
}));