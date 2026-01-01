import { Entity, Column, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Board } from './Board';
import { Subject } from './Subject';

@Entity('classes')
@Index(['boardId', 'className'], { unique: true })
export class Class extends BaseEntity {
  @ManyToOne(() => Board, (board) => board.classes)
  @JoinColumn({ name: 'board_id' })
  board: Board;

  @Column({ name: 'board_id' })
  boardId: string;

  @Column({ length: 20, name: 'class_name' })
  className: string;

  @Column({ length: 50, name: 'display_name' })
  displayName: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => Subject, (subject) => subject.class)
  subjects: Subject[];
}
