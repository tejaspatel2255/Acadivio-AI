'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

function LoginPageContent() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Pre-fill from registration redirect
    const emailParam = searchParams.get('email');
    const passParam = searchParams.get('password');
    const messageParam = searchParams.get('message');

    if (emailParam) {
      setEmail(emailParam);
    }
    if (passParam) {
      setPassword(passParam);
    }
    if (messageParam) {
      setSuccessMessage(messageParam);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          password: password
        })
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('token', data.token);

        console.log('Login successful, user role:', data.user.role);

        // Update auth context by calling signIn
        try {
          await signIn(email, password);
        } catch (authError) {
          console.log('Auth context update failed, but continuing with redirect');
        }

        // Redirect based on role
        switch (data.user.role) {
          case 'admin':
            console.log('Redirecting to admin dashboard');
            router.push('/dashboard/admin');
            break;
          case 'teacher':
            console.log('Redirecting to teacher dashboard');
            router.push('/dashboard/teacher');
            break;
          case 'student':
            console.log('Redirecting to student dashboard');
            router.push('/dashboard/student');
            break;
          default:
            console.log('Unknown role, redirecting to home');
            router.push('/');
        }
      } else {
        const data = await response.json();
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = err.message || 'Failed to sign in';

      if (errorMessage.includes('Failed to fetch') || errorMessage.includes('Network')) {
        errorMessage = 'Cannot connect to server. Make sure the backend is running.';
      }

      setError(errorMessage);
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
          <p className="text-gray-600">Welcome back! Please login to continue</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
              {successMessage}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder="your.email@example.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>

          <div className="text-center">
            <Link href="/forgot-password" className="text-sm text-green-500 hover:text-green-600 font-medium">
              Forgot your password?
            </Link>
          </div>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Don't have an account?{' '}
            <Link href="/register" className="text-green-500 hover:text-green-600 font-semibold">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    }>
      <LoginPageContent />
    </Suspense>
  );
}