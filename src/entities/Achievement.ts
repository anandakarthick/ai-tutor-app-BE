import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './BaseEntity';
import { StudentAchievement } from './StudentAchievement';
import { AchievementCategory } from './enums';

export { AchievementCategory };

@Entity('achievements')
export class Achievement extends BaseEntity {
  @Column({ length: 100, name: 'achievement_name' })
  achievementName: string;

  @Column({ length: 255, name: 'display_name' })
  displayName: string;

  @Column({ nullable: true, type: 'text' })
  description?: string;

  @Column({
    type: 'enum',
    enum: AchievementCategory,
    default: AchievementCategory.LEARNING,
  })
  category: AchievementCategory;

  @Column({ nullable: true, name: 'icon_name', length: 50 })
  iconName?: string;

  @Column({ nullable: true, name: 'badge_image_url', type: 'text' })
  badgeImageUrl?: string;

  @Column({ nullable: true, type: 'jsonb' })
  criteria?: Record<string, any>;

  @Column({ default: 0, name: 'xp_reward' })
  xpReward: number;

  @Column({ default: 1 })
  tier: number;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ default: 0, name: 'display_order' })
  displayOrder: number;

  // Relations
  @OneToMany(() => StudentAchievement, (sa) => sa.achievement)
  studentAchievements: StudentAchievement[];
}
