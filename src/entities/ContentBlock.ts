import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { Topic } from './Topic';
import { BlockType } from './enums';

export { BlockType };

@Entity('content_blocks')
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

  @Column({ nullable: true, type: 'text', name: 'media_url' })
  mediaUrl?: string;

  @Column({ name: 'sequence_order' })
  sequenceOrder: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;
}
