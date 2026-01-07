import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Student } from './Student';
import { Topic } from './Topic';
import { ChatMessage } from './ChatMessage';
import { SessionType, SessionStatus } from './enums';

export { SessionType, SessionStatus };

@Entity('learning_sessions')
export class LearningSession extends BaseEntity {
  @ManyToOne(() => Student)
  @JoinColumn({ name: 'student_id' })
  student: Student;

  @Column({ name: 'student_id' })
  studentId: string;

  @ManyToOne(() => Topic, (topic) => topic.sessions)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @Column({ name: 'topic_id' })
  topicId: string;

  @Column({
    type: 'enum',
    enum: SessionType,
    default: SessionType.LEARNING,
    name: 'session_type',
  })
  sessionType: SessionType;

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.ACTIVE,
  })
  status: SessionStatus;

  @Column({ nullable: true, type: 'timestamp', name: 'started_at' })
  startedAt?: Date;

  @Column({ nullable: true, type: 'timestamp', name: 'ended_at' })
  endedAt?: Date;

  @Column({ default: 0, name: 'duration_seconds' })
  durationSeconds: number;

  @Column({ default: 0, name: 'content_blocks_viewed' })
  contentBlocksViewed: number;

  @Column({ default: 0, name: 'ai_interactions' })
  aiInteractions: number;

  @Column({ nullable: true, type: 'jsonb', name: 'session_data' })
  sessionData?: Record<string, any>;

  @Column({ default: 0, name: 'xp_earned' })
  xpEarned: number;

  // Relations
  @OneToMany(() => ChatMessage, (message) => message.session)
  messages: ChatMessage[];
}
