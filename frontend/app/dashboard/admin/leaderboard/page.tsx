'use client';

import { useEffect, useState } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import Navbar from '@/components/Navbar';
import { Trophy, Medal, Award, Crown, Search, Filter } from 'lucide-react';

export default function GlobalLeaderboard() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [filteredLeaderboard, setFilteredLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [institutionFilter, setInstitutionFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all-time');

  useEffect(() => {
    loadLeaderboard();
  }, [timeFilter]);

  useEffect(() => {
    filterLeaderboard();
  }, [leaderboard, searchTerm, institutionFilter]);

  const loadLeaderboard = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/leaderboard?period=${timeFilter}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setLeaderboard(data);
      } else {
        // Fallback to student leaderboard endpoint
        const fallbackResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/student/leaderboard`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (fallbackResponse.ok) {
          const data = await fallbackResponse.json();
          setLeaderboard(data);
        }
      }
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterLeaderboard = () => {
    let filtered = leaderboard;

    if (searchTerm) {
      filtered = filtered.filter((user: any) =>
        user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (institutionFilter !== 'all') {
      filtered = filtered.filter((user: any) => user.institution_id === institutionFilter);
    }

    setFilteredLeaderboard(filtered);
  };

  const cleanupDuplicates = async () => {
    if (!confirm('This will remove duplicate student records. Continue?')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/cleanup-duplicates`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        alert(data.message);
        loadLeaderboard(); // Reload the leaderboard
      }
    } catch (error) {
      console.error('Error cleaning duplicates:', error);
      alert('Failed to clean duplicates');
    }
  };

  const resetUserStats = async (userId: string) => {
    if (!confirm('Are you sure you want to reset this user\'s stats? This action cannot be undone.')) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/api/admin/users/${userId}/reset-stats`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (response.ok) {
        loadLeaderboard(); // Reload the leaderboard
      }
    } catch (error) {
      console.error('Error resetting user stats:', error);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-500" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Award className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="w-6 h-6 flex items-center justify-center text-gray-600 font-bold">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      const colors = ['bg-yellow-100 text-yellow-800', 'bg-gray-100 text-gray-800', 'bg-amber-100 text-amber-800'];
      return `${colors[rank - 1]} border-2 ${rank === 1 ? 'border-yellow-300' : rank === 2 ? 'border-gray-300' : 'border-amber-300'}`;
    }
    return 'bg-blue-50 text-blue-700';
  };

  if (loading) {
    return (
      <ProtectedRoute allowedRoles={['admin']}>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute allowedRoles={['admin']}>
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container mx-auto px-4 pt-24 pb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-8 flex items-center">
            <Trophy className="w-8 h-8 mr-3 text-yellow-500" />
            Global Leaderboard Management
          </h1>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Filters & Actions</h3>
              <button
                onClick={cleanupDuplicates}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
              >
                Clean Duplicates
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search Users</label>
                <div className="relative">
                  <Search className="w-5 h-5 absolute left-3 top-3 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Period</label>
                <select
                  value={timeFilter}
                  onChange={(e) => setTimeFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all-time">All Time</option>
                  <option value="monthly">This Month</option>
                  <option value="weekly">This Week</option>
                  <option value="daily">Today</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Institution</label>
                <select
                  value={institutionFilter}
                  onChange={(e) => setInstitutionFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                >
                  <option value="all">All Institutions</option>
                  {/* Add institution options dynamically */}
                </select>
              </div>
            </div>
          </div>

          {/* Leaderboard */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900">
                Top Performers ({filteredLeaderboard.length} students)
              </h2>
            </div>

            <div className="divide-y divide-gray-200">
              {filteredLeaderboard.map((user: any, index: number) => {
                const rank = index + 1;
                return (
                  <div key={`user-${user.id || user._id}-${index}`} className={`p-6 ${rank <= 3 ? 'bg-gradient-to-r from-yellow-50 to-transparent' : ''}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className={`flex items-center justify-center w-12 h-12 rounded-full ${getRankBadge(rank)}`}>
                          {getRankIcon(rank)}
                        </div>

                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{user.full_name}</h3>
                          <p className="text-sm text-gray-600">{user.email}</p>
                          {user.institution_name && (
                            <p className="text-xs text-gray-500">{user.institution_name}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-8">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-green-600">{user.total_points || 0}</div>
                          <div className="text-xs text-gray-500">Points</div>
                        </div>

                        <div className="text-center">
                          <div className="text-xl font-semibold text-blue-600">Level {user.current_level || 1}</div>
                          <div className="text-xs text-gray-500">Level</div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-medium text-purple-600">{user.lessons_completed || 0}</div>
                          <div className="text-xs text-gray-500">Lessons</div>
                        </div>

                        <div className="text-center">
                          <div className="text-lg font-medium text-orange-600">{user.academic_impact_score || 0}</div>
                          <div className="text-xs text-gray-500">Academic Impact</div>
                        </div>

                        <div className="flex flex-col space-y-2">
                          <button
                            onClick={() => resetUserStats(user.id)}
                            className="px-3 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Reset Stats
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Badges */}
                    {user.badges_earned && user.badges_earned.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {user.badges_earned.slice(0, 5).map((badge: string, badgeIndex: number) => (
                          <span key={`badge-${user.id || user._id}-${badgeIndex}`} className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800">
                            🏆 Badge {badgeIndex + 1}
                          </span>
                        ))}
                        {user.badges_earned.length > 5 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
                            +{user.badges_earned.length - 5} more
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {filteredLeaderboard.length === 0 && (
              <div className="text-center py-8">
                <Trophy className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">No students found matching your criteria.</p>
              </div>
            )}
          </div>

          {/* Leaderboard Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-yellow-600 mb-2">{filteredLeaderboard.length}</div>
              <div className="text-gray-600">Total Students</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {filteredLeaderboard.reduce((sum: number, user: any) => sum + (user.total_points || 0), 0)}
              </div>
              <div className="text-gray-600">Total Points</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {filteredLeaderboard.length > 0
                  ? Math.round(filteredLeaderboard.reduce((sum: number, user: any) => sum + (user.current_level || 1), 0) / filteredLeaderboard.length)
                  : 0
                }
              </div>
              <div className="text-gray-600">Avg Level</div>
            </div>

            <div className="bg-white rounded-lg shadow-md p-6 text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {filteredLeaderboard.reduce((sum: number, user: any) => sum + (user.lessons_completed || 0), 0)}
              </div>
              <div className="text-gray-600">Total Lessons</div>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}