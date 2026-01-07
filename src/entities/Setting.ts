import { Entity, Column, PrimaryColumn } from 'typeorm';

/**
 * Settings Entity - Key-Value store for platform settings
 */
@Entity('settings')
export class Setting {
  @PrimaryColumn({ length: 100 })
  key: string;

  @Column({ type: 'text' })
  value: string;

  @Column({ nullable: true, length: 50 })
  category: string;

  @Column({ nullable: true, type: 'text' })
  description: string;

  @Column({ default: 'string', length: 20 })
  type: string; // string, number, boolean, json

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', name: 'updated_at' })
  updatedAt: Date;
}
