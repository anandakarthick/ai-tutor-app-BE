import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Achievement } from './Achievement';

@Entity('student_achievements')
@Index(['studentId', 'achievementId'], { unique: true })
export class StudentAchievement extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.achievements)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Achievement, (achievement) => achievement.studentAchievements)
  @JoinColumn({ name: 'achievement_id' })
  achievement: Achievement;

  @Column({ name: 'achievement_id' })
  achievementId: string;

  @Column({ name: 'earned_at' })
  earnedAt: Date;

  @Column({ nullable: true, type: 'jsonb', name: 'progress_data' })
  progressData?: Record<string, any>;

  @Column({ default: false, name: 'is_notified' })
  isNotified: boolean;
}
