// Type definitions for the application

export type UserRole = 'student' | 'teacher' | 'admin';

export interface User {
  id: string;
  _id?: string;
  email: string;
  full_name: string;
  role: UserRole | string;
  institution_id?: string | Institution;
  assigned_subjects?: string[];
  created_at?: string;
  updated_at?: string;
  approval_status?: 'pending' | 'approved' | 'rejected';
  semester?: number;
}

export interface Institution {
  id: string;
  _id?: string;
  name: string;
  type: 'school' | 'college' | 'ngo';
  address?: string;
  contact_email?: string;
  contact_phone?: string;
  created_at?: string;
  updated_at?: string;
  colleges?: string[];
}

export interface Class {
  id: string;
  name: string;
  description?: string;
  subject?: string;
  institution_id: string;
  teacher_id?: string;
  created_at?: string;
  updated_at?: string;
  admin_feedback?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Lesson {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  content: string;
  topic: string;
  teacher_id: string;
  class_id: string;
  class_number?: string | number;
  order_index: number;
  created_at?: string;
  updated_at?: string;
  admin_feedback?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface Quiz {
  id: string;
  _id?: string;
  title: string;
  description?: string;
  lesson_id?: string;
  teacher_id: string;
  class_id: string;
  class_number?: string;
  total_marks: number;
  time_limit?: number;
  questions?: QuizQuestion[] | { length: number };
  created_at?: string;
  updated_at?: string;
  stats?: {
    attempts: number;
    avgScore: number;
    maxScore?: number;
  };
  admin_feedback?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface QuizQuestion {
  id: string;
  _id?: string;
  quiz_id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'true_false' | 'short_answer';
  options?: Record<string, string>;
  correct_answer: string;
  marks: number;
  order_index: number;
  subject?: string;
  focus_area?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  explanation?: string;
}

export interface Challenge {
  id: string;
  _id?: string;
  title: string;
  description: string;
  instructions?: string;
  category: string;
  points_reward: number;
  academic_impact_value?: number;
  teacher_id?: string;
  class_id?: string;
  class_number?: string | number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  is_global: boolean;
  created_at?: string;
  updated_at?: string;
  admin_feedback?: string;
  status: 'pending' | 'approved' | 'rejected';
}

export interface StudentStats {
  id: string;
  student_id: string;
  total_points: number;
  current_level: number;
  badges_earned: string[];
  lessons_completed: number;
  quizzes_completed: number;
  challenges_completed: number;
  academic_impact_score: number;
  updated_at?: string;
}

export interface Badge {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  points_required: number;
  category?: string;
  created_at?: string;
}

