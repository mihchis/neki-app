"use client";

import React, { useState, useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DeckEditModalProps {
  deckId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function DeckEditModal({ deckId, isOpen, onClose }: DeckEditModalProps) {
  const { decks, editDeck } = useCardStore();
  
  const deck = decks.find(d => d.id === deckId);
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen && deck) {
      setName(deck.name || '');
      setDescription(deck.description || '');
    }
  }, [isOpen, deck]);

  if (!isOpen || !deck) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    await editDeck(deckId, {
      name: name.trim(),
      description: description.trim(),
    });

    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && deck && (
        <div key="deck-edit-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          {/* Backdrop Click */}
          <div className="absolute inset-0" onClick={onClose}></div>

          <motion.div
            key="deck-edit-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative w-full max-w-lg neo-card bg-[var(--card-bg)] p-6 z-10"
          >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--neo-border)]">
            <h3 className="text-xl font-bold text-[var(--foreground)]">
              Chỉnh sửa bộ bài
            </h3>
            <button
              onClick={onClose}
              className="neo-btn p-2 neo-btn-red"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="block font-semibold text-sm opacity-80">
                Tên bộ bài
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="neo-input"
                placeholder="Nhập tên bộ bài..."
              />
            </div>

            <div className="space-y-2">
              <label className="block font-semibold text-sm opacity-80">
                Mô tả
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                className="neo-input resize-none"
                placeholder="Nhập mô tả bộ bài..."
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--neo-border)]">
              <button
                type="button"
                onClick={onClose}
                className="neo-btn order-2 sm:order-1"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="neo-btn neo-btn-primary flex items-center justify-center gap-2 order-1 sm:order-2"
              >
                <Save className="w-5 h-5" />
                <span>Lưu thay đổi</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
