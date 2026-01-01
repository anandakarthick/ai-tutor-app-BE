import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { LearningSession } from './LearningSession';

export enum SenderType {
  STUDENT = 'student',
  AI = 'ai',
  SYSTEM = 'system',
}

export enum MessageType {
  TEXT = 'text',
  VOICE = 'voice',
  IMAGE = 'image',
  AUDIO = 'audio',
  EXPLANATION = 'explanation',
  QUESTION = 'question',
  ANSWER = 'answer',
  HINT = 'hint',
  SUMMARY = 'summary',
}

@Entity('chat_messages')
@Index(['sessionId', 'createdAt'])
export class ChatMessage extends BaseEntity {
  @ManyToOne(() => LearningSession, (session) => session.messages)
  @JoinColumn({ name: 'session_id' })
  session: LearningSession;

  @Column({ name: 'session_id' })
  sessionId: string;

  @Column({
    type: 'enum',
    enum: SenderType,
    name: 'sender_type',
  })
  senderType: SenderType;

  @Column({
    type: 'enum',
    enum: MessageType,
    default: MessageType.TEXT,
    name: 'message_type',
  })
  messageType: MessageType;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true, name: 'media_url' })
  mediaUrl?: string;

  @Column({ nullable: true, name: 'voice_transcript', type: 'text' })
  voiceTranscript?: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: Record<string, any>;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;
}
