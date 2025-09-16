// Fix: Added manual type definitions for `import.meta.env` to resolve Vite client type errors.
// This is necessary because the `/// <reference types="vite/client" />` directive was not working.
// By wrapping in `declare global`, we augment the global `ImportMeta` type instead of shadowing it.
declare global {
  interface ImportMetaEnv {
    // Fix: Corrected typo from VITE_CONEX_URL to VITE_CONVEX_URL.
    readonly VITE_CONVEX_URL: string;
    readonly VITE_CLERK_PUBLISHABLE_KEY: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

import React, { useState, useEffect, useRef, FC } from 'react';
import { createRoot } from 'react-dom/client';
import { motion, AnimatePresence } from 'framer-motion';
import { ConvexReactClient } from 'convex/react';
import { ClerkProvider, SignedIn, SignedOut, SignInButton, UserButton, useAuth as useClerkAuth } from '@clerk/clerk-react';
import { ConvexProviderWithAuth, useConvex, useAction, useQuery, useMutation } from 'convex/react';

import { Visualizer3D } from './visual-3d';
import { Deal, createDeal } from './visual';
import { useStore } from './store';
import { api } from './convex/_generated/api';
import { Id } from './convex/_generated/dataModel';

const CONVEX_URL = import.meta.env.VITE_CONVEX_URL;
const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Initialize the Convex client
const convex = new ConvexReactClient(CONVEX_URL);

const useAuth = () => {
  const { isLoaded, isSignedIn, getToken } = useClerkAuth();
  return {
    isLoading: !isLoaded,
    isAuthenticated: isSignedIn ?? false,
    fetchAccessToken: async ({ forceRefreshToken }: { forceRefreshToken: boolean; }) => {
      const token = await getToken({
        template: 'convex',
        skipCache: forceRefreshToken
      });
      return token ?? '';
    }
  };
};

// --- SVG ICONS ---
const MicIcon: FC<{ className?: string }> = ({ className }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 14a2 2 0 0 1-2-2V6a2 2 0 0 1 4 0v6a2 2 0 0 1-2 2Zm-2-6a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h0a2 2 0 0 1-2-2V6ZM12 18.5c-2.8 0-5.3-2.2-5.3-5V9.8h1.5v3.7c0 2.1 1.7 3.8 3.8 3.8s3.8-1.7 3.8-3.8V9.8h1.5v3.7c0 2.8-2.5 5-5.3 5Z"/></svg>
);
const StopIcon: FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 6h8c1.1 0 2 .9 2 2v8c0 1.1-.9 2-2 2H8c-1.1 0-2-.9-2-2V8c0-1.1.9-2 2-2Z"/></svg>
);
const PaperPlaneIcon: FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M3.4 20.4l17.4-8.4c.8-.4.8-1.5 0-1.9L3.4 1.6c-.8-.4-1.6.4-1.3 1.2l3.4 7.4-3.4 7.4c-.3.8.5 1.6 1.3 1.2zM5.5 12l-2.4-5.2 12.5 6-12.5 6L5.5 12z"/></svg>
);
const PlusIcon: FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
);
const BookmarkIcon: FC<{ className?: string; isFilled?: boolean }> = ({ className, isFilled }) => (
    isFilled ? (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/></svg>
    ) : (
        <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2zm0 15l-5-2.18L7 18V5h10v13z"/></svg>
    )
);
const SettingsIcon: FC<{ className?: string }> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M19.4 12c0-.2-.1-.4-.1-.6l1.9-1.5c.3-.2.4-.6.2-.9l-1.9-3.3c-.2-.3-.6-.4-.9-.2l-2.3.9c-.5-.4-1-.7-1.6-.9l-.4-2.5c-.1-.4-.4-.6-.8-.6h-3.8c-.4 0-.7.2-.8.6l-.4 2.5c-.6.2-1.2.5-1.6.9l-2.3-.9c-.3-.2-.7-.1-.9.2l-1.9 3.3c-.2.3-.1.7.2.9l1.9 1.5c0 .2-.1.4-.1.6s.1.4.1.6l-1.9 1.5c-.3.2-.4.6-.2.9l1.9 3.3c.2.3.6.4.9.2l2.3-.9c.5.4 1 .7 1.6.9l.4 2.5c.1.4.4.6.8.6h3.8c.4 0 .7.2.8.6l.4-2.5c.6-.2 1.2-.5 1.6-.9l2.3.9c.3.2.7.1.9-.2l1.9-3.3c.2-.3.1-.7-.2-.9l-1.9-1.5zM12 15.5c-1.9 0-3.5-1.6-3.5-3.5s1.6-3.5 3.5-3.5 3.5 1.6 3.5 3.5-1.6 3.5-3.5 3.5z"/></svg>
);


