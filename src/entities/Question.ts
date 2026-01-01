import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Quiz } from './Quiz';
import { AnswerResponse } from './AnswerResponse';
import { QuestionType } from './enums';

export { QuestionType };

@Entity('questions')
export class Question extends BaseEntity {
  @ManyToOne(() => Quiz, (quiz) => quiz.questions)
  @JoinColumn({ name: 'quiz_id' })
  quiz: Quiz;

  @Column({ name: 'quiz_id' })
  quizId: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MCQ,
    name: 'question_type',
  })
  questionType: QuestionType;

  @Column({ type: 'text', name: 'question_text' })
  questionText: string;

  @Column({ nullable: true, type: 'text', name: 'question_image_url' })
  questionImageUrl?: string;

  @Column({ nullable: true, type: 'jsonb' })
  options?: string[];

  @Column({ type: 'text', name: 'correct_answer' })
  correctAnswer: string;

  @Column({ nullable: true, type: 'text' })
  explanation?: string;

  @Column({ default: 1 })
  marks: number;

  @Column({ nullable: true, type: 'decimal', precision: 5, scale: 2, name: 'negative_marks' })
  negativeMarks?: number;

  @Column({ name: 'sequence_order' })
  sequenceOrder: number;

  @Column({ default: 'medium', name: 'difficulty_level', length: 20 })
  difficultyLevel: string;

  @Column({ nullable: true, type: 'text' })
  hint?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  // Relations
  @OneToMany(() => AnswerResponse, (response) => response.question)
  responses: AnswerResponse[];
}
