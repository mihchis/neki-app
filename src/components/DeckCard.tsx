"use client";

import React, { useState } from 'react';
import { useCardStore } from '@/store/cardStore';
import { Play, Plus, Trash2, BookOpen, AlertTriangle, List } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';

interface DeckCardProps {
  deckId: string;
  name: string;
  description: string;
}

export default function DeckCard({ deckId, name, description }: DeckCardProps) {
  const router = useRouter();
  const { startSession, setQuickCardModalOpen, deleteDeck, cards } = useCardStore();
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  // Reactive counts calculated directly from Zustand synced cards list
  const deckCards = cards.filter((c) => c.deckId === deckId);
  const totalCount = deckCards.length;
  const now = Date.now();
  const dueCount = deckCards.filter((c) => c.dueDate <= now).length;

  const handleStudy = async () => {
    if (dueCount === 0) return;
    await startSession(deckId);
    router.push('/review');
  };

  const handleViewCards = (e: React.MouseEvent) => {
    e.stopPropagation();
    router.push(`/deck?id=${deckId}`);
  };

  const handleDeleteTrigger = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowConfirmDelete(true);
  };

  const handleConfirmDelete = async () => {
    setShowConfirmDelete(false);
    await deleteDeck(deckId);
  };

  const handleAddCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickCardModalOpen(true, deckId);
  };

  return (
    <>
      <div className="neo-card-interactive flex flex-col justify-between p-6 bg-[var(--card-bg)] min-h-[200px]">
        <div>
          <div className="flex items-start justify-between gap-2 mb-2">
            <h3 className="text-base md:text-lg font-bold tracking-tight text-[var(--foreground)] truncate flex-1" title={name}>
              {name}
            </h3>
            <button
              onClick={handleDeleteTrigger}
              className="neo-btn p-1.5 bg-[var(--accent-red-light)] text-[var(--accent-red)] hover:bg-red-500 hover:text-white"
              title="Xóa bộ bài"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs md:text-sm opacity-80 line-clamp-2 mb-4 font-semibold">
            {description || 'Không có mô tả.'}
          </p>
        </div>

        <div className="mt-auto space-y-4">
          {/* Card stats */}
          <div className="flex items-center gap-3 text-[10px] md:text-xs font-bold uppercase">
            <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[var(--accent-purple-light)] text-[var(--accent-purple)] border border-[var(--neo-border)] rounded-lg">
              <BookOpen className="w-3.5 h-3.5" />
              <span>{totalCount} thẻ</span>
            </div>
            <div className={`flex items-center gap-1.5 px-2.5 py-1 border border-[var(--neo-border)] rounded-lg ${
              dueCount > 0 ? 'bg-[var(--accent-red-light)] text-red-600 dark:text-red-400' : 'bg-[var(--accent-green-light)] text-green-600 dark:text-green-400'
            }`}>
              <span>{dueCount} đến hạn</span>
            </div>
          </div>

          {/* Action button grid */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={handleViewCards}
              className="neo-btn py-2 text-xs flex items-center justify-center gap-1"
            >
              <List className="w-3.5 h-3.5" />
              <span>Xem</span>
            </button>
            <button
              onClick={handleAddCard}
              className="neo-btn py-2 text-xs flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm</span>
            </button>
            <button
              onClick={handleStudy}
              disabled={dueCount === 0}
              className={`neo-btn py-2 text-xs flex items-center justify-center gap-1 ${
                dueCount > 0
                  ? 'neo-btn-primary'
                  : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <Play className="w-3.5 h-3.5" />
              <span>Ôn</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Neo-Brutalism Delete Confirmation Modal */}
      <AnimatePresence>
        {showConfirmDelete && (
          <div key="deck-delete-confirm-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {/* Backdrop click to close */}
            <div className="absolute inset-0" onClick={() => setShowConfirmDelete(false)}></div>
            
            <motion.div
              key="deck-delete-confirm-modal"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative neo-card max-w-sm w-full p-6 bg-[var(--card-bg)] z-10 text-center"
            >
              <AlertTriangle className="w-12 h-12 mx-auto text-[var(--accent-red)] mb-3 animate-bounce" />
              
              <h3 className="text-xl font-bold text-[var(--foreground)] mb-2">
                Xóa Bộ Bài?
              </h3>
              
              <p className="text-sm opacity-80 mb-6 font-semibold leading-relaxed">
                Bạn có chắc chắn muốn xóa bộ bài <strong className="text-red-500 font-bold">"{name}"</strong> và tất cả thẻ học đi kèm? Hành động này không thể hoàn tác.
              </p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowConfirmDelete(false)}
                  className="neo-btn bg-gray-200 text-black font-bold py-2.5 hover:bg-gray-100 text-xs uppercase"
                >
                  Hủy bỏ
                </button>
                
                <button
                  onClick={handleConfirmDelete}
                  className="neo-btn neo-btn-red py-2.5 font-bold text-xs uppercase"
                >
                  Đồng ý xóa
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