// --- REACT COMPONENTS ---

const Header: FC<{ onCreateDeal: () => void; onOpenSettings: () => void; }> = ({ onCreateDeal, onOpenSettings }) => (
  <header className="absolute top-0 left-0 right-0 z-20 p-4 flex justify-between items-center">
    <h1 className="text-xl font-bold tracking-tighter">FundMe</h1>
    <SignedIn>
        <div className="flex items-center gap-4">
            <button onClick={onOpenSettings} className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors">
                <SettingsIcon className="w-6 h-6" />
            </button>
            <button onClick={onCreateDeal} className="p-2 rounded-full bg-slate-800/80 hover:bg-slate-700 transition-colors">
                <PlusIcon className="w-6 h-6" />
            </button>
            <UserButton afterSignOutUrl="/" />
        </div>
    </SignedIn>
  </header>
);

const DealCard: FC<{ deal: Deal; isBookmarked: boolean }> = ({ deal, isBookmarked }) => {
  const progress = (deal.amountRaised / deal.amountTarget) * 100;
  const toggleBookmark = useMutation(api.bookmarks.toggle);

  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    toggleBookmark({ dealId: deal._id });
  };

  return (
    <div className="glass-card w-full shrink-0 overflow-hidden transform-gpu transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl hover:shadow-indigo-900/50">
      <div className="relative aspect-[4/3] overflow-hidden">
        <img src={deal.imageUrl} alt={deal.name} className="w-full h-full object-cover transform -rotate-3 scale-110" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 to-transparent"></div>
        <div className="absolute top-2 right-2">
            <button onClick={handleBookmark} className="p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors">
                <BookmarkIcon className={`w-6 h-6 ${isBookmarked ? 'text-indigo-400' : 'text-slate-300'}`} isFilled={isBookmarked} />
            </button>
        </div>
        <div className="absolute bottom-0 left-0 p-4">
            <h2 className="text-xl font-bold text-white">{deal.name}</h2>
            <p className="text-sm text-slate-300">{deal.dealerName} ★ {deal.dealerRating}</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div>
          <div className="flex justify-between items-baseline mb-1">
            <span className="text-lg font-semibold text-white">${deal.amountRaised.toLocaleString()}</span>
            <span className="text-sm text-slate-400">raised of ${deal.amountTarget.toLocaleString()}</span>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-2">
            <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
            <div>
                <p className="text-slate-400">Return</p>
                <p className="font-semibold text-white">{deal.interestRate}%</p>
            </div>
             <div>
                <p className="text-slate-400">Delivery</p>
                <p className="font-semibold text-white">{deal.deliveryEta}</p>
            </div>
            <div>
                <p className="text-slate-400">Escrow</p>
                <p className={`font-semibold ${deal.escrow ? 'text-green-400' : 'text-amber-400'}`}>{deal.escrow ? 'Yes' : 'No'}</p>
            </div>
        </div>
      </div>
    </div>
  );
};

