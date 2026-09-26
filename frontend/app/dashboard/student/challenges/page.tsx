'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { Challenge } from '@/lib/types';
import { getChallenges, getStudentProgress } from '@/lib/api';
import Link from 'next/link';

export default function ChallengesPage() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [submissions, setSubmissions] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadChallenges();
      loadSubmissions();
    }
  }, [user]);

  const loadChallenges = async () => {
    try {
      const challengesData = await getChallenges();
      if (challengesData) {
        setChallenges(challengesData);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSubmissions = async () => {
    try {
      const progress = await getStudentProgress();
      if (progress) {
        // Map challenge submissions from progress
        const submissionsMap: Record<string, any> = {};
        progress.forEach((item: any) => {
          if (item.challenge_id && item.challenge_submission) {
            submissionsMap[item.challenge_id] = item.challenge_submission;
          }
        });
        setSubmissions(submissionsMap);
      }
    } catch (error) {
      console.error('Error loading submissions:', error);
    }
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Academic Challenges</h1>
            <Link
              href="/dashboard/student"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : challenges.length === 0 ? (
            <div className="bg-white rounded-lg shadow-md p-12 text-center">
              <p className="text-gray-500 text-lg">No challenges available yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {challenges.map((challenge) => {
                const submission = submissions[challenge.id];
                const isSubmitted = submission && submission.status !== 'rejected';
                return (
                  <div key={challenge.id || challenge._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-xl transition-shadow">
                    <div className="flex items-start justify-between mb-4">
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded">
                        {challenge.category}
                      </span>
                      <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded font-semibold">
                        +{challenge.points_reward} pts
                      </span>
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 mb-2">{challenge.title}</h3>
                    <p className="text-gray-600 text-sm mb-4 line-clamp-3">{challenge.description}</p>
                    {isSubmitted && (
                      <div className="mb-4 p-2 bg-blue-50 rounded">
                        <p className="text-xs text-blue-800">
                          Status: {submission.status === 'approved' ? '✓ Approved' : '⏳ Pending Review'}
                        </p>
                      </div>
                    )}
                    <Link
                      href={`/dashboard/student/challenges/${challenge.id || challenge._id}`}
                      className="block text-center bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
                    >
                      {isSubmitted ? 'View Submission' : 'Take Challenge'}
                    </Link>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

