'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Check, X, ArrowLeft } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<'email' | 'otp' | 'reset'>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [retypePassword, setRetypePassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const router = useRouter();

  const passwordRequirements = {
    length: newPassword.length >= 8,
    uppercase: /[A-Z]/.test(newPassword),
    lowercase: /[a-z]/.test(newPassword),
    number: /\d/.test(newPassword),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword)
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = newPassword === retypePassword && retypePassword !== '';

  const sendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (response.ok) {
        setStep('otp');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });

      if (response.ok) {
        const data = await response.json();
        setResetToken(data.resetToken);
        setStep('reset');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!isPasswordValid) {
      setError('Password does not meet requirements');
      return;
    }

    if (!passwordsMatch) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, resetToken, newPassword })
      });

      if (response.ok) {
        router.push('/login?message=Password reset successfully. Please login with your new password.');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reset password');
      }
    } catch (error) {
      setError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <img src="/LOGO.jpeg" alt="Acadivio AI Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm" />
            <h1 className="text-3xl font-bold text-gray-900">Acadivio AI</h1>
          </div>
          <p className="text-gray-600">
            {step === 'email' && 'Reset your password'}
            {step === 'otp' && 'Verify your email'}
            {step === 'reset' && 'Set new password'}
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={sendOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="your.email@example.com"
              />
              <p className="text-sm text-gray-500 mt-1">
                We'll send you an OTP that expires in 10 minutes
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={verifyOTP} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Enter OTP
              </label>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-3">
                <strong>Check your email inbox for the 6-digit OTP code</strong>
                <br />
                <small>OTP expires in 10 minutes. After verification, you'll have 1 hour to reset password.</small>
              </div>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent text-center text-2xl tracking-widest"
                placeholder="123456"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !otp}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              type="button"
              onClick={() => setStep('email')}
              className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 flex items-center justify-center"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to email
            </button>
          </form>
        )}

        {step === 'reset' && (
          <form onSubmit={resetPassword} className="space-y-6">
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded mb-4">
              <strong>✓ Email verified successfully</strong>
              <br />
              <small>You can now set your new password. You have 1 hour to complete this step.</small>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-gray-400"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="mt-2 space-y-1">
                <div className={`flex items-center text-sm ${passwordRequirements.length ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordRequirements.length ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  At least 8 characters
                </div>
                <div className={`flex items-center text-sm ${passwordRequirements.uppercase ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordRequirements.uppercase ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  One uppercase letter
                </div>
                <div className={`flex items-center text-sm ${passwordRequirements.lowercase ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordRequirements.lowercase ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  One lowercase letter
                </div>
                <div className={`flex items-center text-sm ${passwordRequirements.number ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordRequirements.number ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  One number
                </div>
                <div className={`flex items-center text-sm ${passwordRequirements.special ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordRequirements.special ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  One special character
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showRetypePassword ? 'text' : 'password'}
                  value={retypePassword}
                  onChange={(e) => setRetypePassword(e.target.value)}
                  required
                  className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowRetypePassword(!showRetypePassword)}
                  className="absolute right-3 top-2.5 text-gray-400"
                >
                  {showRetypePassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {retypePassword && (
                <div className={`flex items-center text-sm mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                  {passwordsMatch ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                  Passwords match
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !isPasswordValid || !passwordsMatch}
              className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Resetting Password...' : 'Reset Password'}
            </button>

            <div className="text-center">
              <button
                type="button"
                onClick={() => setStep('otp')}
                className="text-gray-600 hover:text-gray-800 font-medium py-2 flex items-center justify-center w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to OTP verification
              </button>
            </div>
          </form>
        )}

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Remember your password?{' '}
            <Link href="/login" className="text-green-500 hover:text-green-600 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}