'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { motion } from 'framer-motion';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { GraduationCap, BookOpen, Trophy, ArrowRight, CheckCircle, Sparkles } from 'lucide-react';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      if (user.role === 'student') {
        router.push('/dashboard/student');
      } else if (user.role === 'teacher') {
        router.push('/dashboard/teacher');
      } else if (user.role === 'admin') {
        router.push('/dashboard/admin');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-blue-50">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-green-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pt-14 overflow-hidden">
      {/* Hero Section */}
      <section className="relative pt-0 pb-32">
        {/* Animated Background Blobs */}
        <div className="absolute top-0 left-0 w-full h-full pointer-events-none -z-10">
          <motion.div
            animate={{ scale: [1, 1.2, 1], rotate: [0, 90, 0] }}
            transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          />
          <motion.div
            animate={{ scale: [1, 1.1, 1], x: [0, 50, 0] }}
            transition={{ duration: 15, repeat: Infinity, ease: "linear" }}
            className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-blue-200/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          />
          <motion.div
            animate={{ scale: [1, 1.3, 1], y: [0, -50, 0] }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-emerald-100/40 rounded-full mix-blend-multiply filter blur-3xl opacity-50"
          />
        </div>

        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              className="inline-flex items-center justify-center p-3 rounded-full mb-8 bg-white/80 border border-green-100 shadow-[0_8px_30px_rgb(0,0,0,0.04)] backdrop-blur-md cursor-default hover:shadow-[0_8px_30px_rgb(34,197,94,0.2)] transition-shadow duration-300"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
            >
              <div className="w-32 h-32 sm:w-40 sm:h-40 bg-white rounded-full flex items-center justify-center overflow-hidden p-1">
                <img 
                  src="/LOGO.jpeg" 
                  alt="Acadivio AI Logo" 
                  className="w-full h-full object-cover rounded-full shadow-sm" 
                />
              </div>
            </motion.div>

            <h1 className="text-6xl md:text-8xl font-black text-slate-900 mb-6 tracking-tight leading-none">
              Acadivio <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">AI</span>
            </h1>

            <p className="text-xl md:text-2xl text-slate-600 mb-10 max-w-2xl mx-auto leading-relaxed font-light">
              Intelligent Academic ERP & Adaptive Learning Platform. <br />
              Personalized, data-driven, and seamless.
            </p>

            <div className="flex flex-col sm:flex-row justify-center gap-4">
              {user ? (
                <Link href={`/dashboard/${user.role}`}>
                  <Button size="lg" className="w-full sm:w-auto h-14 text-lg shadow-green-500/40">
                    Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button size="lg" className="w-full sm:w-auto h-14 text-lg shadow-green-500/40">
                      Start Learning Now <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button variant="outline" size="lg" className="w-full sm:w-auto h-14 text-lg border-2">
                      Log In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-24 relative">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">
            <Card className="hover:border-green-200 border-t-4 border-t-green-500">
              <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <GraduationCap className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">For Students</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Track your academic performance, attempt AI-adaptive quizzes, earn achievement badges, and compete on the leaderboard while mastering your subjects.
              </p>
              <ul className="space-y-3 text-slate-500 font-medium">
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" /> Adaptive Smart Practice</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-green-500 mr-3" /> Academic Challenges</li>
              </ul>
            </Card>

            <Card className="hover:border-blue-200 border-t-4 border-t-blue-500">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <BookOpen className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">For Teachers</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Empower your classroom with powerful tools. Create custom lessons, manage internal marks, generate AI quizzes, and track student academic progress.
              </p>
              <ul className="space-y-3 text-slate-500 font-medium">
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-blue-500 mr-3" /> Content Management</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-blue-500 mr-3" /> Student Analytics</li>
              </ul>
            </Card>

            <Card className="hover:border-amber-200 border-t-4 border-t-amber-500">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-100 to-amber-50 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
                <Trophy className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-3">Academic Achievements</h3>
              <p className="text-slate-600 leading-relaxed mb-6">
                Learning is rewarding. Earn XP points for completing lessons and quizzes, unlock milestone badges, and rise through academic leaderboards.
              </p>
              <ul className="space-y-3 text-slate-500 font-medium">
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Leaderboards</li>
                <li className="flex items-center"><CheckCircle className="w-5 h-5 text-amber-500 mr-3" /> Achievement Badges</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Stats Section with Glassmorphism */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="glass-elevated rounded-[2.5rem] p-12 text-center relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-r from-green-500/5 to-blue-500/5 z-0" />
            <div className="relative z-10 grid md:grid-cols-3 gap-12">
              <div className="space-y-2">
                <div className="text-5xl font-black text-slate-900 mb-2">500+</div>
                <div className="text-slate-500 font-bold uppercase tracking-wider text-sm">Active Students</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black text-slate-900 mb-2">1k+</div>
                <div className="text-slate-500 font-bold uppercase tracking-wider text-sm">Challenges Completed</div>
              </div>
              <div className="space-y-2">
                <div className="text-5xl font-black text-slate-900 mb-2">50+</div>
                <div className="text-slate-500 font-bold uppercase tracking-wider text-sm">Registered Schools</div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
