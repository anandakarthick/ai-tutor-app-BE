import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Subject } from './Subject';
import { Chapter } from './Chapter';

@Entity('books')
@Index(['subjectId', 'bookTitle'], { unique: true })
export class Book extends BaseEntity {
  @ManyToOne(() => Subject, (subject) => subject.books)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ length: 255, name: 'book_title' })
  bookTitle: string;

  @Column({ nullable: true, length: 255 })
  publisher?: string;

  @Column({ nullable: true, length: 50 })
  edition?: string;

  @Column({ nullable: true, name: 'publication_year' })
  publicationYear?: number;

  @Column({ nullable: true, name: 'cover_image_url' })
  coverImageUrl?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ default: 0, name: 'total_chapters' })
  totalChapters: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => Chapter, (chapter) => chapter.book)
  chapters: Chapter[];
}
