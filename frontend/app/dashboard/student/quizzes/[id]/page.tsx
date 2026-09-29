'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { QuizQuestion } from '@/lib/types';
import { getQuiz, submitQuiz } from '@/lib/api';
import AiTutor from '@/components/AiTutor';

export default function TakeQuizPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isPractice = searchParams.get('practice') === 'true';
  const { user } = useAuth();
  const [quiz, setQuiz] = useState<any>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState<any>(null);
  const [requestStatus, setRequestStatus] = useState<'pending' | 'none' | null>(null);
  const [canAttempt, setCanAttempt] = useState(true);
  const [attemptsCount, setAttemptsCount] = useState(0);
  const [allowedAttempts, setAllowedAttempts] = useState(1);
  const [requesting, setRequesting] = useState(false);
  const [tutorOpen, setTutorOpen] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      loadQuiz();
      startAttempt();
    }
  }, [user, params.id]);

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !submitted) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [timeLeft, submitted]);

  const loadQuiz = async () => {
    try {
      const quizData = await getQuiz(params.id as string);
      if (quizData) {
        setQuiz(quizData);
        setCanAttempt(quizData.canAttempt !== false);
        setAttemptsCount(quizData.attemptsCount || 0);
        setAllowedAttempts(quizData.allowedAttempts || 1);
        setRequestStatus(quizData.requestStatus || 'none');

        if (quizData.time_limit) {
          setTimeLeft(quizData.time_limit * 60); // Convert to seconds
        }

        if (quizData.questions) {
          let loadedQuestions = quizData.questions;
          if (isPractice) {
            // Shuffle questions
            loadedQuestions = [...loadedQuestions].sort(() => Math.random() - 0.5);
          }
          setQuestions(loadedQuestions);
        }
      }
    } catch (error) {
      console.error('Error loading quiz:', error);
    } finally {
      setLoading(false);
    }
  };

  const startAttempt = async () => {
    // Attempt is started automatically when quiz is loaded
    // Backend will handle attempt creation on submit
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (submitted) return;

    try {
      // Submit answers to backend
      const result = await submitQuiz(params.id as string, answers);

      if (result) {
        setScore({
          totalScore: result.score || 0,
          totalMarks: result.total_marks || 0,
          percentage: result.percentage || 0
        });
        setSubmitted(true);
      }
    } catch (error) {
      console.error('Error submitting quiz:', error);
    }
  };

  const handleRequestRetake = async () => {
    if (!confirm('Request a retake from your teacher?')) return;
    setRequesting(true);
    try {
      // We need to move api calls to lib/api.ts properly, but inline for now or import
      // Assuming we add a helper in api.ts or use direct fetch here for speed, 
      // but let's stick to using the api.ts pattern. 
      // I'll assume I need to add `requestRetake` to api.ts, but for this specific step 
      // I will use a direct fetch pattern if api.ts isn't easily editable in same turn, 
      // but better to add it to api.ts first? 
      // Actually, I can add the function to api.ts in a subsequent step or just use `apiCall` if exported.
      // Let's manually fetch for now to keep it self-contained or use the token.
      // Wait, `getQuiz` is imported. I should really update `lib/api.ts`.
      // I'll proceed with frontend view logic first, but I'll add the `requestRetake` call logic here assuming it exists
      // or valid fetch.

      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:3001/api/quizzes/${params.id}/request-retake`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to request retake');
      }

      setRequestStatus('pending');
      alert('Retake request sent successfully!');
    } catch (error: any) {
      alert(error.message);
    } finally {
      setRequesting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-indigo-900 font-medium">Loading Quiz...</p>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (!quiz) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-slate-50 flex items-center justify-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚠️</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 mb-2">Quiz Not Found</h2>
            <button
              onClick={() => router.push('/dashboard/student/quizzes')}
              className="mt-4 px-6 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Back to Quizzes
            </button>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  // Blocked View
  if (!canAttempt) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12 text-center max-w-2xl w-full border border-slate-100">
              <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-4xl">🔒</span>
              </div>
              <h1 className="text-3xl font-bold text-slate-900 mb-4">Maximum Attempts Reached</h1>
              <p className="text-slate-600 text-lg mb-8 max-w-md mx-auto">
                You have used <span className="font-bold text-slate-900">{attemptsCount}</span> of <span className="font-bold text-slate-900">{allowedAttempts}</span> allowed attempts for this quiz.
              </p>

              {requestStatus === 'pending' ? (
                <div className="bg-amber-50 border border-amber-200 text-amber-900 p-6 rounded-2xl inline-block max-w-md w-full">
                  <div className="font-bold text-lg mb-1">Retake Request Pending</div>
                  <p className="opacity-90">Your teacher is reviewing your request.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  <p className="text-slate-500">Would you like to request another attempt?</p>
                  <button
                    onClick={handleRequestRetake}
                    disabled={requesting}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-1"
                  >
                    {requesting ? 'Sending Request...' : 'Request a Retake'}
                  </button>
                </div>
              )}

              <div className="mt-12 pt-8 border-t border-slate-100">
                <button
                  onClick={() => router.push('/dashboard/student/quizzes')}
                  className="text-slate-500 hover:text-slate-800 font-medium transition-colors"
                >
                  Return to Quizzes
                </button>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  if (submitted && score) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <div className="container mx-auto px-4 py-20 flex justify-center">
            <div className="bg-white rounded-3xl shadow-2xl overflow-hidden max-w-2xl w-full">
              <div className="bg-gradient-to-r from-green-500 to-emerald-600 p-12 text-center text-white relative">
                <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                <div className="relative z-10">
                  <span className="text-6xl mb-4 block">🎉</span>
                  <h1 className="text-4xl font-bold mb-2">Quiz Completed!</h1>
                  <p className="text-green-100 text-lg">Great job on finishing the quiz.</p>
                </div>
              </div>

              <div className="p-8 md:p-12">
                <div className="grid grid-cols-2 gap-6 mb-8">
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Total Score</p>
                    <p className="text-4xl font-bold text-slate-900">{score.totalScore}<span className="text-xl text-slate-400">/{score.totalMarks}</span></p>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center">
                    <p className="text-slate-500 text-sm font-semibold uppercase tracking-wider mb-2">Percentage</p>
                    <p className={`text-4xl font-bold ${Number(score.percentage) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                      {Number(score.percentage).toFixed(1)}%
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <button
                    onClick={() => {
                      // Robust check for Smart Practice context
                      if (isPractice || (quiz && quiz.title && quiz.title.startsWith('Smart Practice'))) {
                        router.push('/dashboard/student/smart-practice');
                      } else {
                        router.push('/dashboard/student/quizzes');
                      }
                    }}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 px-6 rounded-xl transition-all shadow-lg hover:shadow-xl"
                  >
                    Back to Dashboard
                  </button>
                  {/* Optional: Add review button if allowed by settings */}
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute >
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-slate-50">
          <Navbar />
          <div className="container mx-auto px-4 pt-24 pb-8 text-center text-slate-500">
            Quiz content unavailable.
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  const currentQ = questions[currentQuestion];

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-slate-50 font-sans overflow-x-hidden">
        <Navbar />

        {/* Main Header / Progress Area */}
        {/* Main Header / Progress Area */}
        <div className="sticky top-16 z-30 transition-all pt-2">
          <div className="container mx-auto px-4 max-w-6xl">
            <div className="bg-white/90 backdrop-blur-xl border border-slate-200/60 shadow-md shadow-slate-200/40 rounded-xl p-3 md:p-4 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex-1 min-w-0 mr-4">
                  <h1 className="text-lg font-bold text-slate-900 truncate tracking-tight">{quiz.title}</h1>
                  <div className="flex items-center gap-3 mt-0.5 text-xs font-medium text-slate-500">
                    <span className="bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                      Q {currentQuestion + 1} <span className="text-slate-400">/</span> {questions.length}
                    </span>
                  </div>
                </div>

                {timeLeft !== null && (
                  <div className={`shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold border transition-colors ${timeLeft < 60
                    ? 'bg-red-50 border-red-100 text-red-600 animate-pulse'
                    : 'bg-indigo-50 border-indigo-100 text-indigo-700'
                    }`}>
                    <span>⏱️</span>
                    <span>{formatTime(timeLeft)}</span>
                  </div>
                )}
              </div>

              {/* Enhanced Progress Bar */}
              <div className="relative pt-1">
                <div className="flex mb-1.5 items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Completed
                  </span>
                  <div className="text-[10px] font-bold text-indigo-600">
                    {Math.round((Object.keys(answers).length / questions.length) * 100)}%
                  </div>
                </div>
                <div className="overflow-hidden h-2 mb-1 text-xs flex rounded-full bg-slate-100 border border-slate-100">
                  <div
                    style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                    className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-gradient-to-r from-indigo-500 to-violet-600 transition-all duration-700 ease-out"
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

            {/* Left Column: Question & Options */}
            <div className="lg:col-span-8 space-y-6">
              <div className="bg-white rounded-3xl shadow-md border border-slate-100 overflow-hidden">
                <div className="p-6 md:p-8">
                  <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-6 mb-8">
                    <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-relaxed max-w-3xl break-words">
                      {currentQ.question_text}
                    </h2>

                    {/* Integrated AI Helper Button Removed */}
                  </div>

                  <div className="mt-8 space-y-4">
                    {currentQ.options && (() => {
                      let normalizedOpts: [string, string][] = [];
                      if (Array.isArray(currentQ.options)) {
                        normalizedOpts = (currentQ.options as any[]).map((opt, idx) => [String.fromCharCode(65 + idx), String(opt)]);
                      } else if (typeof currentQ.options === 'object') {
                        normalizedOpts = Object.entries(currentQ.options).map(([k, v]) => [k, String(v)]);
                      }

                      return normalizedOpts.map(([key, value]) => (
                        <label
                          key={key}
                          className={`group relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ease-out ${answers[currentQ._id || currentQ.id] === key
                            ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50 translate-x-2'
                            : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 hover:translate-x-1'
                            }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQ._id || currentQ.id}`}
                            value={key}
                            checked={answers[currentQ._id || currentQ.id] === key}
                            onChange={(e) => handleAnswerChange(currentQ._id || currentQ.id!, e.target.value)}
                            className="sr-only"
                          />

                          {/* Option Letter Bubble */}
                          <div className={`w-10 h-10 rounded-xl border-2 flex items-center justify-center mr-5 transition-all duration-300 shadow-sm ${answers[currentQ._id || currentQ.id] === key
                            ? 'border-indigo-600 bg-indigo-600 text-white rotate-[-3deg] scale-110'
                            : 'border-slate-200 bg-white text-slate-500 group-hover:border-indigo-300 group-hover:text-indigo-600'
                            }`}>
                            <span className="text-base font-bold uppercase">{key}</span>
                          </div>

                          <span className={`text-lg font-medium transition-colors ${answers[currentQ._id || currentQ.id] === key ? 'text-indigo-900' : 'text-slate-700'
                            }`}>
                            {value}
                          </span>

                          {/* Checkmark Indicator */}
                          {answers[currentQ._id || currentQ.id] === key && (
                            <div className="absolute right-5 text-indigo-600 animate-in fade-in zoom-in duration-300">
                              <div className="bg-indigo-600 text-white rounded-full p-1">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                              </div>
                            </div>
                          )}
                        </label>
                      ));
                    })()}

                    {currentQ.question_type === 'true_false' && (
                      ['True', 'False'].map((option) => (
                        <label
                          key={option}
                          className={`group relative flex items-center p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ease-out ${answers[currentQ._id || currentQ.id] === option
                            ? 'border-indigo-600 bg-indigo-50 shadow-md ring-4 ring-indigo-50 translate-x-2'
                            : 'border-slate-100 hover:border-indigo-200 hover:bg-slate-50 hover:translate-x-1'
                            }`}
                        >
                          <input
                            type="radio"
                            name={`question-${currentQ._id || currentQ.id}`}
                            value={option}
                            checked={answers[currentQ._id || currentQ.id] === option}
                            onChange={(e) => handleAnswerChange(currentQ._id || currentQ.id!, e.target.value)}
                            className="sr-only"
                          />
                          <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center mr-5 transition-all duration-300 ${answers[currentQ._id || currentQ.id] === option
                            ? 'border-indigo-600 bg-indigo-600 scale-110'
                            : 'border-slate-200 bg-white group-hover:border-indigo-300'
                            }`}>
                            {answers[currentQ._id || currentQ.id] === option && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                          </div>
                          <span className="text-lg font-medium text-slate-700">{option}</span>
                        </label>
                      ))
                    )}

                    {currentQ.question_type === 'short_answer' && (
                      <div className="relative group">
                        <textarea
                          value={answers[currentQ._id || currentQ.id] || ''}
                          onChange={(e) => handleAnswerChange(currentQ._id || currentQ.id!, e.target.value)}
                          className="w-full p-6 text-lg bg-slate-50 border-2 border-slate-200 rounded-2xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 outline-none transition-all min-h-[160px] resize-y text-slate-800 placeholder:text-slate-400 font-medium"
                          placeholder="Type your answer here..."
                        />
                        <div className="absolute bottom-4 right-4 text-xs font-bold text-slate-400 uppercase tracking-widest pointer-events-none group-focus-within:text-indigo-400">
                          Text Answer
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Navigation Bar */}
                <div className="bg-slate-50/50 backdrop-blur-sm px-8 py-6 border-t border-slate-100 flex items-center justify-between">
                  <button
                    onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))}
                    disabled={currentQuestion === 0}
                    className="group flex items-center gap-2 text-slate-500 hover:text-slate-800 font-bold px-6 py-3 rounded-xl hover:bg-white hover:shadow-sm transition-all disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:shadow-none"
                  >
                    <span className="group-hover:-translate-x-1 transition-transform">←</span> Previous
                  </button>

                  {currentQuestion < questions.length - 1 ? (
                    <button
                      onClick={() => setCurrentQuestion(prev => prev + 1)}
                      className="bg-slate-900 text-white font-bold px-8 py-3 rounded-xl hover:bg-slate-800 shadow-md hover:shadow-lg hover:-translate-y-1 transition-all flex items-center gap-2 group"
                    >
                      Next <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmit}
                      className="bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold px-10 py-3 rounded-xl hover:shadow-lg hover:shadow-green-200 hover:-translate-y-1 transition-all flex items-center gap-2"
                    >
                      Submit Quiz <span>✨</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: AI Tutor Panel (Desktop) */}
            <div className="hidden lg:block lg:col-span-4 space-y-6 sticky top-48 h-fit z-20 self-start">
              <div className="bg-indigo-900 rounded-3xl p-6 text-white text-center shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-white/10 rounded-full blur-2xl"></div>
                <div className="relative z-10">
                  <h3 className="text-xl font-bold mb-2">Need a Hint?</h3>
                  <p className="text-indigo-200 mb-6 text-sm">
                    Stuck on a tough question? Our AI Tutor can explain concepts without giving away the answer.
                  </p>
                  <button
                    onClick={() => setTutorOpen(true)}
                    className="w-full bg-white text-indigo-900 font-bold py-3 rounded-xl hover:bg-indigo-50 transition-colors shadow-lg"
                  >
                    Open AI Assistant
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6">
                <h4 className="font-bold text-slate-800 mb-4">Question Map</h4>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentQuestion(idx)}
                      className={`aspect-square rounded-lg flex items-center justify-center text-sm font-bold transition-all ${currentQuestion === idx
                        ? 'bg-indigo-600 text-white shadow-md scale-110 ring-2 ring-indigo-200'
                        : answers[q._id || q.id!]
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-slate-100 text-slate-400 hover:bg-slate-200'
                        }`}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile-only AI Tutor trigger is handled by main button in header/question */}
          <AiTutor
            hideLauncher
            noLauncher={true}
            launcherLabel="Help me understand"
            open={tutorOpen}
            onOpenChange={setTutorOpen}
            context={[
              `Quiz: ${quiz.title}`,
              currentQ.subject ? `Subject: ${currentQ.subject}` : '',
              // Add subtle context about strict 5 bullet points if needed, but controller handles it
              `Question: ${currentQ.question_text}`,
              // Add options to context so AI can explain why others are wrong if asked (carefully)
              currentQ.options ? `Options: ${JSON.stringify(currentQ.options)}` : ''
            ].filter(Boolean).join('\n')}
          />
        </div>
      </div>
    </ProtectedRoute>
  );
}

