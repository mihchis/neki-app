"use client";

import React, { useEffect, useState } from 'react';
import { useCardStore } from '../store/cardStore';
import { auth } from '../utils/firebase';
import { onAuthStateChanged } from 'firebase/auth';

export default function ClientInit({ children }: { children: React.ReactNode }) {
  const userId = useCardStore((state) => state.userId);
  const setUserId = useCardStore((state) => state.setUserId);
  const subscribeToData = useCardStore((state) => state.subscribeToData);
  const signInWithEmail = useCardStore((state) => state.signInWithEmail);
  const signUpWithEmail = useCardStore((state) => state.signUpWithEmail);

  const [authLoaded, setAuthLoaded] = useState(false);
  
  // Login form state
  const [email, setEmail] = useState('trin79136@gmail.com'); // Autofill the user's provided account
  const [password, setPassword] = useState('123456');        // Autofill password
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Listen to Firebase Auth state change reactively
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
        subscribeToData(user.uid);
      } else {
        setUserId(null);
      }
      setAuthLoaded(true);
    });

    return () => unsubscribe();
  }, [setUserId, subscribeToData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isSignUp) {
        await signUpWithEmail(email, password);
      } else {
        await signInWithEmail(email, password);
      }
    } catch (err: any) {
      console.error(err);
      if (err.code === 'auth/configuration-not-found') {
        setError('Error: Email/Password sign-in provider is not enabled in your Firebase console.');
      } else if (err.code === 'auth/invalid-credential') {
        setError('Error: Invalid email or password.');
      } else {
        setError(err.message || 'Authentication failed. Please verify credentials.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 1. Loading auth state
  if (!authLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)] transition-colors duration-200">
        <div className="neo-card p-8 bg-[#f59e0b] text-black text-center max-w-sm neo-border-bold neo-shadow-lg">
          <h2 className="text-3xl font-black mb-4 tracking-wider animate-pulse">⚡ NEKI LOADING</h2>
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em]" role="status"></div>
          <p className="font-bold text-sm mt-4">Connecting to Neki services...</p>
        </div>
      </div>
    );
  }

  // 2. Render Login Form if not logged in
  if (!userId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[var(--background)] py-12 px-6 transition-colors duration-200">
        <div className="neo-card max-w-md w-full p-8 bg-[var(--card-bg)] border-3 border-[var(--neo-border)] relative">
          
          <div className="text-center mb-6">
            <span className="text-3xl font-black bg-[#f59e0b] border-2 border-black px-3 py-1 shadow-sm transform -rotate-2 inline-block text-black">
              ⚡ NEKI LOGIN
            </span>
            <p className="text-xs font-black mt-4 uppercase opacity-75">
              Spaced Repetition Flashcards
            </p>
          </div>

          {error && (
            <div className="bg-[var(--accent-red-light)] border-2 border-red-500 text-red-700 font-bold p-3 rounded-none mb-4 text-xs">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase opacity-80 mb-1">
                Email Address
              </label>
              <input
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="neo-input"
              />
            </div>

            <div>
              <label className="block text-xs font-black uppercase opacity-80 mb-1">
                Password
              </label>
              <input
                type="password"
                placeholder="******"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="neo-input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="neo-btn neo-btn-primary w-full py-3 border-2 border-[var(--neo-border)] font-black uppercase text-black disabled:opacity-50 mt-2"
            >
              {loading ? 'Connecting...' : isSignUp ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => {
                setError('');
                setIsSignUp(!isSignUp);
              }}
              className="text-xs font-black underline hover:text-[#8b5cf6] cursor-pointer uppercase tracking-wider text-[var(--foreground)]"
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

        </div>
      </div>
    );
  }

  // 3. Authenticated - Render the Main Application dashboard/reviews
  return <>{children}</>;
}
