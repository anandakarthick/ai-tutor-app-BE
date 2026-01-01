import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Subject } from './Subject';

@Entity('student_interests')
@Index(['studentId', 'subjectId'], { unique: true })
export class StudentInterest extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.interests)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Subject)
  @JoinColumn({ name: 'subject_id' })
  subject: Subject;

  @Column({ name: 'subject_id' })
  subjectId: string;

  @Column({ default: 5, name: 'interest_level' })
  interestLevel: number;

  @Column({ default: false, name: 'is_favorite' })
  isFavorite: boolean;

  @Column({ nullable: true, name: 'career_relevance', type: 'text' })
  careerRelevance?: string;
}
