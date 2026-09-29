'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { StudentStats, Lesson, Quiz, Challenge } from '@/lib/types';
import { getStudentStats, getLessons, getQuizzes, getChallenges } from '@/lib/api';
import { TrendingUp, BookOpen, Trophy, Target, Award, BarChart3, Brain } from 'lucide-react';
import LiveLeaderboard from '@/components/LiveLeaderboard';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<StudentStats | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [latestSmartPractice, setLatestSmartPractice] = useState<Quiz | null>(null);
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSemester, setActiveSemester] = useState<number>(user?.semester || 1);

  useEffect(() => {
    if (user?.semester) {
      setActiveSemester(user.semester);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, activeSemester]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Load student stats
      const statsData = await getStudentStats();
      if (statsData) setStats(statsData);

      // Load lessons (filter by classNumber/semester)
      const lessonsData = await getLessons(activeSemester ? String(activeSemester) : undefined);
      if (lessonsData) setLessons(lessonsData.slice(0, 5));

      // Load quizzes
      const quizzesData = await getQuizzes(activeSemester ? String(activeSemester) : undefined);
      if (quizzesData) {
        // Filter out Smart Practice quizzes from general dashboard
        const generalQuizzes = quizzesData.filter((q: Quiz) => !q.title.startsWith('Smart Practice'));
        setQuizzes(generalQuizzes.slice(0, 5));

        // Get latest Smart Practice quiz
        const smartPracticeQuizzes = quizzesData
          .filter((q: Quiz) => q.title.startsWith('Smart Practice'))
          .sort((a: Quiz, b: Quiz) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());

        if (smartPracticeQuizzes.length > 0) {
          setLatestSmartPractice(smartPracticeQuizzes[0]);
        } else {
          setLatestSmartPractice(null);
        }
      }

      // Load challenges
      const challengesData = await getChallenges(activeSemester ? String(activeSemester) : undefined);
      if (challengesData) setChallenges(challengesData.slice(0, 5));
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Welcome, {user?.full_name}! 👋
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                Academic ERP & Adaptive Learning Overview
              </p>
            </div>
            
            <div className="flex items-center bg-blue-50 border border-blue-200 px-4 py-2 rounded-xl shadow-sm">
              <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider mr-2">Semester:</span>
              <select
                value={activeSemester}
                onChange={(e) => setActiveSemester(Number(e.target.value))}
                className="text-sm font-bold text-blue-900 bg-white px-3 py-1 rounded-lg border border-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8].map((sem) => (
                  <option key={`sem-${sem}`} value={sem}>
                    Semester {sem}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Total Points</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.total_points || 0}</p>
                </div>
                <Trophy className="w-12 h-12 text-yellow-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Current Level</p>
                  <p className="text-3xl font-bold text-blue-600">{stats?.current_level || 1}</p>
                </div>
                <TrendingUp className="w-12 h-12 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Lessons Completed</p>
                  <p className="text-3xl font-bold text-purple-600">{stats?.lessons_completed || 0}</p>
                </div>
                <BookOpen className="w-12 h-12 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-gray-600 text-sm">Academic Impact Score</p>
                  <p className="text-3xl font-bold text-green-600">{stats?.academic_impact_score || 0}</p>
                </div>
                <Target className="w-12 h-12 text-green-500" />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Recent Lessons */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold flex items-center">
                  <BookOpen className="w-5 h-5 mr-2" />
                  Recent Lessons
                </h2>
                <a href="/dashboard/student/lessons" className="text-green-600 hover:text-green-700 text-sm">
                  View All
                </a>
              </div>
              {lessons.length === 0 ? (
                <p className="text-gray-500">No lessons available yet</p>
              ) : (
                <div className="space-y-4">
                  {lessons.map((lesson) => (
                    <div key={`lesson-${lesson.id || lesson._id}`} className="border-l-4 border-green-500 pl-4 py-2">
                      <h3 className="font-semibold text-gray-900">{lesson.title}</h3>
                      <p className="text-sm text-gray-600">{lesson.topic}</p>
                      <a
                        href={`/dashboard/student/lessons/${lesson.id || lesson._id}`}
                        className="text-green-600 hover:text-green-700 text-sm mt-2 inline-block"
                      >
                        View Lesson →
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements & Badges */}
            <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-lg shadow-md p-6 text-white relative overflow-hidden group">
              <div className="relative z-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center">
                    <Award className="w-6 h-6 mr-2 text-yellow-300" />
                    My Badges
                  </h2>
                  <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">New</span>
                </div>
                <p className="text-indigo-100 mb-6 text-sm">
                  Track your academic milestones and unlock unique badges for your performance.
                </p>
                <Link href="/dashboard/student/achievements" className="inline-flex items-center px-4 py-2 bg-white text-indigo-600 rounded-lg font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm">
                  View Collection <Target className="w-4 h-4 ml-2" />
                </Link>
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-32 h-32 -mr-6 -mb-6" />
              </div>
              <div className="absolute right-0 bottom-0 opacity-10 group-hover:opacity-20 transition-opacity">
                <Trophy className="w-32 h-32 -mr-6 -mb-6" />
              </div>
            </div>

            {/* Available Quizzes */}
            <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100 transition-all hover:shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-900">
                  <div className="p-2 bg-blue-100 rounded-lg mr-3">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                  </div>
                  Available Quizzes
                </h2>
                <a href="/dashboard/student/quizzes" className="text-sm font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors">
                  View All
                </a>
              </div>
              {quizzes.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                  <p className="text-gray-500">No quizzes available yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {quizzes.map((quiz) => (
                    <div key={`quiz-${quiz.id || quiz._id}`} className="group p-4 rounded-xl bg-gray-50 hover:bg-blue-50 transition-colors border border-gray-100 hover:border-blue-100">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-700 transition-colors">{quiz.title}</h3>
                        <span className="text-xs font-semibold bg-white px-2 py-1 rounded-full text-gray-600 border border-gray-200">
                          {quiz.total_marks} Marks
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs font-medium text-gray-500">Ready to start?</span>
                        <a
                          href={`/dashboard/student/quizzes/${quiz.id || quiz._id}`}
                          className="inline-flex items-center text-xs font-bold text-white bg-blue-600 px-3 py-1.5 rounded-lg hover:bg-blue-700 transition-colors shadow-sm group-hover:shadow"
                        >
                          Start Quiz →
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Smart Practice Card - Below Badges */}
            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-xl shadow-md p-6 border border-indigo-100 relative overflow-hidden">
              <div className="flex items-center justify-between mb-4 relative z-10">
                <h2 className="text-xl font-bold flex items-center text-indigo-900">
                  <Brain className="w-6 h-6 mr-2 text-indigo-600" />
                  Smart Practice
                </h2>
                <Link href="/dashboard/student/smart-practice" className="text-xs font-bold text-indigo-600 bg-white px-3 py-1.5 rounded-full shadow-sm hover:bg-indigo-50 transition-colors">
                  View All
                </Link>
              </div>

              {latestSmartPractice ? (
                <div className="bg-white rounded-xl p-4 shadow-sm border border-indigo-50 relative z-10">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-bold text-gray-900 line-clamp-1">{latestSmartPractice.title}</h3>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(latestSmartPractice.created_at || Date.now()).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-1 rounded-lg">
                      {latestSmartPractice.questions?.length || 25} Qs
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/student/quizzes/${latestSmartPractice.id || latestSmartPractice._id}`}
                    className="w-full mt-3 flex items-center justify-center bg-indigo-600 text-white text-sm font-bold py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Start Quiz
                  </Link>
                </div>
              ) : (
                <div className="text-center py-6 bg-white/50 rounded-xl border border-dashed border-indigo-200 relative z-10">
                  <p className="text-sm text-indigo-800 font-medium mb-2">No practice quizzes yet</p>
                  <Link
                    href="/dashboard/student/smart-practice"
                    className="inline-block text-xs font-semibold text-indigo-600 border border-indigo-200 px-3 py-1.5 rounded-lg hover:bg-white transition-colors"
                  >
                    Generate New
                  </Link>
                </div>
              )}

              {/* Decorative background element */}
              <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-indigo-100 rounded-full blur-2xl opacity-50"></div>
            </div>

            {/* Challenges */}
            <div className="bg-white rounded-xl shadow-lg p-6 lg:col-span-2 border border-gray-100 transition-all hover:shadow-xl">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold flex items-center text-gray-900">
                  <div className="p-2 bg-green-100 rounded-lg mr-3">
                    <Target className="w-5 h-5 text-green-600" />
                  </div>
                  Academic Challenges
                </h2>
                <a href="/dashboard/student/challenges" className="text-sm font-semibold text-green-600 hover:text-green-700 bg-green-50 px-3 py-1 rounded-full hover:bg-green-100 transition-colors">
                  View All
                </a>
              </div>
              {challenges.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                  <Target className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No challenges available yet</p>
                  <p className="text-sm text-gray-400 mt-1">Check back soon for new tasks!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {challenges.map((challenge) => (
                    <div key={`challenge-${challenge.id || challenge._id}`} className="group border border-gray-200 rounded-xl p-5 hover:shadow-lg hover:border-green-200 transition-all bg-gradient-to-br from-white to-gray-50/50 hover:to-green-50/30">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-green-700 transition-colors">{challenge.title}</h3>
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2.5 py-1 rounded-lg border border-green-200">
                          +{challenge.points_reward} pts
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2 leading-relaxed">{challenge.description}</p>
                      <a
                        href={`/dashboard/student/challenges/${challenge.id || challenge._id}`}
                        className="inline-flex items-center text-sm font-semibold text-green-600 hover:text-green-700 group-hover:translate-x-1 transition-transform"
                      >
                        View Challenge <span className="ml-1 text-lg">→</span>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Badges Section */}
          {stats && stats.badges_earned && stats.badges_earned.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6 mt-8">
              <h2 className="text-xl font-semibold flex items-center mb-4">
                <Award className="w-5 h-5 mr-2" />
                Your Badges
              </h2>
              <div className="flex flex-wrap gap-4">
                {stats.badges_earned.map((badgeId: string, index: number) => (
                  <div key={`badge-${badgeId}-${index}`} className="bg-yellow-100 rounded-full px-4 py-2">
                    <span className="text-yellow-800">🏆 Badge {index + 1}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Quick Access */}
          {/* Live Leaderboard - Full Width */}
          <div className="mt-8">
            <LiveLeaderboard />
          </div>

          {/* Academic Tools & Quick Access */}
          <h2 className="text-xl font-bold text-gray-900 mt-8 mb-4">Academic Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              href="/dashboard/student/analytics"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all border border-blue-100 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                  <BarChart3 className="w-8 h-8 text-blue-600" />
                </div>
                <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-1 rounded-full">Insights</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-blue-700 transition-colors">Performance Analytics</h3>
              <p className="text-gray-600 text-sm">View your performance trends and get personalized AI suggestions.</p>
            </Link>

            <Link
              href="/dashboard/student/exam-planner"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all border border-indigo-100 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-indigo-100 rounded-lg group-hover:bg-indigo-200 transition-colors">
                  <TrendingUp className="w-8 h-8 text-indigo-600" />
                </div>
                <span className="text-xs font-bold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">Planning</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-indigo-700 transition-colors">Exam Planner</h3>
              <p className="text-gray-600 text-sm">Track your syllabus progress and predict your upcoming grades.</p>
            </Link>

            <Link
              href="/dashboard/student/challenges"
              className="bg-white rounded-xl shadow-md p-6 hover:shadow-xl transition-all border border-green-100 group"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                  <Target className="w-8 h-8 text-green-600" />
                </div>
                <span className="text-xs font-bold bg-green-50 text-green-600 px-2 py-1 rounded-full">+ Points</span>
              </div>
              <h3 className="text-lg font-bold text-gray-900 mb-2 group-hover:text-green-700 transition-colors">Academic Challenges</h3>
              <p className="text-gray-600 text-sm">Complete academic challenges and projects to earn badges.</p>
            </Link>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
