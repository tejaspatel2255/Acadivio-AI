'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Class } from '@/lib/types';
import { getClasses, createClass, updateClass } from '@/lib/api';
import Link from 'next/link';
import { Users, Plus, Edit, Trash2, UserPlus } from 'lucide-react';

export default function TeacherClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    subject: ''
  });

  useEffect(() => {
    if (user && user.role === 'teacher') {
      loadClasses();
    }
  }, [user]);

  const loadClasses = async () => {
    try {
      const data = await getClasses();
      // Filter classes by current teacher
      const teacherClasses = data.filter((c: Class) => c.teacher_id === user!.id);
      setClasses(teacherClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const classData = {
        ...formData,
        teacher_id: user!.id
      };

      const newClass = await createClass(classData);
      setClasses([...classes, newClass]);
      setFormData({ name: '', description: '', subject: '' });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating class:', error);
    }
  };

  const deleteClass = async (classId: string) => {
    if (!confirm('Are you sure you want to delete this class?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/classes/${classId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        setClasses(classes.filter(c => c.id !== classId));
      }
    } catch (error) {
      console.error('Error deleting class:', error);
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
              <Users className="w-8 h-8 mr-3" />
              My Classes
            </h1>
            <button
              onClick={() => setShowCreateForm(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Class
            </button>
          </div>

          {/* Create Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">Create New Class</h2>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Data Structures 101"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="e.g., Computer Science"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Brief description of the class..."
                  />
                </div>
                <div className="md:col-span-2 flex gap-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    Create Class
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Classes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {classes.map((classItem) => (
              <div key={classItem.id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{classItem.name}</h3>
                    <p className="text-sm text-blue-600 mb-2">{classItem.subject}</p>
                    {classItem.description && (
                      <p className="text-sm text-gray-600">{classItem.description}</p>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingId(classItem.id || (classItem as any)._id);
                        setFormData({
                          name: classItem.name,
                          description: classItem.description || '',
                          subject: (classItem as any).subject || ''
                        });
                        setShowCreateForm(true);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteClass(classItem.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Students: 0</span>
                    <button className="text-green-600 hover:text-green-800 text-sm flex items-center">
                      <UserPlus className="w-4 h-4 mr-1" />
                      Enroll Students
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <Link
                      href={`/dashboard/teacher/classes/${classItem.id}`}
                      className="flex-1 bg-blue-50 text-blue-700 py-2 px-3 rounded text-sm hover:bg-blue-100 text-center"
                    >
                      View Details
                    </Link>
                    <Link
                      href={`/dashboard/teacher/classes/${classItem.id}`}
                      className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded text-sm hover:bg-green-100 text-center"
                    >
                      Manage
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {classes.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No classes yet</h3>
              <p className="text-gray-500 mb-4">Create your first class to start teaching students.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Create Your First Class
              </button>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}