'use client';

import { useEffect, useState, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Challenge } from '@/lib/types';
import { getChallenges, createChallenge } from '@/lib/api';
import { Target, Plus, Edit, Trash2, Award } from 'lucide-react';

import { useSearchParams } from 'next/navigation';

function TeacherChallengesContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    instructions: '',
    points_reward: 50,
    academic_impact_value: 5,
    difficulty_level: 'beginner',
    category: 'academic'
  });

  const [editingId, setEditingId] = useState<string | null>(null);


  // View mode state
  const [viewMode, setViewMode] = useState<'grading' | 'analytics'>('grading');
  const [selectedChallenge, setSelectedChallenge] = useState<Challenge | null>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  useEffect(() => {
    if (user && user.role === 'teacher') {
      loadChallenges();
    }
  }, [user]);

  const loadChallenges = async () => {
    try {
      const data = await getChallenges();
      // The API now filters by teacher automatically
      const loadedChallenges = data || [];
      setChallenges(loadedChallenges);

      // Check for deep link ID
      const challengeId = searchParams.get('id');
      if (challengeId) {
        const challengeToOpen = loadedChallenges.find((c: Challenge) => (c.id === challengeId || (c as any)._id === challengeId));
        if (challengeToOpen) {
          handleViewSubmissions(challengeToOpen);
        }
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (challenge: Challenge) => {
    setFormData({
      title: challenge.title,
      description: challenge.description,
      instructions: challenge.instructions || '', // Handle potential missing field
      points_reward: challenge.points_reward,
      academic_impact_value: (challenge as any).academic_impact_value || 5,
      difficulty_level: challenge.difficulty_level || 'beginner',
      category: challenge.category
    });
    setEditingId(challenge.id || challenge._id || null);
    setShowCreateForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancel = () => {
    setShowCreateForm(false);
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      instructions: '',
      points_reward: 50,
      academic_impact_value: 5,
      difficulty_level: 'beginner',
      category: 'academic'
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const challengeData = {
        ...formData,
        teacher_id: user!.id,
        points_reward: parseInt(formData.points_reward.toString()),
        academic_impact_value: parseInt(formData.academic_impact_value.toString())
      };

      if (editingId) {
        // Update existing challenge
        const { updateChallenge } = await import('@/lib/api');
        const updatedChallenge = await updateChallenge(editingId, challengeData);
        setChallenges(challenges.map(c => (c.id === editingId || c._id === editingId) ? updatedChallenge : c));
        alert('Challenge updated successfully');
      } else {
        // Create new challenge
        const newChallenge = await createChallenge(challengeData);
        setChallenges([...challenges, newChallenge]);
        alert('Challenge created successfully');
      }

      handleCancel();
    } catch (error) {
      console.error('Error saving challenge:', error);
      alert('Failed to save challenge');
    }
  };

  const deleteChallenge = async (challengeId: string) => {
    if (!confirm('Are you sure you want to delete this challenge?')) return;

    try {
      const { deleteChallenge: apiDeleteChallenge } = await import('@/lib/api');
      await apiDeleteChallenge(challengeId);
      setChallenges(challenges.filter(c => (c.id || c._id) !== challengeId));
    } catch (error) {
      console.error('Error deleting challenge:', error);
      alert('Failed to delete challenge');
    }
  };

  const handleViewSubmissions = async (challenge: Challenge) => {
    setSelectedChallenge(challenge);
    setSubmissionsLoading(true);
    try {
      const { getChallengeSubmissions } = await import('@/lib/api');
      const allSubmissions = await getChallengeSubmissions();
      // Filter for this challenge
      const challengeSubmissions = allSubmissions.filter((s: any) =>
        (s.challenge_id._id === challenge.id) || (s.challenge_id._id === challenge._id) ||
        (s.challenge_id === challenge.id) || (s.challenge_id === challenge._id)
      );
      setSubmissions(challengeSubmissions);
      setViewMode('grading');
      return challengeSubmissions;
    } catch (error) {
      console.error('Error loading submissions:', error);
      alert('Failed to load submissions');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleViewAnalytics = async (challenge: Challenge) => {
    // For now, reuse the submissions view but we could add a mode flag
    // The user wants "after grading, move to analytics". 
    // Let's just open the modal which now shows graded status.
    // In a full implementation, we would show charts here.
    setSelectedChallenge(challenge);
    setViewMode('analytics');

    // We can reuse the same loading logic but set mode to analytics
    // Note: handleViewSubmissions sets mode to grading, so we need to call the API directly or refactor
    // Let's refactor slightly to avoid double state update, or just setting mode after call?
    // Setting mode after call is safer if we just copy the fetch logic properly or extracted it.
    // For simplicity, let's just copy the fetch logic here to ensure correct mode.

    setSubmissionsLoading(true);
    try {
      const { getChallengeSubmissions } = await import('@/lib/api');
      const allSubmissions = await getChallengeSubmissions();
      const challengeSubmissions = allSubmissions.filter((s: any) =>
        (s.challenge_id._id === challenge.id) || (s.challenge_id._id === challenge._id) ||
        (s.challenge_id === challenge.id) || (s.challenge_id === challenge._id)
      );
      setSubmissions(challengeSubmissions);
    } catch (error) {
      console.error('Error loading submissions:', error);
      alert('Failed to load data');
    } finally {
      setSubmissionsLoading(false);
    }
  };

  const handleGrade = async (submissionId: string, status: string, points: number) => {
    try {
      const { gradeChallengeSubmission } = await import('@/lib/api');
      const updatedSubmission = await gradeChallengeSubmission(submissionId, { status, points });
      setSubmissions(submissions.map(s => s._id === submissionId ? updatedSubmission : s));
    } catch (error) {
      console.error('Error grading submission:', error);
      alert('Failed to grade submission');
    }
  };

  const handleRetake = async (submissionId: string, status: 'approved' | 'rejected') => {
    try {
      const { handleRetakeRequest } = await import('@/lib/api');
      const updatedSubmission = await handleRetakeRequest(submissionId, status);
      setSubmissions(submissions.map(s => s._id === submissionId ? updatedSubmission : s));
    } catch (error) {
      console.error('Error handling retake:', error);
      alert('Failed to handle retake request');
    }
  };

  const getDifficultyColor = (level: string) => {
    switch (level) {
      case 'beginner': return 'bg-green-100 text-green-800';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800';
      case 'advanced': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'quiz': return '📝';
      case 'assignment': return '📋';
      case 'project': return '🗂️';
      case 'research': return '🔬';
      case 'coding': return '💻';
      default: return '🎯';
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
              <Target className="w-8 h-8 mr-3" />
              Academic Challenges
            </h1>
            {!showCreateForm && (
              <button
                onClick={() => {
                  setEditingId(null);
                  setFormData({
                    title: '',
                    description: '',
                    instructions: '',
                    points_reward: 50,
                    academic_impact_value: 5,
                    difficulty_level: 'beginner',
                    category: 'academic'
                  });
                  setShowCreateForm(true);
                }}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Challenge
              </button>
            )}
          </div>

          {/* Create/Edit Form */}
          {showCreateForm && (
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-semibold mb-4">
                {editingId ? 'Edit Challenge' : 'Create New Challenge'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Challenge Title</label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="e.g., Data Structures Assignment Challenge"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Points Reward</label>
                    <input
                      type="number"
                      required
                      min="10"
                      max="500"
                      value={formData.points_reward}
                      onChange={(e) => setFormData({ ...formData, points_reward: parseInt(e.target.value || '0') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Academic Impact Value</label>
                    <input
                      type="number"
                      required
                      min="1"
                      max="100"
                      value={formData.academic_impact_value}
                      onChange={(e) => setFormData({ ...formData, academic_impact_value: parseInt(e.target.value || '0') })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Difficulty Level</label>
                    <select
                      value={formData.difficulty_level}
                      onChange={(e) => setFormData({ ...formData, difficulty_level: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    >
                      <option value="beginner">Beginner</option>
                      <option value="intermediate">Intermediate</option>
                      <option value="advanced">Advanced</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="academic">Academic</option>
                      <option value="quiz">Quiz</option>
                      <option value="assignment">Assignment</option>
                      <option value="project">Project</option>
                      <option value="research">Research</option>
                      <option value="coding">Coding</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={3}
                    placeholder="Brief description of the challenge..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Instructions</label>
                  <textarea
                    required
                    value={formData.instructions}
                    onChange={(e) => setFormData({ ...formData, instructions: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    rows={4}
                    placeholder="Detailed instructions for completing the challenge..."
                  />
                </div>

                <div className="flex gap-4">
                  <button
                    type="submit"
                    className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700"
                  >
                    {editingId ? 'Update Challenge' : 'Create Challenge'}
                  </button>
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="bg-gray-300 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Challenges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {challenges.map((challenge) => (
              <div key={`challenge-${challenge.id || challenge._id}`} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="text-2xl mt-1">{getCategoryIcon(challenge.category)}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-gray-900">{challenge.title}</h3>
                        <span className={`px-2 py-0.5 text-xs rounded-full border ${challenge.status === 'approved' ? 'bg-green-50 text-green-700 border-green-200' :
                            challenge.status === 'rejected' ? 'bg-red-50 text-red-700 border-red-200' :
                              'bg-yellow-50 text-yellow-700 border-yellow-200'
                          }`}>
                          {challenge.status ? challenge.status.toUpperCase() : 'PENDING'}
                        </span>
                      </div>

                      {challenge.status === 'rejected' && challenge.admin_feedback && (
                        <div className="my-2 p-2 bg-red-50 border border-red-100 rounded text-xs text-red-800">
                          <span className="font-bold">Changes Needed:</span> {challenge.admin_feedback}
                        </div>
                      )}

                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className={`inline-block px-2 py-1 text-xs rounded-full ${getDifficultyColor(challenge.difficulty_level || 'beginner')}`}>
                          {challenge.difficulty_level || 'beginner'}
                        </span>
                        <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                          +{challenge.points_reward} pts
                        </span>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          🎯 Impact: {(challenge as any).academic_impact_value || 5}
                        </span>
                        {challenge.class_number && (
                          <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded-full">
                            Class {challenge.class_number}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(challenge)}
                      className="text-blue-600 hover:text-blue-800"
                      title="Edit Challenge"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => deleteChallenge(challenge.id || challenge._id || '')}
                      className="text-red-600 hover:text-red-800"
                      title="Delete Challenge"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <p className="text-sm text-gray-600 mb-4">{challenge.description}</p>

                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-gray-600">Submissions: {(challenge as any).stats?.submissions || 0}</span>
                    <span className="text-sm text-gray-600">Completion Rate: {(challenge as any).stats?.completionRate || 0}%</span>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleViewSubmissions(challenge)}
                      className="flex-1 bg-blue-50 text-blue-700 py-2 px-3 rounded text-sm hover:bg-blue-100"
                    >
                      View Submissions
                    </button>
                    <button
                      onClick={() => handleViewAnalytics(challenge)}
                      className="flex-1 bg-green-50 text-green-700 py-2 px-3 rounded text-sm hover:bg-green-100"
                    >
                      Analytics
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>


          {challenges.length === 0 && (
            <div className="text-center py-12">
              <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No challenges yet</h3>
              <p className="text-gray-500 mb-4">Create academic challenges to engage your students.</p>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700"
              >
                Create Your First Challenge
              </button>
            </div>
          )}
        </div>

        {/* Submissions Modal */}
        {selectedChallenge && (
          <div className="fixed inset-0 bg-emerald-900/20 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-emerald-100">
              <div className="p-6 border-b border-emerald-100 sticky top-0 bg-white/95 backdrop-blur z-10 flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-100 rounded-lg">
                    {viewMode === 'analytics' ? <Award className="w-6 h-6 text-emerald-600" /> : <Target className="w-6 h-6 text-emerald-600" />}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">{selectedChallenge.title}</h2>
                    <p className="text-sm text-emerald-600 font-medium">{viewMode === 'analytics' ? 'Challenge Analytics & History' : 'Pending Submissions for Grading'}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedChallenge(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="p-6">
                {submissionsLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-green-500 mx-auto"></div>
                  </div>
                ) : submissions.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    No submissions yet for this challenge.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {submissions
                      .filter(sub => {
                        if (viewMode === 'analytics') return true;
                        // In grading mode, only show pending status or retake pending
                        return sub.status === 'pending' || sub.retake_status === 'pending';
                      })
                      .length === 0 && viewMode === 'grading' ? (
                      <div className="text-center py-12 text-gray-500">
                        No pending submissions to grade. Check Analytics for history.
                      </div>
                    ) : (
                      submissions
                        .filter(sub => {
                          if (viewMode === 'analytics') return true;
                          return sub.status === 'pending' || sub.retake_status === 'pending';
                        })
                        .map((sub: any) => (
                          <div key={sub._id} className="border border-emerald-100 rounded-xl p-5 bg-gradient-to-br from-white to-emerald-50/30 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="font-semibold text-gray-900">{sub.student_id?.full_name || 'Unknown Student'}</h3>
                                <p className="text-sm text-gray-500">{sub.student_id?.email}</p>
                                <p className="text-xs text-gray-400 mt-1">
                                  Submitted: {new Date(sub.submitted_at).toLocaleDateString()}
                                </p>
                              </div>
                              <div className="text-right">
                                <div className={`px-2 py-1 rounded text-xs font-semibold inline-block mb-1 ${sub.status === 'approved' ? 'bg-green-100 text-green-800' :
                                  sub.status === 'rejected' ? 'bg-red-100 text-red-800' :
                                    'bg-yellow-100 text-yellow-800'
                                  }`}>
                                  {sub.status.toUpperCase()}
                                </div>
                                {sub.highest_points > 0 && <div className="text-xs text-green-600 font-bold">High Score: {sub.highest_points}</div>}
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border mb-4 text-sm text-gray-700 whitespace-pre-wrap break-words max-h-60 overflow-y-auto">
                              {sub.submission_text}
                            </div>

                            {/* Grading Controls */}
                            {sub.status === 'pending' && (
                              <div className="border-t pt-4 mt-4">
                                <h4 className="text-sm font-semibold mb-2">Grade Submission</h4>
                                <div className="flex flex-wrap gap-2">
                                  <button
                                    onClick={() => handleGrade(sub._id, 'approved', selectedChallenge.points_reward)}
                                    className="bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 transition"
                                  >
                                    Approve ({selectedChallenge.points_reward} pts)
                                  </button>
                                  <button
                                    onClick={() => {
                                      const points = prompt('Enter points to award:', selectedChallenge.points_reward.toString());
                                      if (points !== null) {
                                        const parsedPoints = parseInt(points);
                                        if (!isNaN(parsedPoints)) {
                                          handleGrade(sub._id, 'approved', parsedPoints);
                                        } else {
                                          alert("Please enter a valid number");
                                        }
                                      }
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700 transition"
                                  >
                                    Approve (Custom)
                                  </button>
                                  <button
                                    onClick={() => handleGrade(sub._id, 'rejected', 0)}
                                    className="bg-red-600 text-white px-4 py-2 rounded text-sm hover:bg-red-700 transition"
                                  >
                                    Reject
                                  </button>
                                </div>
                              </div>
                            )}

                            {/* Retake Request Controls */}
                            {sub.retake_status === 'pending' && (
                              <div className="border-t border-yellow-200 bg-yellow-50 p-3 mt-4 rounded">
                                <div className="flex justify-between items-center">
                                  <span className="text-sm font-semibold text-yellow-800">⚠️ Retake Requested</span>
                                  <div className="flex gap-2">
                                    <button
                                      onClick={() => handleRetake(sub._id, 'approved')}
                                      className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700"
                                    >
                                      Approve Retake
                                    </button>
                                    <button
                                      onClick={() => handleRetake(sub._id, 'rejected')}
                                      className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700"
                                    >
                                      Reject Request
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        ))
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}

export default function TeacherChallenges() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    }>
      <TeacherChallengesContent />
    </Suspense>
  );
}