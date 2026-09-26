'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Challenge } from '@/lib/types';
import { getChallenge, submitChallenge, getStudentProgress } from '@/lib/api';
import Link from 'next/link';

export default function ChallengeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [challenge, setChallenge] = useState<Challenge | null>(null);
  const [submission, setSubmission] = useState<any>(null);
  const [submissionText, setSubmissionText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && params.id) {
      loadChallenge();
    }
  }, [user, params.id]);

  const loadChallenge = async () => {
    try {
      const challengeData = await getChallenge(params.id as string);
      if (challengeData) {
        setChallenge(challengeData);
        // Check for submission included in response
        if (challengeData.my_submission) {
          setSubmission(challengeData.my_submission);
          setSubmissionText(challengeData.my_submission.submission_text || '');
        }
      }
    } catch (error) {
      console.error('Error loading challenge:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!submissionText.trim()) {
      alert('Please provide a submission description');
      return;
    }

    setSubmitting(true);
    try {
      await submitChallenge(params.id as string, {
        submission_text: submissionText,
      });

      alert('Challenge submitted successfully! Points will be awarded after review.');
      router.push('/dashboard/student/challenges');
    } catch (error: any) {
      console.error('Error submitting challenge:', error);
      alert('Failed to submit challenge: ' + (error.message || 'Unknown error'));
    } finally {
      setSubmitting(false);
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

  if (!challenge) {
    return (
      <ProtectedRoute allowedRoles={['student']}>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <div className="container mx-auto px-4 pt-24 pb-8 text-center bg-white rounded-lg shadow-sm p-12 max-w-2xl mt-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Challenge Not Found</h2>
            <p className="text-gray-500 mb-6">The challenge you are looking for might have been removed or does not exist.</p>
            <Link
              href="/dashboard/student/challenges"
              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Challenges
            </Link>
          </div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 pt-32 pb-8 max-w-4xl">
          <Link
            href="/dashboard/student/challenges"
            className="inline-flex items-center text-gray-600 hover:text-green-600 font-medium mb-6 transition-colors"
          >
            ← Back to Challenges
          </Link>

          <div className="bg-white rounded-lg shadow-md p-8">
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded">
                  {challenge.category}
                </span>
                <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded font-semibold">
                  +{challenge.points_reward} points
                </span>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-4">{challenge.title}</h1>
            </div>

            <div className="prose max-w-none mb-8">
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                {challenge.description}
              </p>
            </div>

            {submission && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Your Submission</h3>
                <p className="text-blue-800 mb-2">{submission.submission_text}</p>
                <div className="text-sm text-blue-700 space-y-1">
                  <p>
                    Status: <span className="font-semibold">
                      {submission.status === 'approved' ? '✓ Approved' :
                        submission.status === 'rejected' ? '✗ Rejected' :
                          '⏳ Pending Review'}
                    </span>
                  </p>

                  {submission.status === 'approved' && (
                    <>
                      {submission.highest_points > 0 && (
                        <p className="text-green-700 font-semibold">
                          Highest Points Earned: +{submission.highest_points}
                        </p>
                      )}

                      <div className="mt-4 pt-4 border-t border-blue-200">
                        {submission.retake_status === 'none' && (
                          <button
                            onClick={async () => {
                              try {
                                const { requestChallengeRetake } = await import('@/lib/api');
                                await requestChallengeRetake(params.id as string);
                                alert('Retake requested successfully!');
                                loadChallenge();
                              } catch (error) {
                                alert('Failed to request retake');
                              }
                            }}
                            className="text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                          >
                            Request Retake
                          </button>
                        )}
                        {submission.retake_status === 'pending' && (
                          <span className="text-yellow-600 font-medium bg-yellow-50 px-3 py-1 rounded border border-yellow-200">
                            ⏳ Retake Request Pending Approval
                          </span>
                        )}
                        {submission.retake_status === 'approved' && (
                          <div className="text-green-600 font-medium mb-2">
                            ✓ Retake Approved - You can submit again below
                          </div>
                        )}
                        {submission.retake_status === 'rejected' && (
                          <span className="text-red-600 font-medium">
                            ✗ Retake Request Rejected
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {(!submission || submission.status === 'rejected' || submission.retake_status === 'approved') && (
              <div className="mb-6">
                <label htmlFor="submission" className="block text-sm font-medium text-gray-700 mb-2">
                  Describe how you completed this challenge *
                </label>
                <textarea
                  id="submission"
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  rows={8}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Describe your solution, include documentation or links if possible, and explain your learning outcomes..."
                />
                <p className="text-sm text-gray-500 mt-2">
                  Be detailed! Include what you did, when, and the impact it had.
                </p>
              </div>
            )}

            {(!submission || submission.status === 'rejected' || submission.retake_status === 'approved') && (
              <button
                onClick={handleSubmit}
                disabled={submitting || !submissionText.trim()}
                className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Submitting...' : 'Submit Challenge'}
              </button>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}

