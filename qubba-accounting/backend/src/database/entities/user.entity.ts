import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';

export enum UserRole {
  ADMIN = 'admin',
  CHIEF_ACCOUNTANT = 'chief_accountant',
  ACCOUNTANT = 'accountant',
  HR_MANAGER = 'hr_manager',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  passwordHash: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.ACCOUNTANT,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ nullable: true })
  lastLoginAt: Date;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.users)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
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
  directorName: string;

  @Column({ nullable: true })
  chiefAccountantName: string;

  @Column({
    type: 'varchar',
    default: 'usn_6',
  })
  taxSystem: string; // osno, usn_6, usn_15, eshn, patent

  @Column({ default: false })
  isVatPayer: boolean;

  @Column({ type: 'int', default: 20 })
  vatRate: number;

  @OneToMany(() => User, (user) => user.organization)
  users: User[];

  @OneToMany(() => BankAccount, (account) => account.organization)
  bankAccounts: BankAccount[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

@Entity('bank_accounts')
export class BankAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  accountNumber: string;

  @Column()
  bankName: string;

  @Column()
  bik: string;

  @Column()
  correspondentAccount: string;

  @Column({ default: 'RUB' })
  currency: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: false })
  isMain: boolean;

  @Column('uuid')
  organizationId: string;

  @ManyToOne(() => Organization, (org) => org.bankAccounts)
  @JoinColumn({ name: 'organizationId' })
  organization: Organization;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
