'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/contexts/AuthContext';
import { getLeaderboard } from '@/lib/api';
import { useSocket } from '@/components/SocketProvider';
import Link from 'next/link';
import { Trophy, Medal, Award } from 'lucide-react';

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const { socket } = useSocket();

  useEffect(() => {
    if (user) {
      loadLeaderboard();
    }
  }, [user]);

  // Listen for real-time leaderboard updates
  useEffect(() => {
    if (!socket) return;

    const handleUpdate = () => {
      console.log('Leaderboard update received, refreshing...');
      loadLeaderboard();
    };

    socket.on('leaderboard_update', handleUpdate);

    return () => {
      socket.off('leaderboard_update', handleUpdate);
    };
  }, [socket]);

  const loadLeaderboard = async () => {
    try {
      const data = await getLeaderboard(100);
      if (data) {
        setLeaderboard(data);

        // Find user's rank
        const rank = data.findIndex((s: any) => s.student_id === user!.id || s.student_id?._id === user!.id) + 1;
        setUserRank(rank > 0 ? rank : null);
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />;
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />;
    if (rank === 3) return <Award className="w-6 h-6 text-orange-500" />;
    return <span className="text-gray-600 font-semibold">#{rank}</span>;
  };

  return (
    <ProtectedRoute allowedRoles={['student']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Global Leaderboard</h1>
            <Link
              href="/dashboard/student"
              className="text-green-600 hover:text-green-700 font-medium"
            >
              ← Back to Dashboard
            </Link>
          </div>

          {userRank && (
            <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg shadow-md p-6 mb-8 text-white">
              <h2 className="text-xl font-semibold mb-2">Your Rank</h2>
              <p className="text-3xl font-bold">#{userRank}</p>
              <p className="text-sm mt-2 opacity-90">
                {leaderboard.find((s: any) => (s.student_id?._id || s.student_id) === user!.id)?.total_points || 0} points
              </p>
            </div>
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500 mx-auto"></div>
            </div>
          ) : (
            <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white">
                      <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Rank</th>
                      <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Student</th>
                      <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Level</th>
                      <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Total Points</th>
                      <th className="px-6 py-5 text-left text-sm font-bold uppercase tracking-wider">Academic Impact</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {leaderboard.map((entry, index) => {
                      const rank = index + 1;
                      const studentId = entry.student_id?._id || entry.student_id;
                      const isCurrentUser = studentId === user!.id;
                      return (
                        <tr
                          key={`leaderboard-${studentId}-${index}`}
                          className={`transition-colors hover:bg-emerald-50/50 ${isCurrentUser ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''
                            }`}
                        >
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getRankIcon(rank)}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-white font-bold text-lg mr-3 shadow-sm">
                                {(entry.student_id?.full_name || '?').charAt(0)}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900">
                                  {entry.student_id?.full_name || entry.student_id?.email || 'Unknown'}
                                </div>
                                {isCurrentUser && <span className="text-xs text-emerald-600 font-bold">You</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800">
                              Level {entry.current_level || 1}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-lg font-bold text-gray-900">
                              {entry.total_points?.toLocaleString() || 0}
                            </div>
                            <div className="text-xs text-gray-500">points</div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex items-center text-emerald-700 font-medium">
                              {entry.academic_impact_score || 0}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </ProtectedRoute>
  );
}

