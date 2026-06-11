"use client";

import React, { useState, useEffect } from 'react';
import { useCardStore } from '@/store/cardStore';
import { fetchDictionaryData } from '@/utils/dictionary';
import {
  X,
  Sparkles,
  Loader2,
  Plus,
  Save,
  BrainCircuit,
  Check,
  FileText,
  Settings,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLMStudioStore } from '@/store/lmStore';
import LMStudioSettings from './LMStudioSettings';

export default function QuickCardModal() {
  const {
    decks, isQuickCardModalOpen, defaultQuickDeckId, editingCard, setQuickCardModalOpen, addCard, editCard, importCards, createDeck } = useCardStore();

  // All state hooks first
  const [deckId, setDeckId] = useState<string | 'new'>('new');
  const [newDeckName, setNewDeckName] = useState('');
  const [front, setFront] = useState('');
  const [back, setBack] = useState('');
  const [ipa, setIpa] = useState('');
  const [definition, setDefinition] = useState('');
  const [example, setExample] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchStatus, setSearchStatus] = useState<'idle' | 'success' | 'failed'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [showLMSettings, setShowLMSettings] = useState(false);

  // AI generator state
  const [isAiMode, setIsAiMode] = useState(false);
  const [aiContent, setAiContent] = useState('');
  const [aiNumCards, setAiNumCards] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiGeneratedCards, setAiGeneratedCards] = useState<any[]>([]);
  const [selectedAiCards, setSelectedAiCards] = useState<number[]>([]);

  const isEditing = !!editingCard;

  // Reset local state when modal opens
  useEffect(() => {
    if (isQuickCardModalOpen) {
      if (editingCard) {
        setIsAiMode(false);
        setDeckId(editingCard.deckId);
        setFront(editingCard.front || '');
        setBack(editingCard.back || '');
        setIpa(editingCard.ipa || '');
        setDefinition(editingCard.definition || '');
        setExample(editingCard.example || '');
      } else {
        if (defaultQuickDeckId) {
          setDeckId(defaultQuickDeckId);
        } else if (decks.length > 0) {
          setDeckId(decks[0].id!);
        } else {
          setDeckId('new');
        }
        setFront('');
        setBack('');
        setIpa('');
        setDefinition('');
        setExample('');
        setAiContent('');
        setAiGeneratedCards([]);
        setSelectedAiCards([]);
      }
      setSearchStatus('idle');
      setErrorMessage('');
    }
  }, [isQuickCardModalOpen, defaultQuickDeckId, decks, editingCard]);

  if (!isQuickCardModalOpen) return null;

  const handleSearchDictionary = async () => {
    if (!front.trim()) return;
    setIsSearching(true);
    setSearchStatus('idle');
    setErrorMessage('');
    
    try {
      console.log('Fetching dictionary data for:', front);
      const data = await fetchDictionaryData(front);
      console.log('Dictionary data received:', data);
      if (data) {
        if (data.ipa) setIpa(data.ipa);
        if (data.definition) setDefinition(data.definition);
        if (data.example) setExample(data.example);
        if (data.vietnamese) setBack(data.vietnamese);
        setSearchStatus('success');
      } else {
        setSearchStatus('failed');
        setErrorMessage('Không tìm thấy thông tin từ. Bạn vẫn có thể điền thủ công!');
      }
    } catch (error) {
      console.error('Dictionary error:', error);
      setSearchStatus('failed');
      setErrorMessage(
        'Không thể kết nối với LM Studio! Vui lòng:\n' +
        '1. Mở LM Studio\n' +
        '2. Tải model qwen/qwen3.5-9b\n' +
        '3. Bắt đầu server trên cổng 1234'
      );
    } finally {
      setIsSearching(false);
    }
  };
  
  const handleGenerateAiCards = async () => {
    if (!aiContent.trim()) return;
    setIsGenerating(true);
    setSearchStatus('idle');
    setErrorMessage('');
    
    try {
      const baseUrl = useLMStudioStore.getState().baseUrl;
      
      // Call API directly from browser
      const response = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'qwen/qwen3.5-9b',
          messages: [
            {
              role: 'system',
              content: `You are a flashcard generator. Generate exactly ${aiNumCards} high-quality flashcards from the provided content. Return ONLY a JSON array with the following structure (no extra text):
[
  {
    "front": "Term or question (English or from content)",
    "back": "Definition or answer in Vietnamese",
    "ipa": "Phonetic transcription (if English word)",
    "definition": "Detailed English definition",
    "example": "Example sentence in English"
  }
]
Make sure front and back are clear and concise.`,
            },
            {
              role: 'user',
              content: `Generate flashcards from this content:\n\n${aiContent}`,
            },
          ],
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      if (!response.ok) {
        throw new Error(`LM Studio error: ${response.status}`);
      }

      const data = await response.json();
      let result = data.choices[0].message.content;
      
      // Clean up JSON
      const jsonMatch = result.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        result = jsonMatch[0];
      }
      
      const cards = JSON.parse(result);
      
      // Generate embeddings for each card
      const cardsWithEmbeddings = await Promise.all(
        cards.map(async (card: any) => {
          try {
            const combinedText = `${card.front} ${card.back} ${card.definition || ''} ${card.example || ''}`;
            const embedResponse = await fetch(`${baseUrl}/v1/embeddings`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: 'text-embedding-bge-m3',
                input: combinedText,
              }),
            });
            
            if (embedResponse.ok) {
              const embedData = await embedResponse.json();
              return {
                ...card,
                embedding: embedData.data[0].embedding,
              };
            }
          } catch (e) {
            // Ignore embedding errors
          }
          return card;
        })
      );
      
      setAiGeneratedCards(cardsWithEmbeddings);
      setSelectedAiCards(cardsWithEmbeddings.map((_: any, idx: number) => idx));
      setSearchStatus('success');
    } catch (error) {
      console.error(error);
      setSearchStatus('failed');
      setErrorMessage(
        'Không thể tạo thẻ bằng AI! Vui lòng:\n' +
        '1. Mở LM Studio\n' +
        '2. Tải model qwen/qwen3.5-9b và text-embedding-bge-m3\n' +
        '3. Bắt đầu server'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!front.trim() || !back.trim()) return;

    let targetDeckId: string;
    if (deckId === 'new') {
      if (!newDeckName.trim()) return;
      targetDeckId = await createDeck(newDeckName.trim(), 'Bộ bài tùy chỉnh tạo trong khi tạo thẻ.');
      setNewDeckName('');
    } else {
      targetDeckId = deckId;
    }

    if (isEditing && editingCard) {
      await editCard(editingCard.id!, {
        deckId: targetDeckId,
        front: front.trim(),
        back: back.trim(),
        ipa: ipa.trim(),
        definition: definition.trim(),
        example: example.trim(),
      });
    } else if (isAiMode && aiGeneratedCards.length > 0) {
      const cardsToImport = aiGeneratedCards
        .filter((_, idx) => selectedAiCards.includes(idx))
        .map(card => ({
          deckId: targetDeckId,
          front: card.front,
          back: card.back,
          ipa: card.ipa,
          definition: card.definition,
          example: card.example,
          embedding: card.embedding,
        }));
      await importCards(targetDeckId, cardsToImport);
    } else {
      await addCard({
        deckId: targetDeckId,
        front: front.trim(),
        back: back.trim(),
        ipa: ipa.trim(),
        definition: definition.trim(),
        example: example.trim(),
      });

      // Reset fields for the next card
      setFront('');
      setBack('');
      setIpa('');
      setDefinition('');
      setExample('');
      setSearchStatus('idle');
      if (deckId === 'new') {
        setDeckId(targetDeckId);
      }
    }
    setQuickCardModalOpen(false);
  };

  return (
    <>
      <AnimatePresence>
        {isQuickCardModalOpen && (
          <div key="quick-card-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            {/* Backdrop Click */}
            <div className="absolute inset-0" onClick={() => setQuickCardModalOpen(false)}></div>

            <motion.div
              key="quick-card-modal"
              initial={{ scale: 0.9, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, y: 20, opacity: 0 }}
              className="relative w-full max-w-2xl neo-card bg-[var(--card-bg)] p-4 sm:p-6 md:p-8 z-10 overflow-y-auto max-h-[95vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--neo-border)]">
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2 text-[var(--foreground)]">
                  <Sparkles className="w-5 h-5 sm:w-6 sm:h-6 text-[var(--primary)]" />
                  {isEditing ? 'Chỉnh sửa thẻ' : 'Thêm thẻ mới'}
                </h3>
                <button
                  onClick={() => setQuickCardModalOpen(false)}
                  className="neo-btn p-2 neo-btn-red"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {!isEditing && (
                <div className="flex gap-2 mb-4">
                  <button
                    type="button"
                    onClick={() => setIsAiMode(false)}
                    className={`flex-1 neo-btn py-2 text-sm ${!isAiMode ? 'bg-[var(--primary)] text-white' : ''}`}
                  >
                    Thủ công
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAiMode(true)}
                    className={`flex-1 neo-btn py-2 text-sm ${isAiMode ? 'bg-[var(--primary)] text-white' : ''}`}
                  >
                    <div className="flex items-center justify-center gap-2">
                      <BrainCircuit className="w-4 h-4" />
                      Tạo bằng AI
                    </div>
                  </button>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-5">
                {/* Deck Selector */}
                <div className="space-y-2">
                  <label className="block font-semibold text-sm opacity-80">
                    Chọn bộ bài
                  </label>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <select
                      value={deckId}
                      onChange={(e) => setDeckId(e.target.value === 'new' ? 'new' : e.target.value)}
                      className="neo-select flex-1"
                    >
                      {decks.map((d, idx) => (
                        <option key={d.id || `deck-${idx}`} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                      <option value="new">+ Tạo bộ bài mới...</option>
                    </select>

                    {deckId === 'new' && (
                      <input
                        type="text"
                        placeholder="Tên bộ bài mới..."
                        value={newDeckName}
                        onChange={(e) => setNewDeckName(e.target.value)}
                        required
                        className="neo-input"
                      />
                    )}
                  </div>
                </div>

                {isAiMode && !isEditing ? (
                  <>
                    {/* AI Content Input */}
                    <div className="space-y-2">
                      <label className="block font-semibold text-sm opacity-80">
                        Nội dung để tạo thẻ (đoạn văn, bài học, v.v.)
                      </label>
                      <textarea
                        value={aiContent}
                        onChange={(e) => setAiContent(e.target.value)}
                        placeholder="Dán nội dung bạn muốn tạo flashcards ở đây..."
                        rows={6}
                        className="neo-input resize-none"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="space-y-2 flex-1">
                        <label className="block font-semibold text-sm opacity-80">
                          Số lượng thẻ
                        </label>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={aiNumCards}
                          onChange={(e) => setAiNumCards(parseInt(e.target.value) || 5)}
                          className="neo-input"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleGenerateAiCards}
                        disabled={isGenerating || !aiContent.trim()}
                        className="neo-btn bg-[var(--primary)] text-white mt-auto flex items-center gap-2 justify-center"
                      >
                        {isGenerating ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <BrainCircuit className="w-5 h-5" />
                        )}
                        {isGenerating ? 'Đang tạo...' : 'Tạo thẻ'}
                      </button>
                    </div>

                    {/* Generated Cards Preview */}
                    {aiGeneratedCards.length > 0 && (
                      <div className="space-y-3">
                        <label className="block font-semibold text-sm opacity-80">
                          Thẻ đã tạo (chọn để thêm)
                        </label>
                        <div className="space-y-2 max-h-64 overflow-y-auto">
                          {aiGeneratedCards.map((card, idx) => (
                            <label key={`ai-${idx}-${card.front?.slice(0, 10)}`} className="flex items-start gap-3 p-3 bg-[var(--background)] border border-[var(--neo-border)] rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800">
                              <input
                                type="checkbox"
                                checked={selectedAiCards.includes(idx)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedAiCards([...selectedAiCards, idx]);
                                  } else {
                                    setSelectedAiCards(selectedAiCards.filter(i => i !== idx));
                                  }
                                }}
                                className="mt-1"
                              />
                              <div className="flex-1 min-w-0">
                                <div className="font-bold truncate">{card.front}</div>
                                <div className="text-sm opacity-80 truncate">{card.back}</div>
                              </div>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Front & Dictionary Search */}
                    <div className="space-y-2">
                      <label className="block font-semibold text-sm opacity-80">
                        Mặt trước (Từ vựng / Thuật ngữ)
                      </label>
                      <div className="flex flex-col sm:flex-row gap-3">
                        <input
                          type="text"
                          placeholder="vd: resilient"
                          value={front}
                          onChange={(e) => setFront(e.target.value)}
                          required
                          className="neo-input flex-1 font-semibold"
                        />
                        {!isEditing && (
                          <button
                            type="button"
                            onClick={handleSearchDictionary}
                            disabled={isSearching || !front.trim()}
                            className="neo-btn neo-btn-blue flex items-center justify-center gap-2 py-2 px-4 disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Tra cứu từ điển"
                          >
                            {isSearching ? (
                              <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                              <Sparkles className="w-5 h-5" />
                            )}
                            <span className="hidden sm:inline">Từ điển</span>
                          </button>
                        )}
                      </div>
                      
                      {searchStatus === 'failed' && (
                        <p className="text-xs font-semibold text-red-500 mt-1">{errorMessage}</p>
                      )}
                      {searchStatus === 'success' && (
                        <p className="text-xs font-semibold text-green-500 mt-1">✓ Điền thông tin từ thành công!</p>
                      )}
                    </div>

                    {/* Phonetic & Back */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="block font-semibold text-sm opacity-80">
                          Phiên âm (IPA)
                        </label>
                        <input
                          type="text"
                          placeholder="vd: /rɪˈzɪliənt/"
                          value={ipa}
                          onChange={(e) => setIpa(e.target.value)}
                          className="neo-input font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="block font-semibold text-sm opacity-80">
                          Mặt sau (Định nghĩa / Dịch)
                        </label>
                        <input
                          type="text"
                          placeholder="vd: kiên cường, hồi phục nhanh"
                          value={back}
                          onChange={(e) => setBack(e.target.value)}
                          required
                          className="neo-input font-semibold"
                        />
                      </div>
                    </div>

                    {/* Detailed Definition */}
                    <div className="space-y-2">
                      <label className="block font-semibold text-sm opacity-80">
                        Định nghĩa tiếng Anh chi tiết
                      </label>
                      <textarea
                        placeholder="Mô tả hoặc nghĩa của từ..."
                        value={definition}
                        onChange={(e) => setDefinition(e.target.value)}
                        rows={2}
                        className="neo-input resize-none"
                      />
                    </div>

                    {/* Example */}
                    <div className="space-y-2">
                      <label className="block font-semibold text-sm opacity-80">
                        Ví dụ câu
                      </label>
                      <textarea
                        placeholder="Câu ví dụ minh họa cách dùng từ..."
                        value={example}
                        onChange={(e) => setExample(e.target.value)}
                        rows={2}
                        className="neo-input resize-none"
                      />
                    </div>
                  </>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-[var(--neo-border)]">
                  <button
                    type="button"
                    onClick={() => setQuickCardModalOpen(false)}
                    className="neo-btn order-2 sm:order-1"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={isGenerating}
                    className="neo-btn neo-btn-primary flex items-center justify-center gap-2 order-1 sm:order-2"
                  >
                    {isEditing ? (
                      <>
                        <Save className="w-5 h-5" />
                        <span>Lưu</span>
                      </>
                    ) : (
                      <>
                        <Plus className="w-5 h-5" />
                        <span>
                          {isAiMode ? `Thêm ${selectedAiCards.length} thẻ` : 'Tạo thẻ'}
                        </span>
                      </>
                    )}
                  </button>
                </div>
              </form>
              
              {/* LM Studio Settings button inside modal */}
              <button
                type="button"
                onClick={() => setShowLMSettings(true)}
                className="absolute bottom-4 right-4 neo-btn p-2 text-sm opacity-70 hover:opacity-100"
                title="Cài đặt LM Studio"
              >
                <Settings className="w-4 h-4" />
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* LM Studio Settings modal is separate, outside QuickCard's AnimatePresence */}
      <LMStudioSettings
        isOpen={showLMSettings}
        onClose={() => setShowLMSettings(false)}
      />
    </>
  );
}
