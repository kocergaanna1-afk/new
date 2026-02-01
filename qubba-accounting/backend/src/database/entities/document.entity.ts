import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentType {
  // Входящие
  INVOICE_INCOMING = 'invoice_incoming',         // Счёт на оплату входящий
  INVOICE_FACTURA_INCOMING = 'invoice_factura_incoming', // Счёт-фактура входящий
  UPD_INCOMING = 'upd_incoming',                 // УПД входящий
  TORG12_INCOMING = 'torg12_incoming',           // ТОРГ-12 входящий
  ACT_INCOMING = 'act_incoming',                 // Акт выполненных работ входящий
  
  // Исходящие
  INVOICE_OUTGOING = 'invoice_outgoing',         // Счёт на оплату исходящий
  INVOICE_FACTURA_OUTGOING = 'invoice_factura_outgoing', // Счёт-фактура исходящий
  UPD_OUTGOING = 'upd_outgoing',                 // УПД исходящий
  TORG12_OUTGOING = 'torg12_outgoing',           // ТОРГ-12 исходящий
  ACT_OUTGOING = 'act_outgoing',                 // Акт выполненных работ исходящий
  
  // Банковские
  BANK_STATEMENT = 'bank_statement',             // Выписка
  PAYMENT_ORDER = 'payment_order',               // Платёжное поручение
  
  // Маркетплейсы
  MP_SALE = 'mp_sale',                           // Реализация на МП
  MP_RETURN = 'mp_return',                       // Возврат на МП
  MP_COMMISSION = 'mp_commission',               // Комиссия МП
  MP_LOGISTICS = 'mp_logistics',                 // Логистика МП
  MP_PENALTY = 'mp_penalty',                     // Штраф МП
  MP_RECONCILIATION = 'mp_reconciliation',       // Акт сверки с МП
  
  // Кадровые
  EMPLOYMENT_ORDER = 'employment_order',         // Приказ о приёме
  DISMISSAL_ORDER = 'dismissal_order',           // Приказ об увольнении
  VACATION_ORDER = 'vacation_order',             // Приказ на отпуск
  
  // Зарплатные
  PAYROLL = 'payroll',                           // Ведомость
  PAYSLIP = 'payslip',                           // Расчётный листок
}

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_APPROVAL = 'pending_approval',
  APPROVED = 'approved',
  POSTED = 'posted',    // Проведён (созданы проводки)
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export enum DocumentDirection {
  INCOMING = 'incoming',
  OUTGOING = 'outgoing',
  INTERNAL = 'internal',
}

@Entity('documents')
@Index(['organizationId', 'documentDate'])
@Index(['documentType', 'organizationId'])
@Index(['counterpartyId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({
    type: 'enum',
    enum: DocumentType,
  })
  documentType: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentDirection,
  })
  direction: DocumentDirection;

  @Column()
  documentNumber: string;

  @Column({ type: 'date' })
  documentDate: Date;

  @Column({ nullable: true })
  externalNumber: string; // Номер контрагента/МП

  @Column({ type: 'date', nullable: true })
  externalDate: Date;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status: DocumentStatus;

  // Суммы
  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, default: 0 })
  vatAmount: number;

  @Column({ type: 'int', default: 20 })
  vatRate: number;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  totalAmount: number;

  @Column({ default: 'RUB' })
  currency: string;

  // Контрагент
  @Column({ nullable: true })
  counterpartyId: string;

  @Column({ nullable: true })
  counterpartyName: string;

  @Column({ nullable: true })
  counterpartyInn: string;

  // Договор
  @Column({ nullable: true })
  contractId: string;

  @Column({ nullable: true })
  contractNumber: string;

  // Содержимое документа
  @Column({ type: 'jsonb', nullable: true })
  items: Array<{
    lineNumber: number;
    itemId?: string;
    itemName: string;
    itemCode?: string;
    quantity: number;
    unit: string;
    price: number;
    amount: number;
    vatRate: number;
    vatAmount: number;
    totalAmount: number;
  }>;

  @Column({ nullable: true })
  description: string;

  // Файлы
  @Column('simple-array', { nullable: true })
  attachmentIds: string[];

  // Источник документа
  @Column({ nullable: true })
  sourceSystem: string; // wms, wildberries, ozon, manual

  @Column({ nullable: true })
  sourceDocumentId: string;

  // Связанные проводки
  @Column('simple-array', { nullable: true })
  postingIds: string[];

  @Column('uuid')
  organizationId: string;

  @Column('uuid')
  createdById: string;

  @Column({ nullable: true })
  approvedById: string;

  @Column({ nullable: true })
  approvedAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// Контрагенты
@Entity('counterparties')
@Index(['organizationId', 'inn'])
export class Counterparty {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  shortName: string;

  @Column({ nullable: true })
  inn: string;

  @Column({ nullable: true })
  kpp: string;

  @Column({ nullable: true })
  ogrn: string;

  @Column({ nullable: true })
  legalAddress: string;

  @Column({ nullable: true })
  actualAddress: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  // Банковские реквизиты
  @Column({ nullable: true })
  bankAccountNumber: string;

  @Column({ nullable: true })
  bankName: string;

  @Column({ nullable: true })
  bankBik: string;

  @Column({ nullable: true })
  correspondentAccount: string;

  // Категория
  @Column({ default: false })
  isSupplier: boolean;

  @Column({ default: false })
  isCustomer: boolean;

  @Column({ default: false })
  isMarketplace: boolean;

  @Column({ nullable: true })
  marketplaceType: string; // wildberries, ozon, yandex

  @Column({ default: true })
  isActive: boolean;

  @Column('uuid')
  organizationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
