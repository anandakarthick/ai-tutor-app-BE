import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';

@Entity('daily_progress')
@Index(['studentId', 'date'], { unique: true })
export class DailyProgress extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.dailyProgress)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @Column({ type: 'date' })
  date: Date;

  @Column({ default: 0, name: 'total_study_time_minutes' })
  totalStudyTimeMinutes: number;

  @Column({ default: 0, name: 'topics_completed' })
  topicsCompleted: number;

  @Column({ default: 0, name: 'quizzes_attempted' })
  quizzesAttempted: number;

  @Column({ default: 0, name: 'doubts_asked' })
  doubtsAsked: number;

  @Column({ default: 0, name: 'xp_earned' })
  xpEarned: number;

  @Column({ default: 0, name: 'streak_days' })
  streakDays: number;

  @Column({ default: false, name: 'goal_achieved' })
  goalAchieved: boolean;

  @Column({ nullable: true, type: 'jsonb', name: 'subject_wise_time' })
  subjectWiseTime?: Record<string, number>;

  @Column({ nullable: true, type: 'jsonb', name: 'session_details' })
  sessionDetails?: Record<string, any>[];
}
