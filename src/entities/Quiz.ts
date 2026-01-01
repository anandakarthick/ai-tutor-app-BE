import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { Question } from './Question';
import { QuizType, DifficultyLevel } from './enums';

export { QuizType, DifficultyLevel };

@Entity('quizzes')
export class Quiz extends BaseEntity {
  @ManyToOne(() => Topic)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @Column({ nullable: true, name: 'topic_id' })
  topicId?: string;

  @Column({ length: 255, name: 'quiz_title' })
  quizTitle: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({
    type: 'enum',
    enum: QuizType,
    default: QuizType.TOPIC,
    name: 'quiz_type',
  })
  quizType: QuizType;

  @Column({
    type: 'enum',
    enum: DifficultyLevel,
    default: DifficultyLevel.MEDIUM,
    name: 'difficulty_level',
  })
  difficultyLevel: DifficultyLevel;

  @Column({ default: 0, name: 'total_questions' })
  totalQuestions: number;

  @Column({ default: 0, name: 'total_marks' })
  totalMarks: number;

  @Column({ nullable: true, name: 'time_limit_minutes' })
  timeLimitMinutes?: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, name: 'passing_percentage' })
  passingPercentage: number;

  @Column({ default: true, name: 'shuffle_questions' })
  shuffleQuestions: boolean;

  @Column({ default: true, name: 'show_answer_after_submit' })
  showAnswerAfterSubmit: boolean;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: false, name: 'is_ai_generated' })
  isAiGenerated: boolean;

  // Relations
  @OneToMany(() => Question, (question) => question.quiz)
  questions: Question[];
}
