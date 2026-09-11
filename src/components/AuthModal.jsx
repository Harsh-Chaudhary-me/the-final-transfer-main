import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { X, Mail, Lock, CheckCircle2 } from 'lucide-react';
import { supabase } from '../supabase';

export default function AuthModal({ isOpen, onClose, isSignUpMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState('login'); // 'login', 'signup', 'forgot_password', 'magic-link-sent', 'reset-link-sent'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync mode with props when opened
  useEffect(() => {
    if (isOpen) {
      setMode(isSignUpMode ? 'signup' : 'login');
      setEmail('');
      setPassword('');
      setError('');
    }
  }, [isOpen, isSignUpMode]);

  if (!isOpen) return null;

  const handleSignUpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      setMode('magic-link-sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your email address first.");
      return;
    }
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) throw error;
      setMode('reset-link-sent');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetStateAndClose = () => {
    setEmail('');
    setPassword('');
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }} 
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-8 relative"
      >
        <button onClick={resetStateAndClose} className="absolute top-6 right-6 text-gray-400 hover:text-gray-800"><X size={24}/></button>
        
        <h2 className="text-2xl font-bold mb-2">
          {mode === 'signup' && "Create Account"}
          {mode === 'login' && "Welcome Back"}
          {mode === 'forgot_password' && "Reset Password"}
          {mode === 'magic-link-sent' && "Check Your Email"}
          {mode === 'reset-link-sent' && "Password Reset Sent"}
        </h2>
        <p className="text-gray-500 mb-8">
          {mode === 'signup' && "Enter your email. We'll send a magic link to verify your account and set a password."}
          {mode === 'login' && "Please enter your email and password to log in."}
          {mode === 'forgot_password' && "Enter your email to receive a password reset link."}
          {mode === 'magic-link-sent' && "We've sent a magic verification link. Click it to log in and set up your vault."}
          {mode === 'reset-link-sent' && "Check your inbox for a link to reset your password."}
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">
            {error}
          </div>
        )}

        {mode === 'signup' && (
          <form onSubmit={handleSignUpSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full py-4 mt-4 rounded-full font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? "Sending link..." : "Send Verification Link"}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full mt-4 text-sm text-gray-500 hover:text-gray-800">
              Already have an account? Log in
            </button>
          </form>
        )}

        {mode === 'login' && (
          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Password</label>
                <button type="button" onClick={() => setMode('forgot_password')} className="text-xs text-[#FF8C00] hover:text-[#FF6A00] font-medium">Forgot password?</button>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input 
                  required 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none" 
                  placeholder="••••••••" 
                />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full py-4 mt-4 rounded-full font-bold bg-gradient-to-r from-[#FF8C00] to-[#FF6A00] text-white shadow-lg shadow-orange-500/30 hover:shadow-orange-500/50 transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? "Signing in..." : "Login Securely"}
            </button>
            <button type="button" onClick={() => setMode('signup')} className="w-full mt-4 text-sm text-gray-500 hover:text-gray-800">
              New here? Sign up
            </button>
          </form>
        )}

        {mode === 'forgot_password' && (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 text-gray-400 w-5 h-5" />
                <input 
                  required 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-2xl py-3 pl-12 pr-4 focus:ring-2 focus:ring-[#FF8C00] focus:border-transparent outline-none" 
                  placeholder="you@example.com" 
                />
              </div>
            </div>
            <button disabled={loading} type="submit" className="w-full py-4 mt-4 rounded-full font-bold bg-gray-800 text-white shadow-lg hover:bg-gray-900 transition-all active:scale-[0.98] disabled:opacity-50">
              {loading ? "Sending reset link..." : "Send Reset Link"}
            </button>
            <button type="button" onClick={() => setMode('login')} className="w-full mt-4 text-sm text-gray-500 hover:text-gray-800">
              Back to Login
            </button>
          </form>
        )}

        {(mode === 'magic-link-sent' || mode === 'reset-link-sent') && (
          <div className="text-center py-6">
            <div className="w-16 h-16 bg-orange-100 text-[#FF8C00] rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={32} />
            </div>
            <p className="text-gray-700 font-medium">Link sent to <span className="font-bold">{email}</span></p>
            <p className="text-sm text-gray-500 mt-4">You can safely close this window.</p>
          </div>
        )}

      </motion.div>
    </div>
  );
}
