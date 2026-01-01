import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Topic } from './Topic';

export enum DoubtType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
}

export enum DoubtStatus {
  PENDING = 'pending',
  AI_ANSWERED = 'ai_answered',
  ESCALATED = 'escalated',
  RESOLVED = 'resolved',
}

@Entity('doubts')
@Index(['studentId', 'createdAt'])
export class Doubt extends BaseEntity {
  @ManyToOne(() => Student, (student) => student.doubts)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Topic, (topic) => topic.doubts, { nullable: true })
  @JoinColumn({ name: 'topic_id' })
  topic?: Topic;

  @Column({ name: 'topic_id', nullable: true })
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

  @Column({ nullable: true, name: 'image_url' })
  imageUrl?: string;

  @Column({ nullable: true, name: 'voice_url' })
  voiceUrl?: string;

  @Column({ nullable: true, name: 'voice_transcript', type: 'text' })
  voiceTranscript?: string;

  @Column({ nullable: true, name: 'ai_answer', type: 'text' })
  aiAnswer?: string;

  @Column({
    type: 'enum',
    enum: DoubtStatus,
    default: DoubtStatus.PENDING,
  })
  status: DoubtStatus;

  @Column({ default: false, name: 'is_resolved' })
  isResolved: boolean;

  @Column({ nullable: true, name: 'resolved_at' })
  resolvedAt?: Date;

  @Column({ nullable: true, name: 'rating' })
  rating?: number;

  @Column({ nullable: true, type: 'text' })
  feedback?: string;

  @Column({ default: false, name: 'is_bookmarked' })
  isBookmarked: boolean;
}
