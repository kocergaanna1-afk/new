import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Account } from './account.entity';

export enum PostingStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

// Бухгалтерская проводка
@Entity('postings')
@Index(['organizationId', 'postingDate'])
@Index(['documentId'])
export class Posting {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'date' })
  postingDate: Date;

  @Column()
  debitAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'debitAccountId' })
  debitAccount: Account;

  @Column()
  creditAccountId: string;

  @ManyToOne(() => Account)
  @JoinColumn({ name: 'creditAccountId' })
  creditAccount: Account;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: PostingStatus,
    default: PostingStatus.POSTED,
  })
  status: PostingStatus;

  // Связь с документом-основанием
  @Column({ nullable: true })
  documentId: string;

  @Column({ nullable: true })
  documentType: string; // invoice, payment, sale, etc.

  // Аналитика по дебету
  @Column({ type: 'jsonb', nullable: true })
  debitAnalytics: {
    counterpartyId?: string;
    contractId?: string;
    itemId?: string;
    employeeId?: string;
  };

  // Аналитика по кредиту
  @Column({ type: 'jsonb', nullable: true })
  creditAnalytics: {
    counterpartyId?: string;
    contractId?: string;
    itemId?: string;
    employeeId?: string;
  };

  // Количественный учёт
  @Column({ type: 'decimal', precision: 18, scale: 4, nullable: true })
  quantity: number;

  @Column({ nullable: true })
  unitOfMeasure: string;

  // Валютный учёт
  @Column({ default: 'RUB' })
  currency: string;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  currencyAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  exchangeRate: number;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Операция (группа проводок)
@Entity('journal_entries')
@Index(['organizationId', 'entryDate'])
export class JournalEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  entryNumber: string;

  @Column({ type: 'date' })
  entryDate: Date;

  @Column()
  description: string;

  @Column({
    type: 'enum',
    enum: PostingStatus,
    default: PostingStatus.DRAFT,
  })
  status: PostingStatus;

  @Column({ type: 'jsonb' })
  postings: Array<{
    debitAccountCode: string;
    creditAccountCode: string;
    amount: number;
    description?: string;
    analytics?: Record<string, string>;
  }>;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  // Связь с документом
  @Column({ nullable: true })
  documentId: string;

  @Column({ nullable: true })
  documentType: string;

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  createdById: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
