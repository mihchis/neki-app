"use client";

import React, { useState, useRef } from 'react';
import { useCardStore } from '@/store/cardStore';
import { X, Upload, Download, FileText, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ImportExportModalProps {
  deckId: string;
  isOpen: boolean;
  onClose: () => void;
}

type FileFormat = 'json' | 'csv';
type Mode = 'import' | 'export';

export default function ImportExportModal({ deckId, isOpen, onClose }: ImportExportModalProps) {
  const { decks, cards, exportDeck, importCards } = useCardStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const deck = decks.find(d => d.id === deckId);
  const deckCards = cards.filter(c => c.deckId === deckId);

  const [mode, setMode] = useState<Mode>('export');
  const [importFormat, setImportFormat] = useState<FileFormat>('json');
  const [exportFormat, setExportFormat] = useState<FileFormat>('json');
  const [status, setStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [statusMessage, setStatusMessage] = useState('');

  const resetState = () => {
    setStatus('idle');
    setStatusMessage('');
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleExport = () => {
    if (!deck) return;
    
    try {
      const data = exportDeck(deckId);
      let content: string;
      let filename: string;
      let mimeType: string;

      if (exportFormat === 'json') {
        content = JSON.stringify(data, null, 2);
        filename = `${deck.name.replace(/[^\w]/g, '_')}.json`;
        mimeType = 'application/json';
      } else {
        // CSV format
        const headers = ['front', 'back', 'ipa', 'definition', 'example', 'repetitions', 'interval', 'easeFactor'];
        const csvRows = [headers.join(',')];
        
        data.cards.forEach((card: any) => {
          const row = headers.map(header => {
            const value = card[header] || '';
            const stringValue = String(value);
            // Escape quotes and wrap in quotes if contains comma
            if (stringValue.includes('"') || stringValue.includes(',') || stringValue.includes('\n')) {
              return `"${stringValue.replace(/"/g, '""')}"`;
            }
            return stringValue;
          });
          csvRows.push(row.join(','));
        });
        
        content = csvRows.join('\n');
        filename = `${deck.name.replace(/[^\w]/g, '_')}.csv`;
        mimeType = 'text/csv';
      }

      // Download file
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatus('success');
      setStatusMessage('Xuất bộ bài thành công!');
    } catch (error) {
      console.error('Export error:', error);
      setStatus('error');
      setStatusMessage('Có lỗi xảy ra khi xuất bộ bài.');
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        setStatus('processing');
        
        const content = event.target?.result as string;
        let cardsData: any[] = [];
        
        // Determine file type
        const isJson = file.name.toLowerCase().endsWith('.json') || importFormat === 'json';
        const isCsv = file.name.toLowerCase().endsWith('.csv') || importFormat === 'csv';

        if (isJson) {
          const parsed = JSON.parse(content);
          if (parsed.cards && Array.isArray(parsed.cards)) {
            cardsData = parsed.cards;
          } else if (Array.isArray(parsed)) {
            cardsData = parsed;
          } else {
            throw new Error('File JSON không hợp lệ');
          }
        } else if (isCsv) {
          // Parse CSV
          const lines = content.split('\n');
          const headers = lines[0].split(',').map(h => h.trim());
          cardsData = lines.slice(1).filter(line => line.trim()).map(line => {
            const values = parseCSVLine(line);
            const obj: any = {};
            headers.forEach((header, index) => {
              let value = values[index] || '';
              // Convert numeric fields
              if (['repetitions', 'interval', 'easeFactor'].includes(header)) {
                obj[header] = value ? parseFloat(value) : undefined;
              } else {
                obj[header] = value;
              }
            });
            return obj;
          });
        }

        if (!cardsData.length) {
          throw new Error('Không tìm thấy thẻ nào để nhập');
        }

        await importCards(deckId, cardsData);
        setStatus('success');
        setStatusMessage(`Nhập thành công ${cardsData.length} thẻ!`);
      } catch (error) {
        console.error('Import error:', error);
        setStatus('error');
        setStatusMessage(`Có lỗi xảy ra khi nhập: ${(error as Error).message}`);
      }
    };
    
    reader.readAsText(file);
    
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Helper to parse CSV lines with quotes
  const parseCSVLine = (line: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    
    result.push(current.trim());
    return result;
  };

  return (
    <AnimatePresence>
      {isOpen && deck && (
        <div key="import-export-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={handleClose}></div>
          <motion.div
            key="import-export-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative neo-card max-w-lg w-full p-6 bg-[var(--card-bg)] z-10"
          >
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--neo-border)]">
            <h3 className="text-xl font-bold text-[var(--foreground)] flex items-center gap-2">
              <FileText className="w-6 h-6 text-[var(--accent-blue)]" />
              Nhập / Xuất Bộ Bài
            </h3>
            <button onClick={handleClose} className="neo-btn p-2 neo-btn-red">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Mode selection */}
          <div className="flex mb-6 border border-[var(--neo-border)] rounded-lg overflow-hidden">
            <button
              onClick={() => { setMode('export'); resetState(); }}
              className={`flex-1 py-2 px-4 font-bold text-sm transition-colors ${mode === 'export' ? 'bg-[var(--accent-blue)] text-white' : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />
                Xuất
              </div>
            </button>
            <button
              onClick={() => { setMode('import'); resetState(); }}
              className={`flex-1 py-2 px-4 font-bold text-sm transition-colors ${mode === 'import' ? 'bg-[var(--primary)] text-white' : 'bg-transparent hover:bg-gray-100 dark:hover:bg-gray-800'}`}
            >
              <div className="flex items-center justify-center gap-2">
                <Upload className="w-4 h-4" />
                Nhập
              </div>
            </button>
          </div>

          {mode === 'export' ? (
            <div className="space-y-4">
              <div className="text-sm opacity-80">
                Bộ bài <span className="font-bold">{deck.name}</span> có <span className="font-bold">{deckCards.length}</span> thẻ.
              </div>
              <div className="space-y-2">
                <label className="block font-semibold text-sm opacity-80">Định dạng file</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="json"
                      checked={exportFormat === 'json'}
                      onChange={() => setExportFormat('json')}
                    />
                    <span className="font-semibold">JSON (Đề xuất)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="exportFormat"
                      value="csv"
                      checked={exportFormat === 'csv'}
                      onChange={() => setExportFormat('csv')}
                    />
                    <span className="font-semibold">CSV</span>
                  </label>
                </div>
              </div>

              {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{statusMessage}</span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--neo-border)]">
                <button
                  onClick={handleExport}
                  disabled={status === 'processing'}
                  className="neo-btn neo-btn-primary w-full flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Xuất File
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm opacity-80">
                Chọn file để nhập vào bộ bài <span className="font-bold">{deck.name}</span>.
              </div>
              
              <div className="space-y-2">
                <label className="block font-semibold text-sm opacity-80">Định dạng file</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importFormat"
                      value="json"
                      checked={importFormat === 'json'}
                      onChange={() => setImportFormat('json')}
                    />
                    <span className="font-semibold">JSON</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="importFormat"
                      value="csv"
                      checked={importFormat === 'csv'}
                      onChange={() => setImportFormat('csv')}
                    />
                    <span className="font-semibold">CSV</span>
                  </label>
                </div>
              </div>

              {status === 'success' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{statusMessage}</span>
                </div>
              )}
              {status === 'error' && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>{statusMessage}</span>
                </div>
              )}

              <div className="pt-4 border-t border-[var(--neo-border)]">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={importFormat === 'json' ? '.json' : '.csv'}
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={status === 'processing'}
                  className="neo-btn w-full flex items-center justify-center gap-2 bg-[var(--primary)] text-white"
                >
                  <Upload className="w-5 h-5" />
                  {status === 'processing' ? 'Đang nhập...' : 'Chọn File để Nhập'}
                </button>
              </div>

              <div className="text-xs opacity-70 pt-2">
                <strong>Định dạng CSV:</strong> front, back, ipa, definition, example, repetitions, interval, easeFactor
              </div>
            </div>
          )}
        </motion.div>
      </div>
      )}
    </AnimatePresence>
  );
}
