import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';

export enum AccountType {
  ACTIVE = 'active',       // Активный (дебетовое сальдо)
  PASSIVE = 'passive',     // Пассивный (кредитовое сальдо)
  ACTIVE_PASSIVE = 'active_passive', // Активно-пассивный
}

export enum AccountCategory {
  BALANCE = 'balance',           // Балансовый
  OFF_BALANCE = 'off_balance',   // Забалансовый
}

@Entity('chart_of_accounts')
@Index(['code', 'organizationId'], { unique: true })
export class Account {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 10 })
  code: string; // Например: 01, 10.01, 60.01

  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: AccountType,
    default: AccountType.ACTIVE,
  })
  type: AccountType;

  @Column({
    type: 'enum',
    enum: AccountCategory,
    default: AccountCategory.BALANCE,
  })
  category: AccountCategory;

  @Column({ nullable: true })
  parentId: string;

  @ManyToOne(() => Account, (account) => account.children)
  @JoinColumn({ name: 'parentId' })
  parent: Account;

  @OneToMany(() => Account, (account) => account.parent)
  children: Account[];

  @Column({ default: false })
  isSystem: boolean; // Системный счёт (нельзя удалить)

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  requiresAnalytics: boolean; // Требуется аналитика (субконто)

  @Column('simple-array', { nullable: true })
  analyticsTypes: string[]; // Типы аналитики: counterparty, contract, item

  @Column({ default: false })
  isCurrency: boolean; // Валютный учёт

  @Column({ default: false })
  isQuantity: boolean; // Количественный учёт

  @Column('uuid')
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Субконто (аналитика)
@Entity('analytics_types')
export class AnalyticsType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  code: string; // counterparty, contract, item, employee, etc.

  @Column()
  name: string;

  @Column()
  entityType: string; // Связанная сущность

  @Column('uuid')
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;
}
