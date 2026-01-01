import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Quiz } from './Quiz';
import { AnswerResponse } from './AnswerResponse';
import { AttemptStatus } from './enums';

export { AttemptStatus };

@Entity('quiz_attempts')
export class QuizAttempt extends BaseEntity {
  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Quiz)
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({ name: 'quiz_id' })
  quizId: string;

  @Column({ type: 'timestamp', name: 'started_at' })
  startedAt: Date;

  @Column({ nullable: true, type: 'timestamp', name: 'submitted_at' })
  submittedAt?: Date;

  @Column({
    type: 'enum',
    enum: AttemptStatus,
    default: AttemptStatus.IN_PROGRESS,
  })
  status: AttemptStatus;

  @Column({ default: 0, name: 'total_questions' })
  totalQuestions: number;

  @Column({ default: 0, name: 'attempted_questions' })
  attemptedQuestions: number;

  @Column({ default: 0, name: 'correct_answers' })
  correctAnswers: number;

  @Column({ default: 0, name: 'wrong_answers' })
  wrongAnswers: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'marks_obtained' })
  marksObtained: number;

  @Column({ type: 'decimal', precision: 8, scale: 2, default: 0, name: 'total_marks' })
  totalMarks: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0 })
  percentage: number;

  @Column({ default: 0, name: 'time_taken_seconds' })
  timeTakenSeconds: number;

  @Column({ default: false, name: 'is_passed' })
  isPassed: boolean;

  @Column({ default: 0, name: 'xp_earned' })
  xpEarned: number;

  // Relations
  @OneToMany(() => AnswerResponse, (response) => response.attempt)
  responses: AnswerResponse[];
}
