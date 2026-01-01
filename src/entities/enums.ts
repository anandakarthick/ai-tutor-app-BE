/**
 * Shared Enums for AI Tutor Backend
 * Centralized enum definitions to avoid circular dependencies
 */

// User & Authentication Enums
export enum UserRole {
  PARENT = 'parent',
  STUDENT = 'student',
  ADMIN = 'admin',
}

export enum AuthProvider {
  LOCAL = 'local',
  GOOGLE = 'google',
  FACEBOOK = 'facebook',
}

// Student Enums
export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

export enum LearningStyle {
  VISUAL = 'visual',
  AUDITORY = 'auditory',
  KINESTHETIC = 'kinesthetic',
  READING_WRITING = 'reading_writing',
}

export enum Medium {
  ENGLISH = 'english',
  HINDI = 'hindi',
  TAMIL = 'tamil',
  TELUGU = 'telugu',
  KANNADA = 'kannada',
  MALAYALAM = 'malayalam',
  MARATHI = 'marathi',
  BENGALI = 'bengali',
  GUJARATI = 'gujarati',
}

// Content Enums
export enum BlockType {
  TEXT = 'text',
  HEADING = 'heading',
  DEFINITION = 'definition',
  EXAMPLE = 'example',
  FORMULA = 'formula',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DIAGRAM = 'diagram',
  TABLE = 'table',
  QUIZ = 'quiz',
  NOTE = 'note',
  TIP = 'tip',
  WARNING = 'warning',
}

// Study Plan Enums
export enum PlanStatus {
  ACTIVE = 'active',
  COMPLETED = 'completed',
  PAUSED = 'paused',
  CANCELLED = 'cancelled',
}

export enum ItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SKIPPED = 'skipped',
}

// Learning Session Enums
export enum SessionType {
  LEARNING = 'learning',
  REVISION = 'revision',
  DOUBT = 'doubt',
  QUIZ = 'quiz',
  PRACTICE = 'practice',
}

export enum SessionStatus {
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  ABANDONED = 'abandoned',
}

// Chat Enums
export enum SenderType {
  STUDENT = 'student',
  AI = 'ai',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  AUDIO = 'audio',
  EXPLANATION = 'explanation',
  QUESTION = 'question',
  ANSWER = 'answer',
  HINT = 'hint',
  SUMMARY = 'summary',
}

// Progress Enums
export enum MasteryLevel {
  BEGINNER = 'beginner',
  LEARNING = 'learning',
  PRACTICING = 'practicing',
  PROFICIENT = 'proficient',
  MASTERED = 'mastered',
}

// Doubt Enums
export enum DoubtType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
}

export enum DoubtStatus {
  PENDING = 'pending',
  AI_ANSWERED = 'ai_answered',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
}

// Quiz Enums
export enum QuizType {
  TOPIC = 'topic',
  CHAPTER = 'chapter',
  SUBJECT = 'subject',
  MOCK_TEST = 'mock_test',
  PRACTICE = 'practice',
  REVISION = 'revision',
}

export enum DifficultyLevel {
  EASY = 'easy',
  MEDIUM = 'medium',
  HARD = 'hard',
  MIXED = 'mixed',
}

export enum QuestionType {
  MCQ = 'mcq',
  TRUE_FALSE = 'true_false',
  FILL_BLANK = 'fill_blank',
  SHORT_ANSWER = 'short_answer',
  LONG_ANSWER = 'long_answer',
  MATCH = 'match',
  ORDERING = 'ordering',
}

export enum AttemptStatus {
  IN_PROGRESS = 'in_progress',
  SUBMITTED = 'submitted',
  TIMED_OUT = 'timed_out',
  ABANDONED = 'abandoned',
}

// Subscription Enums
export enum SubscriptionStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  CANCELLED = 'cancelled',
  PAUSED = 'paused',
  TRIAL = 'trial',
}

// Payment Enums
export enum PaymentStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  SUCCESS = 'success',
  FAILED = 'failed',
  REFUNDED = 'refunded',
  CANCELLED = 'cancelled',
}

export enum PaymentGateway {
  RAZORPAY = 'razorpay',
  STRIPE = 'stripe',
  PAYTM = 'paytm',
  UPI = 'upi',
}

// Coupon Enums
export enum DiscountType {
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

// Achievement Enums
export enum AchievementCategory {
  STREAK = 'streak',
  LEARNING = 'learning',
  QUIZ = 'quiz',
  DOUBT = 'doubt',
  XP = 'xp',
  LEVEL = 'level',
  SOCIAL = 'social',
  SPECIAL = 'special',
}

// Notification Enums
export enum NotificationType {
  SYSTEM = 'system',
  REMINDER = 'reminder',
  ACHIEVEMENT = 'achievement',
  QUIZ = 'quiz',
  SUBSCRIPTION = 'subscription',
  STREAK = 'streak',
  PROMOTION = 'promotion',
  UPDATE = 'update',
}

export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

// OTP Enums
export enum OtpPurpose {
  REGISTRATION = 'registration',
  LOGIN = 'login',
  PASSWORD_RESET = 'password_reset',
  PHONE_VERIFICATION = 'phone_verification',
  EMAIL_VERIFICATION = 'email_verification',
}

// Report Enums
export enum ReportType {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  TERM = 'term',
  CUSTOM = 'custom',
}
