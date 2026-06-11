"use client";

import React, { useState, useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import { useRouter } from 'next/navigation';
import ClientInit from '@/components/ClientInit';
import { ChevronLeft, Shuffle, Sparkles, AlertCircle, Home, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { calculateSM2 } from '@/utils/sm2';

function ReviewContent() {
  const router = useRouter();
  const {
    activeDeck,
    queue,
    currentIndex,
    isShuffle,
    sessionTotal,
    sessionCompleted,
    answerCard,
    toggleShuffle
  } = useCardStore();

  const [isFlipped, setIsFlipped] = useState(false);

  // Redirect to dashboard if no active deck session exists (e.g. on page refresh)
  useEffect(() => {
    if (!activeDeck) {
      router.push('/');
    }
  }, [activeDeck, router]);

  // Trigger confetti when review session completes successfully
  const isFinished = activeDeck && queue.length > 0 && currentIndex >= queue.length;
  useEffect(() => {
    if (isFinished) {
      // Confetti explosion!
      const duration = 2 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

      const randomInRange = (min: number, max: number) => Math.random() * (max - min) + min;

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          return clearInterval(interval);
        }

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } });
      }, 250);

      return () => clearInterval(interval);
    }
  }, [isFinished]);

  // Handle keyboard shortcuts
  useEffect(() => {
    if (isFinished || !activeDeck || currentIndex >= queue.length) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        setIsFlipped((prev) => !prev);
      } else if (isFlipped) {
        if (e.key === '1') {
          handleRate(0); // Again
        } else if (e.key === '2') {
          handleRate(3); // Hard
        } else if (e.key === '3') {
          handleRate(4); // Good
        } else if (e.key === '4') {
          handleRate(5); // Easy
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFlipped, currentIndex, queue, isFinished, activeDeck]);

  if (!activeDeck) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)]">
        <div className="neo-card p-6 bg-[var(--accent-red-light)] text-[var(--foreground)] max-w-sm text-center">
          <AlertCircle className="w-10 h-10 mx-auto text-red-600 mb-3" />
          <h2 className="text-xl font-bold mb-1">Chưa bắt đầu học</h2>
          <p className="text-sm font-semibold mb-4">Vui lòng chọn bộ bài để ôn từ trang chủ.</p>
          <button onClick={() => router.push('/')} className="neo-btn bg-[var(--card-bg)] py-2 w-full text-xs">
            Về trang chủ
          </button>
        </div>
      </div>
    );
  }

  // Session completed display
  if (queue.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)] py-12 px-6">
        <div className="neo-card max-w-md w-full p-8 text-center bg-[var(--card-bg)]">
          <CheckCircle2 className="w-16 h-16 mx-auto text-[var(--accent-green)] mb-6" />
          <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2 tracking-tight">Không còn thẻ đến hạn!</h2>
          <p className="text-sm opacity-80 font-semibold mb-6">
            Tuyệt vời! Bạn không còn thẻ nào cần ôn trong bộ bài <strong>{activeDeck.name}</strong>. Thêm thẻ mới hoặc quay lại hôm sau nhé!
          </p>
          <button
            onClick={() => router.push('/')}
            className="neo-btn neo-btn-primary w-full py-3 px-6 text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    );
  }

  if (isFinished) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)] py-12 px-6">
        <div className="neo-card max-w-md w-full p-8 text-center bg-[var(--accent-purple-light)]">
          <Sparkles className="w-16 h-16 mx-auto text-[var(--accent-purple)] mb-6 animate-pulse" />
          <h2 className="text-3xl font-bold text-[var(--foreground)] mb-2 tracking-tight">Hoàn thành bộ bài!</h2>
          <p className="text-sm opacity-80 font-semibold mb-6">
            Tuyệt vời! Bạn đã hoàn thành ôn tất cả <strong>{sessionCompleted}</strong> thẻ trong bộ bài <strong>{activeDeck.name}</strong> hôm nay!
          </p>
          <button
            onClick={() => router.push('/')}
            className="neo-btn neo-btn-primary w-full py-3 px-6 text-sm flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>Về trang chủ</span>
          </button>
        </div>
      </div>
    );
  }

  const currentCard = queue[currentIndex];
  
  // Progress calculations
  const progressPercent = sessionTotal > 0 ? (currentIndex / sessionTotal) * 100 : 0;

  // Calculate dynamic intervals for buttons in real-time
  const nextAgain = calculateSM2(0, currentCard.interval, currentCard.easeFactor, currentCard.repetitions).interval;
  const nextHard = calculateSM2(3, currentCard.interval, currentCard.easeFactor, currentCard.repetitions).interval;
  const nextGood = calculateSM2(4, currentCard.interval, currentCard.easeFactor, currentCard.repetitions).interval;
  const nextEasy = calculateSM2(5, currentCard.interval, currentCard.easeFactor, currentCard.repetitions).interval;

  const handleRate = async (quality: 0 | 3 | 4 | 5) => {
    setIsFlipped(false);
    // Allow animation to flip back before changing content
    setTimeout(async () => {
      await answerCard(quality);
    }, 150);
  };

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)] flex flex-col justify-between transition-colors duration-200">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-[var(--card-bg)] border-b border-[var(--neo-border)] py-3 px-4 sm:px-6 md:px-12 flex items-center justify-between gap-3">
        <button
          onClick={() => router.push('/')}
          className="neo-btn p-2 text-xs sm:text-sm flex items-center gap-1.5 shrink-0"
        >
          <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="hidden sm:inline">Quay lại</span>
        </button>

        <h2 className="text-sm sm:text-lg font-bold tracking-wider truncate flex-1 text-center">
          📚 {activeDeck.name}
        </h2>

        <button
          onClick={toggleShuffle}
          className={`neo-btn py-2 px-3 text-xs sm:text-sm flex items-center gap-2 shrink-0 ${
            isShuffle ? 'bg-[var(--accent-blue)] text-white' : 'bg-[var(--card-bg)]'
          }`}
          title="Bật/tắt trộn thẻ"
        >
          <Shuffle className="w-4 h-4" />
          <span className="hidden sm:inline">Trộn</span>
        </button>
      </header>

      {/* Main Review Deck Content */}
      <main className="flex-1 flex flex-col items-center justify-center py-4 sm:py-8 px-4 sm:px-6 max-w-3xl w-full mx-auto">
        {/* Progress Bar */}
        <div className="w-full mb-4 sm:mb-6">
          <div className="flex justify-between items-center text-xs font-bold uppercase mb-1.5 opacity-80">
            <span>Tiến độ</span>
            <span>
              {currentIndex} / {sessionTotal} thẻ ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="w-full h-4 sm:h-5 bg-[var(--card-bg)] border border-[var(--neo-border)] rounded-lg overflow-hidden shadow-sm">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>

        {/* Taller scrollable card box for mobile compatibility */}
        <div className="w-full h-[400px] sm:h-[450px] relative card-flip-container">
          <div className={`w-full h-full card-flip-inner absolute ${isFlipped ? 'card-flipped' : ''}`}>
            
            {/* FRONT SIDE */}
            <div
              onClick={() => setIsFlipped(true)}
              className="card-front neo-card p-6 bg-[var(--card-bg)] flex flex-col items-center justify-center cursor-pointer shadow-lg select-none"
            >
              <span className="absolute top-3 left-3 text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-50">
                Mặt trước (Nhấp để lật)
              </span>
              
              <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold text-center break-words max-w-full px-2">
                {currentCard.front}
              </h1>

              {currentCard.ipa && (
                <p className="text-base sm:text-lg font-semibold text-gray-500 font-mono mt-3">
                  {currentCard.ipa}
                </p>
              )}

              <span className="absolute bottom-4 text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[var(--primary)] animate-pulse">
                Nhấp hoặc nhấn [Space] để xem đáp án
              </span>
            </div>

            {/* BACK SIDE */}
            <div
              className="card-back neo-card p-4 sm:p-6 bg-[var(--card-bg)] flex flex-col justify-between shadow-lg overflow-y-auto select-none"
            >
              <div className="space-y-3">
                <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-50 block">
                  Mặt sau / Đáp án
                </span>

                <div className="text-center border-b border-dashed border-gray-300 dark:border-zinc-700 pb-3 mb-2">
                  <h1 className="text-lg sm:text-2xl font-bold text-[var(--primary)] font-mono mb-0.5">
                    {currentCard.front}
                  </h1>
                  {currentCard.ipa && (
                    <span className="text-xs sm:text-sm font-semibold text-gray-500 font-mono">
                      {currentCard.ipa}
                    </span>
                  )}
                  <h2 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)] mt-2 leading-tight">
                    {currentCard.back}
                  </h2>
                </div>

                {/* Optional Dictionary Fields */}
                <div className="space-y-2.5">
                  {currentCard.definition && (
                    <div>
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-50">Định nghĩa:</h4>
                      <p className="text-xs sm:text-sm font-semibold leading-relaxed bg-[var(--background)] p-2 border border-[var(--neo-border)] rounded-lg">
                        {currentCard.definition}
                      </p>
                    </div>
                  )}

                  {currentCard.example && (
                    <div>
                      <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider opacity-50">Ví dụ:</h4>
                      <p className="text-xs sm:text-sm italic font-semibold leading-relaxed bg-[var(--accent-blue-light)] p-2 border border-[var(--neo-border)] rounded-lg">
                        "{currentCard.example}"
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <span className="text-center text-[9px] sm:text-[10px] font-bold uppercase opacity-50 mt-4 block">
                Nhấn [Space] để lật lại
              </span>
            </div>

          </div>
        </div>
      </main>

      {/* Answer Rating Buttons Footer */}
      <footer className="bg-[var(--card-bg)] border-t border-[var(--neo-border)] py-4 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">
          {!isFlipped ? (
            <button
              onClick={() => setIsFlipped(true)}
              className="neo-btn neo-btn-primary w-full py-3 sm:py-4 text-base sm:text-lg font-bold"
            >
              XEM ĐÁP ÁN
            </button>
          ) : (
            /* 2x2 grid on mobile, 4 columns on desktop */
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
              <button
                onClick={() => handleRate(0)}
                className="neo-btn neo-btn-red py-2 sm:py-3 text-xs sm:text-sm font-bold flex flex-col items-center"
              >
                <span>Chịu</span>
                <span className="text-[9px] sm:text-[10px] font-semibold opacity-80 mt-1">{nextAgain} ngày (học lại)</span>
              </button>
              <button
                onClick={() => handleRate(3)}
                className="neo-btn neo-btn-primary py-2 sm:py-3 text-xs sm:text-sm font-bold flex flex-col items-center"
              >
                <span>Căng</span>
                <span className="text-[9px] sm:text-[10px] font-semibold opacity-80 mt-1">{nextHard} ngày</span>
              </button>
              <button
                onClick={() => handleRate(4)}
                className="neo-btn neo-btn-blue py-2 sm:py-3 text-xs sm:text-sm font-bold flex flex-col items-center"
              >
                <span>Được</span>
                <span className="text-[9px] sm:text-[10px] font-semibold opacity-80 mt-1">{nextGood} ngày</span>
              </button>
              <button
                onClick={() => handleRate(5)}
                className="neo-btn neo-btn-green py-2 sm:py-3 text-xs sm:text-sm font-bold flex flex-col items-center"
              >
                <span className="whitespace-nowrap">Dễ</span>
                <span className="text-[9px] sm:text-[10px] font-semibold opacity-80 mt-1">{nextEasy} ngày</span>
              </button>
            </div>
          )}
        </div>
      </footer>
    </div>
  );
}

export default function ReviewPage() {
  return (
    <ClientInit>
      <ReviewContent />
    </ClientInit>
  );
}
