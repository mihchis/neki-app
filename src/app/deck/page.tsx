"use client";

import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useCardStore } from '@/store/cardStore';
import ClientInit from '@/components/ClientInit';
import DeckEditModal from '@/components/DeckEditModal';
import ImportExportModal from '@/components/ImportExportModal';
import {
  ChevronLeft,
  Plus,
  BookOpen,
  Clock,
  Edit2,
  Trash2,
  AlertCircle,
  FileText,
  Loader2,
  Search,
  Settings,
} from 'lucide-react';
import QuickCardModal from '@/components/QuickCardModal';
import { motion, AnimatePresence } from 'framer-motion';
import { useLMStudioStore } from '@/store/lmStore';
import LMStudioSettings from '@/components/LMStudioSettings';

function DeckDetailContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const deckId = searchParams.get('id');
  const { decks, cards, setQuickCardModalOpen, deleteCard } = useCardStore();
  
  const deck = decks.find(d => d.id === deckId);
  const deckCards = cards.filter(c => c.deckId === deckId);
  const now = Date.now();
  const dueCount = deckCards.filter(c => c.dueDate <= now).length;

  const [isEditDeckModalOpen, setIsEditDeckModalOpen] = useState(false);
  const [isImportExportModalOpen, setIsImportExportModalOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[] | null>(null);

  const handleEditCard = (card: any) => {
    setQuickCardModalOpen(true, deckId, card);
  };

  const handleDeleteCard = async () => {
    if (cardToDelete) {
      await deleteCard(cardToDelete);
      setCardToDelete(null);
    }
  };

  const [showLMSettings, setShowLMSettings] = useState(false);
  
  const handleSemanticSearch = useCallback(async () => {
    if (!searchQuery.trim()) {
      setSearchResults(null);
      return;
    }
    setIsSearching(true);
    try {
      const baseUrl = useLMStudioStore.getState().baseUrl;
      
      // Get embedding for query
      const queryEmbedResponse = await fetch(`${baseUrl}/v1/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'text-embedding-bge-m3',
          input: searchQuery,
        }),
      });

      if (!queryEmbedResponse.ok) {
        throw new Error('LM Studio embedding error');
      }

      const queryData = await queryEmbedResponse.json();
      const queryEmbedding = queryData.data[0].embedding;

      // Calculate similarities
      const cardsWithScores = deckCards.map((card: any) => {
        if (!card.embedding) {
          return { ...card, score: 0.5 };
        }

        // Cosine similarity
        let dotProduct = 0;
        let normA = 0;
        let normB = 0;
        for (let i = 0; i < queryEmbedding.length; i++) {
          dotProduct += queryEmbedding[i] * card.embedding[i];
          normA += queryEmbedding[i] * queryEmbedding[i];
          normB += card.embedding[i] * card.embedding[i];
        }
        normA = Math.sqrt(normA);
        normB = Math.sqrt(normB);
        const similarity = dotProduct / (normA * normB);

        return { ...card, score: similarity };
      });

      // Sort by similarity score descending
      const sortedCards = cardsWithScores.sort((a: any, b: any) => b.score - a.score);

      // Filter out cards with too low score
      const filteredCards = sortedCards.filter((card: any) => card.score > 0.1);
      setSearchResults(filteredCards);
    } catch (e) {
      console.error('Search error:', e);
      // Fallback to simple text search if LM Studio is not available
      const query = searchQuery.toLowerCase();
      const results = deckCards.filter((card: any) => {
        return (
          card.front?.toLowerCase().includes(query) ||
          card.back?.toLowerCase().includes(query) ||
          card.definition?.toLowerCase().includes(query) ||
          card.example?.toLowerCase().includes(query)
        );
      });
      setSearchResults(results.length > 0 ? results : null);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery, deckCards]);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSemanticSearch();
      } else {
        setSearchResults(null);
      }
    }, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, handleSemanticSearch]);

  const displayCards = searchResults && searchResults.length > 0 ? searchResults : deckCards;

  if (!deck) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center">
        <div className="neo-card p-6 text-center">
          <h2 className="text-xl font-bold mb-4">Không tìm thấy bộ bài</h2>
          <button onClick={() => router.push('/')} className="neo-btn neo-btn-primary">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)]">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--neo-border)] py-4 px-4 md:px-6 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={() => router.push('/')}
            className="neo-btn p-2 shrink-0"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg md:text-xl font-bold text-[var(--foreground)] truncate">{deck.name}</h1>
            {deck.description && (
              <p className="text-xs md:text-sm text-gray-500 truncate">{deck.description}</p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setIsImportExportModalOpen(true)}
            className="neo-btn p-2"
            title="Nhập / Xuất thẻ"
          >
            <FileText className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowLMSettings(true)}
            className="neo-btn p-2"
            title="Cài đặt LM Studio"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsEditDeckModalOpen(true)}
            className="neo-btn p-2"
            title="Chỉnh sửa bộ bài"
          >
            <Edit2 className="w-5 h-5" />
          </button>
          <button
            onClick={() => setQuickCardModalOpen(true, deckId)}
            className="neo-btn neo-btn-primary flex items-center gap-2 text-xs md:text-sm"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm thẻ</span>
          </button>
        </div>
      </header>

      {/* Stats Bar & Search */}
      <div className="max-w-4xl mx-auto px-4 md:px-6 pt-6">
        <div className="neo-card p-4 bg-[var(--accent-blue-light)] mb-6 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-[var(--accent-blue)]" />
            <div>
              <div className="text-xl font-bold text-[var(--foreground)]">{deckCards.length}</div>
              <div className="text-xs opacity-70">Tổng thẻ</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-[var(--accent-red)]" />
            <div>
              <div className="text-xl font-bold text-[var(--foreground)]">{dueCount}</div>
              <div className="text-xs opacity-70">Đến hạn</div>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            {isSearching ? (
              <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
            ) : (
              <Search className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <input
            type="text"
            placeholder="Tìm kiếm thẻ (tìm kiếm ngữ nghĩa AI)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="neo-input pl-14 w-full"
          />
          {searchResults && searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSearchResults(null);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 hover:text-black dark:hover:text-white"
            >
              Hủy tìm kiếm
            </button>
          )}
        </div>

        {/* Cards List */}
        {displayCards.length === 0 ? (
          <div className="neo-card p-8 text-center">
            {searchQuery ? (
              <p className="text-gray-500 mb-4">Không tìm thấy thẻ nào khớp với tìm kiếm</p>
            ) : (
              <>
                <p className="text-gray-500 mb-4">Chưa có thẻ nào trong bộ bài này</p>
                <button
                  onClick={() => setQuickCardModalOpen(true, deckId)}
                  className="neo-btn neo-btn-primary"
                >
                  Thêm thẻ đầu tiên
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="space-y-4 pb-12">
            {displayCards.map((card: any, index: number) => (
              <div key={card.id || `card-${index}-${card.front?.slice(0, 10)}-${card.back?.slice(0, 10)}`} className="neo-card p-4 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base md:text-lg font-bold text-[var(--foreground)] mb-2 break-words">
                      {card.front}
                    </h3>
                    <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mb-2 break-words">
                      {card.back}
                    </p>
                    {card.ipa && (
                      <p className="text-xs md:text-sm text-gray-500 font-mono">{card.ipa}</p>
                    )}
                    {card.definition && (
                      <p className="text-xs md:text-sm text-gray-500 mt-2">
                        <span className="font-semibold">Định nghĩa:</span> {card.definition}
                      </p>
                    )}
                    {card.example && (
                      <p className="text-xs md:text-sm text-gray-500 mt-1 italic">
                        <span className="font-semibold">Ví dụ:</span> "{card.example}"
                      </p>
                    )}
                    {card.score !== undefined && searchResults && (
                      <p className="text-xs text-gray-400 mt-2">
                        Độ khớp: {Math.round(card.score * 100)}%
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <div className={`text-xs font-bold px-2 py-1 rounded-full border border-[var(--neo-border)] ${
                      card.dueDate <= now 
                        ? 'bg-[var(--accent-red-light)] text-red-600 dark:text-red-400' 
                        : 'bg-[var(--accent-green-light)] text-green-600 dark:text-green-400'
                    }`}>
                      {card.dueDate <= now ? 'Đến hạn' : 'Chưa đến hạn'}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCard(card)}
                        className="neo-btn p-2"
                        title="Chỉnh sửa thẻ"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setCardToDelete(card.id!)}
                        className="neo-btn p-2 neo-btn-red"
                        title="Xóa thẻ"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Card Confirmation Modal */}
      <AnimatePresence>
        {cardToDelete && (
          <div key="card-delete-confirm-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <div className="absolute inset-0" onClick={() => setCardToDelete(null)}></div>
            <motion.div
              key="card-delete-confirm-modal"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative neo-card max-w-sm w-full p-6 bg-[var(--card-bg)] z-10 text-center"
            >
              <AlertCircle className="w-12 h-12 mx-auto text-[var(--accent-red)] mb-3 animate-bounce" />
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                Xóa thẻ?
              </h3>
              <p className="text-sm opacity-80 mb-6 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn xóa thẻ này? Hành động này không thể hoàn tác.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setCardToDelete(null)}
                  className="neo-btn bg-gray-200 text-black font-bold py-2.5 hover:bg-gray-100 text-xs uppercase"
                >
                  Hủy bỏ
                </button>
                <button
                  onClick={handleDeleteCard}
                  className="neo-btn neo-btn-red py-2.5 font-bold text-xs uppercase"
                >
                  Đồng ý xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeckEditModal 
        deckId={deckId!} 
        isOpen={isEditDeckModalOpen} 
        onClose={() => setIsEditDeckModalOpen(false)} 
      />
      
      <ImportExportModal 
        deckId={deckId!} 
        isOpen={isImportExportModalOpen} 
        onClose={() => setIsImportExportModalOpen(false)} 
      />
      
      <QuickCardModal />
      
      <LMStudioSettings
        isOpen={showLMSettings}
        onClose={() => setShowLMSettings(false)}
      />
    </div>
  );
}

export default function DeckDetailPage() {
  return (
    <ClientInit>
      <DeckDetailContent />
    </ClientInit>
  );
}
