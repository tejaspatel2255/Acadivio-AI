'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Lesson } from '@/lib/types';
import { getLessons } from '@/lib/api';
import Link from 'next/link';
import { BookOpen, Plus, Edit, Trash2, Eye, Users } from 'lucide-react';

export default function TeacherLessons() {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && user.role === 'teacher') {
      loadLessons();
    }
  }, [user]);

  const loadLessons = async () => {
    try {
      const data = await getLessons();
      // The API now filters by teacher automatically
      setLessons(data || []);
    } catch (error) {
      console.error('Error loading lessons:', error);
    } finally {
      setLoading(false);
    }
  };

  const deleteLesson = async (lessonId: string) => {
    if (!confirm('Are you sure you want to delete this lesson?')) return;

    try {
      const { deleteLesson: apiDeleteLesson } = await import('@/lib/api');
      await apiDeleteLesson(lessonId);
      setLessons(lessons.filter(l => (l.id || l._id) !== lessonId));
    } catch (error) {
      console.error('Error deleting lesson:', error);
      alert('Failed to delete lesson');
    }
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['teacher']}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['teacher']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900 flex items-center">
              <BookOpen className="w-8 h-8 mr-3" />
              My Lessons
            </h1>
            <Link
              href="/dashboard/teacher/lessons/create"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Lesson
            </Link>
          </div>

          {/* Lessons Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <div key={`lesson-${lesson.id || lesson._id}`} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{lesson.title}</h3>
                      <span className={`px-2 py-0.5 text-xs rounded-full border ${lesson.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                          lesson.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-yellow-50 text-yellow-700 border-yellow-200'
                        }`}>
                        {lesson.status ? lesson.status.toUpperCase() : 'PENDING'}
                      </span>
                    </div>

                    {lesson.status === 'rejected' && lesson.admin_feedback && (
                      <div className="mb-3 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-800">
                        <span className="font-bold">Changes Needed:</span> {lesson.admin_feedback}
                      </div>
                    )}

                    <p className="text-sm text-blue-600 mb-2">{lesson.topic}</p>
                    {lesson.class_number && (
                      <p className="text-sm text-purple-600 mb-2">Class: {lesson.class_number}</p>
                    )}
                    <p className="text-sm text-gray-600">{lesson.content?.substring(0, 100)}...</p>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Link
                      href={`/dashboard/student/lessons/${lesson.id || lesson._id}`}
                      className="text-green-600 hover:text-green-800"
                      title="View Lesson"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <Link
                      href={`/dashboard/teacher/lessons/${lesson.id || lesson._id}`}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Lesson"
                    >
                      <Edit className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => deleteLesson(lesson.id || lesson._id || '')}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Lesson"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600 flex items-center">
                      <Users className="w-4 h-4 mr-1" />
                      Students: {(lesson as any).completionCount || 0}
                    </span>
                    <span className="text-sm text-gray-600">
                      Completions: {(lesson as any).completionCount || 0}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/teacher/lessons/${lesson.id || lesson._id}/analytics`}
                      className="flex-1 bg-blue-50 text-blue-700 py-2 px-3 rounded text-sm hover:bg-blue-100 text-center"
                    >
                      Analytics
                    </Link>
                    <Link
                      href={`/dashboard/teacher/lessons/${lesson.id || lesson._id}`}
                      className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded text-sm hover:bg-green-100 text-center"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {lessons.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No lessons yet</h3>
              <p className="text-gray-500 mb-4">Create your first lesson to start teaching your assigned subjects.</p>
              <Link
                href="/dashboard/teacher/lessons/create"
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 inline-block"
              >
                Create Your First Lesson
              </Link>
            </div>
          )}

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">{lessons.length}</div>
              <div className="text-gray-600">Total Lessons</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">0</div>
              <div className="text-gray-600">Total Views</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {lessons.reduce((acc, curr) => acc + ((curr as any).completionCount || 0), 0)}
              </div>
              <div className="text-gray-600">Total Completions</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">-</div>
              <div className="text-gray-600">Avg Completion</div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}