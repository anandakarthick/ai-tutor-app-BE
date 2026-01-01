import { Request } from 'express';
import { User, UserRole } from '../entities/User';

export interface JwtPayload {
  userId: string;
  email?: string;
  phone: string;
  role: UserRole;
  iat: number;
  exp: number;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
  currentUser?: User;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
  code?: string;
}

export interface SocketUser {
  id: string;
  socketId: string;
  userId: string;
  studentId?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface StudyPlanGenerationRequest {
  studentId: string;
  subjects: string[];
  dailyHours: number;
  startDate: Date;
  endDate: Date;
  targetExam?: string;
  weakAreas?: string[];
}

export interface QuizGenerationRequest {
  topicId: string;
  difficulty: 'easy' | 'medium' | 'hard';
  questionCount: number;
  questionTypes: ('mcq' | 'true_false' | 'fill_blank')[];
}

export interface ProgressUpdateRequest {
  studentId: string;
  topicId: string;
  progressPercentage: number;
  timeSpentMinutes: number;
  contentBlocksCompleted?: number;
}

export interface DashboardStats {
  student: {
    name: string;
    xp: number;
    level: number;
    streakDays: number;
  };
  today: {
    studyTimeMinutes: number;
    topicsCompleted: number;
    xpEarned: number;
    goalAchieved: boolean;
  };
  overall: {
    totalTopics: number;
    completedTopics: number;
    totalQuizzes: number;
    avgQuizScore: number;
    quizzesPassed: number;
    achievements: number;
  };
}
