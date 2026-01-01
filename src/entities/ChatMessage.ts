import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { LearningSession } from './LearningSession';
import { SenderType, MessageType } from './enums';

export { SenderType, MessageType };

@Entity('chat_messages')
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

  @Column({ nullable: true, type: 'text', name: 'media_url' })
  mediaUrl?: string;

  @Column({ nullable: true, type: 'text', name: 'voice_transcript' })
  voiceTranscript?: string;

  @Column({ nullable: true, type: 'jsonb' })
  metadata?: Record<string, any>;

  @Column({ default: false, name: 'is_read' })
  isRead: boolean;
}