const MainContent: FC = () => {
  const allDeals = useQuery(api.deals.list) || [];
  const userBookmarks = useQuery(api.bookmarks.get) || [];
  const { aiSummary, searchResults, isSearching } = useStore();
  
  const dealsToDisplay = searchResults.length > 0 ? searchResults : allDeals;
  const bookmarkedDealIds = new Set(userBookmarks.map(b => b.dealId));

  return (
    <main className="flex-1 flex flex-col pt-20 pb-40 overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 space-y-4 deal-list">
        <AnimatePresence>
          {isSearching ? (
            <motion.div className="flex items-center justify-center h-full" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <p className="text-slate-400">Searching for deals...</p>
            </motion.div>
          ) : dealsToDisplay.map((deal, index) => (
            <motion.div
              key={deal._id}
              initial={{ opacity: 0, y: -50, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.5, delay: index * 0.1, ease: "circOut" }}
            >
              <DealCard deal={deal} isBookmarked={bookmarkedDealIds.has(deal._id)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      <AnimatePresence>
        {aiSummary && (
          <motion.div
            className="px-4 pt-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            <p className="text-slate-300 text-center">{aiSummary}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

const ErrorMessage: FC = () => {
    const error = useStore(s => s.searchError);
    const clearError = useStore(s => s.clearError);
    
    if (!error) return null;
    
    return (
        <motion.div 
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600/90 text-white px-6 py-3 rounded-lg shadow-lg z-50 flex items-center gap-4"
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
        >
            <span>{error}</span>
            <button 
                onClick={clearError}
                className="text-white hover:text-gray-200"
                aria-label="Dismiss error"
            >
                ✕
            </button>
        </motion.div>
    );
};

const ChatInput: FC = () => {
    const [input, setInput] = useState('');
    const [isRecording, setIsRecording] = useState(false);
    const { 
        startSearch, 
        setSearchResults, 
        setAiSummary, 
        setSearchError, 
        clearError 
    } = useStore();
    const isSearching = useStore(s => s.isSearching);
    const askAI = useAction(api.ai.ask);
    
    const showError = (message: string) => {
        setSearchError(message);
        setAiSummary('');
        setSearchResults([], '');
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const prompt = input.trim();
        if (!prompt || isSearching) return;

        setInput('');
        startSearch();
        clearError();

        try {
            const result = await askAI({ prompt });
            if (result) {
                const typedDeals = result.deals.map(deal => createDeal(deal));
                setSearchResults(typedDeals, result.summary);
            } else {
                showError("I couldn't find any matching deals. Please try a different search.");
            }
        } catch (error: any) {
            console.error("AI search failed:", error);
            const errorMessage = error?.message || "An unexpected error occurred";
            
            // Handle specific error cases
            if (errorMessage.includes("sign in")) {
                showError("🔒 Please sign in to use AI search");
            } else if (errorMessage.includes("API key")) {
                showError("🔑 Please set up your Gemini API key in settings");
            } else if (errorMessage.includes("profile")) {
                showError("👤 Please complete your profile in settings");
            } else {
                showError(`❌ Search failed: ${errorMessage}`);
            }
        }
    }
    
    // Placeholder for mic toggle
    const handleToggleMic = () => setIsRecording(!isRecording);

    return (
        <>
            <form onSubmit={handleSubmit} className="flex items-center gap-2 w-full max-w-2xl mx-auto p-2 rounded-full glass-input">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={isRecording ? "Listening..." : (isSearching ? "Thinking..." : "Ask about deals...")}
                className="flex-1 bg-transparent text-white placeholder-slate-400 focus:outline-none px-4"
                disabled={isRecording || isSearching}
            />
            <button type="button" onClick={handleToggleMic} className={`p-3 rounded-full transition-colors ${isRecording ? 'bg-red-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`} disabled={isSearching}>
                {isRecording ? <StopIcon className="w-6 h-6" /> : <MicIcon className="w-6 h-6" />}
            </button>
             {!isRecording && (
                <button type="submit" className="p-3 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-colors" disabled={!input.trim() || isSearching}>
                    <PaperPlaneIcon className="w-6 h-6" />
                </button>
             )}
            </form>
            <ErrorMessage />
        </>
    );
};

const AIBlob: FC<{ inputNode?: GainNode; outputNode?: GainNode }> = ({ inputNode, outputNode }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        let visualizer: Visualizer3D | null = null;
        if (canvasRef.current && inputNode && outputNode) {
            visualizer = new Visualizer3D(canvasRef.current, inputNode, outputNode);
            visualizer.start();
        }
        return () => {
            visualizer?.stop();
        };
    }, [canvasRef, inputNode, outputNode]);

    return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />;
};

const CreateDealModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const createDeal = useMutation(api.deals.create);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        try {
            await createDeal({
                name: formData.get('name') as string,
                description: formData.get('description') as string,
                imageUrl: formData.get('imageUrl') as string,
                amountTarget: Number(formData.get('amountTarget')),
                deliveryEta: formData.get('deliveryEta') as string,
                interestRate: Number(formData.get('interestRate')),
                escrow: formData.get('escrow') === 'on',
            });
            onClose();
        } catch (error) {
            console.error("Failed to create deal:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div 
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Background with blur and overlay */}
                    <div 
                        className="fixed inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/95 to-slate-900/90 backdrop-blur-sm"
                        onClick={onClose}
                    >
                        {/* Animated money bag in the background */}
                        <div className="absolute inset-0 overflow-hidden opacity-20">
                            <img 
                                src="/images/hand-drawn-old-money-bag.png" 
                                alt="" 
                                className="absolute top-1/4 -left-20 w-64 h-64 opacity-70 animate-float"
                                style={{ animation: 'float 6s ease-in-out infinite' }}
                            />
                            <img 
                                src="/images/hand-drawn-old-money-bag.png" 
                                alt="" 
                                className="absolute bottom-1/4 -right-20 w-64 h-64 opacity-70 animate-float"
                                style={{ animation: 'float 8s ease-in-out infinite 1s' }}
                            />
                        </div>
                    </div>
                    
                    {/* Modal Content */}
                    <motion.div 
                        className="relative w-full max-w-lg p-8 glass-modal rounded-2xl overflow-hidden border border-white/10"
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.9, y: 20, opacity: 0 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button 
                            onClick={onClose}
                            className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-white/10 transition-colors"
                            aria-label="Close"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                        
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                                Create New Deal
                            </h2>
                            <p className="text-slate-400 mt-2">Fill in the details to list your investment opportunity</p>
                        </div>
                        
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <input 
                                    name="name" 
                                    type="text" 
                                    placeholder="Deal Name" 
                                    required 
                                    className="w-full p-3.5 rounded-xl glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                                />
                            </div>
                            
                            <div>
                                <textarea 
                                    name="description" 
                                    placeholder="Describe your deal in detail..." 
                                    required 
                                    rows={4}
                                    className="w-full p-3.5 rounded-xl glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 resize-none transition-all duration-200"
                                ></textarea>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <input 
                                        name="amountTarget" 
                                        type="number" 
                                        placeholder="Amount Target ($)" 
                                        required 
                                        min="0"
                                        step="0.01"
                                        className="w-full p-3.5 rounded-xl glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                                <div>
                                    <input 
                                        name="interestRate" 
                                        type="number" 
                                        placeholder="Return Rate (%)" 
                                        required 
                                        min="0"
                                        max="100"
                                        step="0.1"
                                        className="w-full p-3.5 rounded-xl glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50"
                                    />
                                </div>
                            </div>
                            
                            <div>
                                <input 
                                    name="imageUrl" 
                                    type="url" 
                                    placeholder="Image URL (https://...)" 
                                    required 
                                    className="w-full p-3.5 rounded-xl glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                                />
                            </div>
                            
                            <div>
                                <input 
                                    name="deliveryEta" 
                                    type="text" 
                                    placeholder="Delivery Timeline (e.g., 'Within 3 months')" 
                                    required 
                                    className="w-full p-3.5 rounded-xl glass-input text-white placeholder-slate-400 focus:ring-2 focus:ring-indigo-500/50 transition-all duration-200"
                                />
                            </div>
                            
                            <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-800/30 border border-slate-700/50">
                                <div className="flex items-center">
                                    <div className="flex items-center h-5">
                                        <input 
                                            id="escrow" 
                                            name="escrow" 
                                            type="checkbox" 
                                            className="h-4 w-4 rounded border-slate-600 bg-slate-700/50 text-indigo-500 focus:ring-indigo-500" 
                                        />
                                    </div>
                                    <label htmlFor="escrow" className="ml-3 text-sm font-medium text-slate-300">
                                        Enable Escrow Protection
                                    </label>
                                </div>
                                <span className="text-xs text-slate-400">Recommended for high-value deals</span>
                            </div>
                            
                            <div className="flex justify-end gap-3 pt-2">
                                <button 
                                    type="button" 
                                    onClick={onClose} 
                                    className="px-6 py-3 rounded-xl bg-slate-700/50 hover:bg-slate-700/70 text-slate-200 font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting} 
                                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-medium transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {isSubmitting ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Creating...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                            Create Deal
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

const SettingsModal: FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const user = useQuery(api.users.getCurrent);
    const storeApiKey = useMutation(api.users.storeApiKey);
    const syncUser = useMutation(api.syncUser.syncCurrentUser);
    const [apiKey, setApiKey] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [syncStatus, setSyncStatus] = useState<string | null>(null);
    const hasKey = !!user?.encryptedGeminiKey;
    const clerkAuth = useClerkAuth();

    const handleSyncUser = async () => {
        const userId = clerkAuth.userId;
        if (!userId) {
            setSyncStatus('Error: No user logged in');
            return;
        }
        
        setIsSyncing(true);
        setSyncStatus('Syncing user...');
        try {
            const result = await syncUser({ clerkId: userId });
            setSyncStatus('Sync successful! Please refresh the page.');
            console.log('User sync result:', result);
        } catch (error) {
            console.error('Error syncing user:', error);
            setSyncStatus(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSyncing(false);
        }
    };

    useEffect(() => {
        setApiKey('');
    }, [isOpen, user]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!apiKey.trim()) return;
        setIsSubmitting(true);
        try {
            await storeApiKey({ apiKey });
            onClose();
        } catch (error) {
            console.error("Failed to save API key:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center p-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                >
                    <div className="absolute inset-0 bg-black/70" onClick={onClose}></div>
                    <motion.div
                        className="relative w-full max-w-md p-6 rounded-2xl glass-card overflow-hidden"
                        initial={{ scale: 0.9, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.9, y: 20 }}
                    >
                        <h2 className="text-2xl font-bold mb-2">Settings</h2>
                        <p className="text-slate-400 mb-4">Your Gemini API key is stored securely and used only for your requests.</p>
                        
                        {/* Debug Section */}
                        <div className="mb-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
                            <h3 className="font-medium text-slate-300 mb-2">Debug Tools</h3>
                            <div className="flex flex-col space-y-3">
                                <button
                                    type="button"
                                    onClick={handleSyncUser}
                                    disabled={isSyncing}
                                    className="px-3 py-2 text-sm rounded-md bg-amber-600 hover:bg-amber-500 disabled:bg-amber-800 disabled:cursor-not-allowed"
                                >
                                    {isSyncing ? 'Syncing...' : 'Sync User Account'}
                                </button>
                                {syncStatus && (
                                    <div className={`text-xs p-2 rounded ${syncStatus.includes('Error') ? 'bg-red-900/50 text-red-300' : 'bg-green-900/50 text-green-300'}`}>
                                        {syncStatus}
                                    </div>
                                )}
                            </div>
                            {user && (
                                <div className="mt-3 text-xs text-slate-400 break-all">
                                    <div>User ID: {user?._id || 'N/A'}</div>
                                    <div>Clerk ID: {user?.clerkId || 'N/A'}</div>
                                    <div>Has API Key: {user?.encryptedGeminiKey ? 'Yes' : 'No'}</div>
                                </div>
                            )}
                        </div>

                        {hasKey && (
                           <div className="p-3 mb-4 rounded-lg bg-green-900/50 border border-green-700 text-green-300 text-sm">
                              An API key is already saved. Entering a new key will overwrite it.
                           </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <input
                                name="apiKey"
                                type="password"
                                placeholder="Enter your Gemini API Key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                required
                                className="w-full p-3 rounded-lg bg-slate-800/50 border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                            <div className="flex justify-end gap-3 pt-2">
                                <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-colors">Cancel</button>
                                <button type="submit" disabled={isSubmitting || !apiKey.trim()} className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-colors disabled:bg-indigo-800 disabled:cursor-not-allowed">
                                    {isSubmitting ? 'Saving...' : 'Save Key'}
                                </button>
                            </div>
                        </form>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

// --- APP ---
const App: FC = () => {
  const [inputNode, setInputNode] = useState<GainNode>();
  const [outputNode, setOutputNode] = useState<GainNode>();
  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isSettingsModalOpen, setSettingsModalOpen] = useState(false);

  useEffect(() => {
    const AudioContextClass = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AudioContextClass) {
        console.error("AudioContext not supported by this browser.");
        return;
    }
    try {
        const inputAudioContext = new AudioContextClass({ sampleRate: 16000 });
        const outputAudioContext = new AudioContextClass({ sampleRate: 24000 });
        setInputNode(inputAudioContext.createGain());
        const outNode = outputAudioContext.createGain();
        outNode.connect(outputAudioContext.destination);
        setOutputNode(outNode);
    } catch (e) {
        console.warn('Failed to create AudioContext, visualization will be disabled.', e);
    }
  }, []);
  
  return (
    <div className="relative w-screen h-screen overflow-hidden flex flex-col bg-brand-dark">
        <div className="absolute inset-0 z-0 opacity-50">
           {inputNode && outputNode && <AIBlob inputNode={inputNode} outputNode={outputNode} />}
        </div>
        <div className="relative z-10 flex flex-col w-full h-full">
            <Header 
              onCreateDeal={() => setCreateModalOpen(true)} 
              onOpenSettings={() => setSettingsModalOpen(true)}
            />
            <SignedIn>
              <MainContent />
              <footer className="w-full p-4">
                <ChatInput />
              </footer>
            </SignedIn>
            <SignedOut>
                <div className="flex-1 flex flex-col justify-center items-center text-center p-4">
                    <h2 className="text-3xl font-bold mb-2">Welcome to FundMe</h2>
                    <p className="text-slate-400 mb-6 max-w-sm">Sign in to discover, create, and fund deals using the power of conversational AI.</p>
                    <SignInButton mode="modal">
                        <button className="px-6 py-3 bg-indigo-600 text-white font-semibold rounded-full hover:bg-indigo-500 transition-colors">
                            Sign In with Phone
                        </button>
                    </SignInButton>
                </div>
            </SignedOut>
        </div>
        <CreateDealModal isOpen={isCreateModalOpen} onClose={() => setCreateModalOpen(false)} />
        <SettingsModal isOpen={isSettingsModalOpen} onClose={() => setSettingsModalOpen(false)} />
    </div>
  );
};

const AppWrapper: FC = () => {
    if (!CLERK_PUBLISHABLE_KEY) {
        throw new Error("Missing Clerk publishable key. Please set VITE_CLERK_PUBLISHABLE_KEY in your .env.local file.");
    }
    if (!CONVEX_URL) {
        throw new Error("Missing Convex URL. Please set VITE_CONVEX_URL in your .env.local file.");
    }

    return (
        <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
            <ConvexProviderWithAuth client={convex} useAuth={useAuth}>
                <App />
            </ConvexProviderWithAuth>
        </ClerkProvider>
    );
};


// --- RENDER ---
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<AppWrapper />);
}