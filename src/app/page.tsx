"use client";

import React, { useState } from 'react';
import { useCardStore } from '@/store/cardStore';
import DeckCard from '@/components/DeckCard';
import QuickCardModal from '@/components/QuickCardModal';
import ClientInit from '@/components/ClientInit';
import { Plus, Layers, Clock, AlertCircle } from 'lucide-react';

function DashboardContent() {
  const { decks, cards, createDeck, setQuickCardModalOpen, signOut } = useCardStore();
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckDesc, setNewDeckDesc] = useState('');

  // Calculate global statistics reactively from Zustand
  const totalDecks = decks.length;
  const totalCards = cards.length;
  const now = Date.now();
  const totalDue = cards.filter((c) => c.dueDate <= now).length;

  const handleCreateDeck = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDeckName.trim()) return;

    await createDeck(newDeckName.trim(), newDeckDesc.trim());
    setNewDeckName('');
    setNewDeckDesc('');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--neo-border)] py-4 px-4 md:px-6 lg:px-12 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="text-2xl md:text-3xl font-bold tracking-tighter text-white bg-[var(--primary)] px-2 py-1 rounded-lg">
            ⚡ NEKI
          </span>
          <span className="hidden sm:inline text-xs font-semibold tracking-wider opacity-70 mt-1">
            Học lặp lại ngắt quãng
          </span>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <button
            onClick={() => setQuickCardModalOpen(true)}
            className="neo-btn neo-btn-primary py-2 px-3 md:px-4 text-xs md:text-sm font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Thêm thẻ</span>
          </button>
          
          <button
            onClick={signOut}
            className="neo-btn py-2 px-3 md:px-4 text-xs md:text-sm font-semibold"
          >
            <span className="hidden sm:inline">Đăng xuất</span>
            <span className="sm:hidden">✕</span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto py-6 md:py-8 px-4 md:px-6 lg:px-12 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        {/* Left Side: Decks list */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between border-b border-[var(--neo-border)] pb-3">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 md:w-6 md:h-6 text-[var(--primary)]" /> Bộ bài của bạn
            </h2>
          </div>

          {decks.length === 0 ? (
            <div className="neo-card p-8 text-center bg-[var(--card-bg)] border-dashed border-2 border-gray-300 dark:border-zinc-700">
              <AlertCircle className="w-12 h-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-bold text-[var(--foreground)] mb-1">Chưa có bộ bài nào</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-semibold mb-4">
                Tạo bộ bài mới ở bên phải để bắt đầu học nhé!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
              {decks.map((deck) => (
                <DeckCard
                  key={deck.id}
                  deckId={deck.id!}
                  name={deck.name}
                  description={deck.description}
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Quick Stats & Create Deck */}
        <div className="space-y-6 lg:space-y-8">
          {/* Global Stats */}
          <div className="neo-card p-6 bg-[var(--accent-blue-light)] text-[var(--foreground)]">
            <h3 className="text-base md:text-lg font-bold tracking-tight border-b border-[var(--neo-border)] pb-2 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[var(--accent-blue)]" /> Thống kê chung
            </h3>
            
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="bg-[var(--card-bg)] border border-[var(--neo-border)] p-3 rounded-lg">
                <span className="block text-2xl font-bold text-[var(--accent-purple)]">
                  {totalDecks}
                </span>
                <span className="text-[10px] md:text-xs font-semibold uppercase opacity-70">Bộ bài</span>
              </div>
              <div className="bg-[var(--card-bg)] border border-[var(--neo-border)] p-3 rounded-lg">
                <span className="block text-2xl font-bold text-[var(--accent-green)]">
                  {totalCards}
                </span>
                <span className="text-[10px] md:text-xs font-semibold uppercase opacity-70">Thẻ</span>
              </div>
              <div className={`border border-[var(--neo-border)] p-3 rounded-lg ${
                totalDue > 0 ? 'bg-[var(--accent-red-light)] text-red-600 dark:text-red-400' : 'bg-[var(--accent-green-light)] text-green-600 dark:text-green-400'
              }`}>
                <span className="block text-2xl font-bold">
                  {totalDue}
                </span>
                <span className="text-[10px] md:text-xs font-semibold uppercase opacity-70">Đến hạn</span>
              </div>
            </div>
          </div>

          {/* Create Deck Form */}
          <div className="neo-card p-6 bg-[var(--card-bg)]">
            <h3 className="text-base md:text-lg font-bold tracking-tight border-b border-[var(--neo-border)] pb-2 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-[var(--primary)]" /> Tạo bộ bài mới
            </h3>

            <form onSubmit={handleCreateDeck} className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold opacity-80">
                  Tên bộ bài
                </label>
                <input
                  type="text"
                  placeholder="vd: Từ vựng TOEFL Essential"
                  value={newDeckName}
                  onChange={(e) => setNewDeckName(e.target.value)}
                  required
                  className="neo-input"
                />
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold opacity-80">
                  Mô tả
                </label>
                <textarea
                  placeholder="Bộ bài này dùng để làm gì?"
                  value={newDeckDesc}
                  onChange={(e) => setNewDeckDesc(e.target.value)}
                  rows={3}
                  className="neo-input resize-none"
                />
              </div>

              <button
                type="submit"
                className="neo-btn neo-btn-primary w-full text-sm py-2 px-4"
              >
                Tạo bộ bài
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Quick Card Creator Modal overlay */}
      <QuickCardModal />
    </div>
  );
}

export default function Home() {
  return (
    <ClientInit>
      <DashboardContent />
    </ClientInit>
  );
}
