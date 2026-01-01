import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { User } from './User';
import { Board } from './Board';
import { Class } from './Class';
import { StudentInterest } from './StudentInterest';
import { StudentAchievement } from './StudentAchievement';
import { DailyProgress } from './DailyProgress';
import { Gender, LearningStyle, Medium } from './enums';

export { Gender, LearningStyle, Medium };

@Entity('students')
export class Student extends BaseEntity {
  @ManyToOne(() => User, (user) => user.students)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ length: 100, name: 'student_name' })
  studentName: string;

  @Column({ nullable: true, type: 'date', name: 'date_of_birth' })
  dateOfBirth?: Date;

  @Column({
    type: 'enum',
    enum: Gender,
    nullable: true,
  })
  gender?: Gender;

  @Column({ nullable: true, name: 'profile_image_url', type: 'text' })
  profileImageUrl?: string;

  @Column({ length: 255, name: 'school_name' })
  schoolName: string;

  @Column({ nullable: true, type: 'text', name: 'school_address' })
  schoolAddress?: string;

  @ManyToOne(() => Board)
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @Column({ name: 'board_id', nullable: true })
  boardId?: string;

  @ManyToOne(() => Class)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id', nullable: true })
  classId?: string;

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

  @Column({ nullable: true, type: 'decimal', precision: 5, scale: 2, name: 'previous_percentage' })
  previousPercentage?: number;

  @Column({
    type: 'enum',
    enum: LearningStyle,
    nullable: true,
    name: 'learning_style',
  })
  learningStyle?: LearningStyle;

  @Column({ nullable: true, type: 'text', name: 'special_needs' })
  specialNeeds?: string;

  @Column({ default: 2, name: 'daily_study_hours' })
  dailyStudyHours: number;

  @Column({ nullable: true, type: 'jsonb', name: 'preferred_study_time' })
  preferredStudyTime?: Record<string, any>;

  @Column({ nullable: true, type: 'text', name: 'career_goal' })
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

  @Column({ nullable: true, type: 'date', name: 'last_activity_date' })
  lastActivityDate?: Date;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @OneToMany(() => StudentInterest, (interest) => interest.student)
  interests: StudentInterest[];

  @OneToMany(() => StudentAchievement, (achievement) => achievement.student)
  achievements: StudentAchievement[];

  @OneToMany(() => DailyProgress, (progress) => progress.student)
  dailyProgress: DailyProgress[];
}
