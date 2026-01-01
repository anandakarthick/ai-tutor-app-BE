import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Topic } from './Topic';
import { DoubtType, DoubtStatus } from './enums';

export { DoubtType, DoubtStatus };

@Entity('doubts')
export class Doubt extends BaseEntity {
  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Topic)
  @JoinColumn({ name: 'topic_id' })
  topic?: Topic;

  @Column({ nullable: true, name: 'topic_id' })
  topicId?: string;

  @Column({ type: 'text' })
  question: string;

  @Column({
    type: 'enum',
    enum: DoubtType,
    default: DoubtType.TEXT,
    name: 'doubt_type',
  })
  doubtType: DoubtType;

  @Column({ nullable: true, type: 'text', name: 'image_url' })
  imageUrl?: string;

  @Column({ nullable: true, type: 'text', name: 'voice_url' })
  voiceUrl?: string;

  @Column({ nullable: true, type: 'text', name: 'voice_transcript' })
  voiceTranscript?: string;

  @Column({ nullable: true, type: 'text', name: 'ai_answer' })
  aiAnswer?: string;

  @Column({
    type: 'enum',
    enum: DoubtStatus,
    default: DoubtStatus.PENDING,
  })
  status: DoubtStatus;

  @Column({ default: false, name: 'is_resolved' })
  isResolved: boolean;

  @Column({ nullable: true, type: 'timestamp', name: 'resolved_at' })
  resolvedAt?: Date;

  @Column({ nullable: true })
  rating?: number;

  @Column({ nullable: true, type: 'text' })
  feedback?: string;

  @Column({ default: false, name: 'is_bookmarked' })
  isBookmarked: boolean;
}
