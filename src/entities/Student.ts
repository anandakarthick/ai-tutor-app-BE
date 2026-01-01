import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Board } from './Board';
import { Class } from './Class';
import { StudentInterest } from './StudentInterest';
import { StudyPlan } from './StudyPlan';
import { LearningSession } from './LearningSession';
import { StudentProgress } from './StudentProgress';
import { QuizAttempt } from './QuizAttempt';
import { Doubt } from './Doubt';
import { DailyProgress } from './DailyProgress';
import { StudentAchievement } from './StudentAchievement';

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

@Entity('students')
export class Student extends BaseEntity {
  @ManyToOne(() => User, (user) => user.students)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 100, name: 'student_name' })
  studentName: string;

  @Column({ nullable: true, name: 'date_of_birth', type: 'date' })
  dateOfBirth?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ nullable: true, name: 'profile_image_url' })
  profileImageUrl?: string;

  @Column({ length: 255, name: 'school_name' })
  schoolName: string;

  @Column({ nullable: true, name: 'school_address', type: 'text' })
  schoolAddress?: string;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @Column({ name: 'board_id' })
  boardId: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id' })
  classId: string;

  @Column({ nullable: true, length: 10 })
  section?: string;

  @Column({ nullable: true, name: 'roll_number', length: 50 })
  rollNumber?: string;

  @Column({
    type: 'enum',
    enum: Medium,
    default: Medium.ENGLISH,
  })
  medium: Medium;

  @Column({ nullable: true, name: 'academic_year', length: 10 })
  academicYear?: string;

  @Column({ nullable: true, name: 'previous_percentage', type: 'decimal', precision: 5, scale: 2 })
  previousPercentage?: number;

  @Column({
    type: 'enum',
    enum: LearningStyle,
    nullable: true,
    name: 'learning_style',
  })
  learningStyle?: LearningStyle;

  @Column({ nullable: true, name: 'special_needs', type: 'text' })
  specialNeeds?: string;

  @Column({ default: 2, name: 'daily_study_hours' })
  dailyStudyHours: number;

  @Column({ type: 'jsonb', nullable: true, name: 'preferred_study_time' })
  preferredStudyTime?: string[];

  @Column({ nullable: true, name: 'career_goal', type: 'text' })
  careerGoal?: string;

  @Column({ nullable: true, name: 'target_exam', length: 100 })
  targetExam?: string;

  // Gamification
  @Column({ default: 0 })
  xp: number;

  @Column({ default: 1 })
  level: number;

  @Column({ default: 0, name: 'streak_days' })
  streakDays: number;

  @Column({ nullable: true, name: 'last_activity_date', type: 'date' })
  lastActivityDate?: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @OneToMany(() => StudentInterest, (interest) => interest.student)
  interests: StudentInterest[];

  @OneToMany(() => StudyPlan, (plan) => plan.student)
  studyPlans: StudyPlan[];

  @OneToMany(() => LearningSession, (session) => session.student)
  learningSessions: LearningSession[];

  @OneToMany(() => StudentProgress, (progress) => progress.student)
  progress: StudentProgress[];

  @OneToMany(() => QuizAttempt, (attempt) => attempt.student)
  quizAttempts: QuizAttempt[];

  @OneToMany(() => Doubt, (doubt) => doubt.student)
  doubts: Doubt[];

  @OneToMany(() => DailyProgress, (daily) => daily.student)
  dailyProgress: DailyProgress[];

  @OneToMany(() => StudentAchievement, (achievement) => achievement.student)
  achievements: StudentAchievement[];
}
