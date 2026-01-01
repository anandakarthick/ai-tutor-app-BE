import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Book } from './Book';
import { Topic } from './Topic';

@Entity('chapters')
@Index(['bookId', 'chapterNumber'], { unique: true })
export class Chapter extends BaseEntity {
  @ManyToOne(() => Book, (book) => book.chapters)
  @JoinColumn({ name: 'book_id' })
  book: Book;

  @Column({ name: 'book_id' })
  bookId: string;

  @Column({ name: 'chapter_number' })
  chapterNumber: number;

  @Column({ length: 255, name: 'chapter_title' })
  chapterTitle: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true, type: 'text', name: 'learning_objectives' })
  learningObjectives?: string;

  @Column({ default: 0, name: 'estimated_duration_minutes' })
  estimatedDurationMinutes: number;

  @Column({ nullable: true, name: 'thumbnail_url' })
  thumbnailUrl?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => Topic, (topic) => topic.chapter)
  topics: Topic[];
}
