// User types
export enum UserRole {
  ADMIN = 'admin',
  CHIEF_ACCOUNTANT = 'chief_accountant',
  ACCOUNTANT = 'accountant',
  HR_MANAGER = 'hr_manager',
  VIEWER = 'viewer',
}

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  role: UserRole;
  organizationId: string;
}

export interface Organization {
  id: string;
  name: string;
  inn: string;
  kpp?: string;
  taxSystem: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: User & { organizationName: string };
}

// Account types
export enum AccountType {
  ACTIVE = 'active',
  PASSIVE = 'passive',
  ACTIVE_PASSIVE = 'active_passive',
}

export enum AccountCategory {
  BALANCE = 'balance',
  OFF_BALANCE = 'off_balance',
}

export interface Account {
  id: string;
  code: string;
  name: string;
  description?: string;
  type: AccountType;
  category: AccountCategory;
  parentId?: string;
  isSystem: boolean;
  isActive: boolean;
  requiresAnalytics: boolean;
  analyticsTypes?: string[];
  isCurrency: boolean;
  isQuantity: boolean;
  children?: Account[];
}

// Posting types
export enum PostingStatus {
  DRAFT = 'draft',
  POSTED = 'posted',
  CANCELLED = 'cancelled',
}

export interface Analytics {
  counterpartyId?: string;
  contractId?: string;
  itemId?: string;
  employeeId?: string;
}

export interface Posting {
  id: string;
  postingDate: string;
  debitAccount: {
    id: string;
    code: string;
    name: string;
  };
  creditAccount: {
    id: string;
    code: string;
    name: string;
  };
  amount: number;
  description?: string;
  status: PostingStatus;
  debitAnalytics?: Analytics;
  creditAnalytics?: Analytics;
  quantity?: number;
  unitOfMeasure?: string;
  currency: string;
  documentId?: string;
  documentType?: string;
  createdAt: string;
}

export interface CreatePostingDto {
  postingDate: string;
  debitAccountCode: string;
  creditAccountCode: string;
  amount: number;
  description?: string;
  debitAnalytics?: Analytics;
  creditAnalytics?: Analytics;
  quantity?: number;
  unitOfMeasure?: string;
  currency?: string;
  documentId?: string;
  documentType?: string;
}

// Report types
export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  openingDebit: number;
  openingCredit: number;
  turnoverDebit: number;
  turnoverCredit: number;
  closingDebit: number;
  closingCredit: number;
}

export interface TrialBalanceResponse {
  period: {
    from: string;
    to: string;
  };
  data: AccountBalance[];
  totals: {
    openingDebit: number;
    openingCredit: number;
    turnoverDebit: number;
    turnoverCredit: number;
    closingDebit: number;
    closingCredit: number;
  };
}

export interface AccountCardEntry {
  date: string;
  description: string;
  correspondingAccount: string;
  debit: number;
  credit: number;
  balance: number;
}

export interface AccountCardResponse {
  account: Account;
  openingBalance: number;
  entries: AccountCardEntry[];
  closingBalance: number;
}

// Pagination
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
}

// API Error
export interface ApiError {
  statusCode: number;
  message: string;
  error?: string;
}
