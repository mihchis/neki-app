'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLMStudioStore } from '@/store/lmStore';
import { Settings, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface LMStudioSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LMStudioSettings({ isOpen, onClose }: LMStudioSettingsProps) {
  const { baseUrl, setBaseUrl, testConnection } = useLMStudioStore();
  const [url, setUrl] = useState(baseUrl);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  useEffect(() => {
    setUrl(baseUrl);
  }, [baseUrl, isOpen]);

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    const success = await testConnection();
    setTestResult(success ? 'success' : 'error');
    setIsTesting(false);
  };

  const handleSave = () => {
    setBaseUrl(url);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div key="lm-studio-modal-root" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="absolute inset-0" onClick={onClose}></div>
          <motion.div
            key="lm-studio-modal"
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            className="relative neo-card max-w-md w-full p-6 bg-[var(--card-bg)] z-10"
          >
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-[var(--neo-border)]">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Settings className="w-6 h-6" />
                LM Studio Settings
              </h3>
              <button onClick={onClose} className="neo-btn p-2 neo-btn-red">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block font-semibold text-sm opacity-80">LM Studio URL</label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="http://127.0.0.1:1234"
                  className="neo-input"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="neo-btn flex-1"
                >
                  {isTesting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                  Test Connection
                </button>
                <button onClick={handleSave} className="neo-btn neo-btn-primary flex-1">
                  Save
                </button>
              </div>

              {testResult === 'success' && (
                <div className="flex items-center gap-2 text-green-600 dark:text-green-400 font-semibold p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>Connection successful!</span>
                </div>
              )}
              
              {testResult === 'error' && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 font-semibold p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                  <AlertCircle className="w-5 h-5" />
                  <span>Connection failed. Check LM Studio is running!</span>
                </div>
              )}

              <div className="text-sm opacity-70">
                <strong>To use AI features:</strong>
                <ol className="list-decimal list-inside mt-1">
                  <li>Open LM Studio</li>
                  <li>Load models: qwen/qwen3.5-9b and text-embedding-bge-m3</li>
                  <li>Start the server</li>
                  <li>Set the correct URL above</li>
                </ol>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
