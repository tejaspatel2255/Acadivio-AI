'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getInstitutions } from '@/lib/api';
import Link from 'next/link';

import { Check, X } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    retypePassword: '',
    mobile: '',
    role: 'student' as 'student' | 'teacher',
    institutionId: '',
  });
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const router = useRouter();

  const passwordRequirements = {
    length: formData.password.length >= 8,
    uppercase: /[A-Z]/.test(formData.password),
    lowercase: /[a-z]/.test(formData.password),
    number: /\d/.test(formData.password),
    special: /[!@#$%^&*(),.?":{}|<>]/.test(formData.password)
  };

  const isPasswordValid = Object.values(passwordRequirements).every(Boolean);
  const passwordsMatch = formData.password === formData.retypePassword && formData.retypePassword !== '';

  useEffect(() => {
    getInstitutions()
      .then((data) => {
        if (data) {
          setInstitutions(data);
        }
      })
      .catch((error) => {
        console.error('Error fetching institutions:', error);
      });
  }, []);

  const sendOTP = async () => {
    if (!formData.email) return;

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email })
      });

      if (response.ok) {
        setOtpSent(true);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to send OTP');
      }
    } catch (error) {
      setError('Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email, otp })
      });

      if (response.ok) {
        setOtpVerified(true);
        setError('');
      } else {
        const data = await response.json();
        setError(data.error || 'Invalid OTP');
      }
    } catch (error) {
      setError('Failed to verify OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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

    if (!otpVerified) {
      setError('Please verify your email with OTP');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password,
          mobile: formData.mobile,
          role: formData.role,
          institutionId: formData.institutionId || undefined
        })
      });

      if (response.ok) {
        router.push(`/login?email=${encodeURIComponent(formData.email)}&password=${encodeURIComponent(formData.password)}`);
      } else {
        const data = await response.json();
        setError(data.error || 'Registration failed');
      }
    } catch (error) {
      setError('Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-xl p-8">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-2">
            <img src="/LOGO.jpeg" alt="Acadivio AI Logo" className="w-10 h-10 object-contain rounded-lg shadow-sm" />
            <h1 className="text-3xl font-bold text-gray-900">Acadivio AI</h1>
          </div>
          <p className="text-gray-600">Create your account to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Full Name</label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <div className="flex gap-2">
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="your.email@example.com"
              />
              {!otpSent && (
                <button
                  type="button"
                  onClick={sendOTP}
                  disabled={!formData.email || loading}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50"
                >
                  Send OTP
                </button>
              )}
            </div>
          </div>

          {otpSent && !otpVerified && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-2 rounded mb-2">
                <strong>Check your email inbox for the 6-digit OTP code</strong>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  maxLength={6}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  placeholder="123456"
                />
                <button
                  type="button"
                  onClick={verifyOTP}
                  disabled={!otp || loading}
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:opacity-50"
                >
                  Verify
                </button>
              </div>
            </div>
          )}

          {otpVerified && (
            <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded">
              ✓ Email verified successfully
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
            <input
              type="tel"
              value={formData.mobile}
              onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
              required
              pattern="[0-9]{10}"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              placeholder="1234567890"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <div className="relative">
              <input
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Retype Password</label>
            <div className="relative">
              <input
                type="password"
                value={formData.retypePassword}
                onChange={(e) => setFormData({ ...formData, retypePassword: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                placeholder="••••••••"
              />
            </div>
            {formData.retypePassword && (
              <div className={`flex items-center text-sm mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                {passwordsMatch ? <Check className="w-4 h-4 mr-1" /> : <X className="w-4 h-4 mr-1" />}
                Passwords match
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          {institutions.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Institution (Optional)</label>
              <select
                value={formData.institutionId}
                onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
              >
                <option value="">Select an institution</option>
                {institutions.map((inst) => (
                  <option key={inst.id} value={inst.id}>
                    {inst.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !isPasswordValid || !passwordsMatch || !otpVerified}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-gray-600">
            Already have an account?{' '}
            <Link href="/login" className="text-green-500 hover:text-green-600 font-semibold">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}