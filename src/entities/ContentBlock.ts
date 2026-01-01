import { Entity, Column, ManyToOne, JoinColumn, Index } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';

export enum BlockType {
  TEXT = 'text',
  HEADING = 'heading',
  DEFINITION = 'definition',
  EXAMPLE = 'example',
  FORMULA = 'formula',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  DIAGRAM = 'diagram',
  TABLE = 'table',
  QUIZ = 'quiz',
  NOTE = 'note',
  TIP = 'tip',
  WARNING = 'warning',
}

@Entity('content_blocks')
@Index(['topicId', 'sequenceOrder'])
export class ContentBlock extends BaseEntity {
  @ManyToOne(() => Topic, (topic) => topic.contentBlocks)
  @JoinColumn({ name: 'topic_id' })
  topic: Topic;

  @Column({ name: 'topic_id' })
  topicId: string;

  @Column({
    type: 'enum',
    enum: BlockType,
    default: BlockType.TEXT,
    name: 'block_type',
  })
  blockType: BlockType;

  @Column({ type: 'text' })
  content: string;

  @Column({ nullable: true, type: 'text', name: 'ai_explanation' })
  aiExplanation?: string;

  @Column({ nullable: true, name: 'media_url' })
  mediaUrl?: string;

  @Column({ name: 'sequence_order' })
  sequenceOrder: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;
}
