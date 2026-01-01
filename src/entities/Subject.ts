import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Class } from './Class';
import { Book } from './Book';
import { Medium } from './Student';

@Entity('subjects')
@Index(['classId', 'subjectName', 'medium'], { unique: true })
export class Subject extends BaseEntity {
  @ManyToOne(() => Class, (cls) => cls.subjects)
  @JoinColumn({ name: 'class_id' })
  class: Class;

  @Column({ name: 'class_id' })
  classId: string;

  @Column({ length: 100, name: 'subject_name' })
  subjectName: string;

  @Column({ length: 100, name: 'display_name' })
  displayName: string;

  @Column({
    type: 'enum',
    enum: Medium,
    default: Medium.ENGLISH,
  })
  medium: Medium;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true, name: 'icon_name', length: 50 })
  iconName?: string;

  @Column({ nullable: true, name: 'color_code', length: 7 })
  colorCode?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => Book, (book) => book.subject)
  books: Book[];
}
