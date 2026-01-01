import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { QuizAttempt } from './QuizAttempt';
import { Question } from './Question';

@Entity('answer_responses')
export class AnswerResponse extends BaseEntity {
  @ManyToOne(() => QuizAttempt, (attempt) => attempt.responses)
  @JoinColumn({ name: 'attempt_id' })
  attempt: QuizAttempt;

  @Column({ name: 'attempt_id' })
  attemptId: string;

  @ManyToOne(() => Question, (question) => question.responses)
  @JoinColumn({ name: 'question_id' })
  question: Question;

  @Column({ name: 'question_id' })
  questionId: string;

  @Column({ nullable: true, type: 'text', name: 'student_answer' })
  studentAnswer?: string;

  @Column({ default: false, name: 'is_correct' })
  isCorrect: boolean;

  @Column({ default: 0, name: 'marks_obtained', type: 'decimal', precision: 5, scale: 2 })
  marksObtained: number;

  @Column({ default: 0, name: 'time_taken_seconds' })
  timeTakenSeconds: number;

  @Column({ default: false, name: 'is_skipped' })
  isSkipped: boolean;
}
