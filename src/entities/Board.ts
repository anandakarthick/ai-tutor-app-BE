import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Class } from './Class';

@Entity('boards')
export class Board extends BaseEntity {
  @Column({ length: 50, unique: true })
  name: string;

  @Column({ length: 255, name: 'full_name' })
  fullName: string;

  @Column({ nullable: true, length: 100 })
  state?: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({ nullable: true, name: 'logo_url' })
  logoUrl?: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => Class, (cls) => cls.board)
  classes: Class[];
}
