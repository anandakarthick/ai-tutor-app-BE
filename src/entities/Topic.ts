import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Chapter } from './Chapter';
import { ContentBlock } from './ContentBlock';
import { Quiz } from './Quiz';
import { Doubt } from './Doubt';
import { StudentProgress } from './StudentProgress';
import { LearningSession } from './LearningSession';

@Entity('topics')
@Index(['chapterId', 'topicTitle'], { unique: true })
export class Topic extends BaseEntity {
  @ManyToOne(() => Chapter, (chapter) => chapter.topics)
  @JoinColumn({ name: 'chapter_id' })
  chapter: Chapter;

  @Column({ name: 'chapter_id' })
  chapterId: string;

  @Column({ length: 255, name: 'topic_title' })
  topicTitle: string;

  @Column({ nullable: true, type: 'text' })
  content?: string;

  @Column({ nullable: true, type: 'text', name: 'ai_teaching_prompt' })
  aiTeachingPrompt?: string;

  @Column({ nullable: true, type: 'text', name: 'key_concepts' })
  keyConcepts?: string;

  @Column({ default: 0, name: 'estimated_duration_minutes' })
  estimatedDurationMinutes: number;

  @Column({ nullable: true, name: 'video_url' })
  videoUrl?: string;

  @Column({ nullable: true, name: 'pdf_url' })
  pdfUrl?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  @Column({ default: 1, name: 'difficulty_level' })
  difficultyLevel: number;

  // Relations
  @OneToMany(() => ContentBlock, (block) => block.topic)
  contentBlocks: ContentBlock[];

  @OneToMany(() => Quiz, (quiz) => quiz.topic)
  quizzes: Quiz[];

  @OneToMany(() => Doubt, (doubt) => doubt.topic)
  doubts: Doubt[];

  @OneToMany(() => StudentProgress, (progress) => progress.topic)
  studentProgress: StudentProgress[];

  @OneToMany(() => LearningSession, (session) => session.topic)
  sessions: LearningSession[];
}
