import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  MaxLength,
} from 'class-validator';
import { AccountType, AccountCategory } from '../../database/entities';

export class CreateAccountDto {
  @IsString()
  @MaxLength(10)
  code: string;

  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsEnum(AccountCategory)
  @IsOptional()
  category?: AccountCategory;

  @IsString()
  @IsOptional()
  parentId?: string;

  @IsBoolean()
  @IsOptional()
  requiresAnalytics?: boolean;

  @IsArray()
  @IsOptional()
  analyticsTypes?: string[];

  @IsBoolean()
  @IsOptional()
  isCurrency?: boolean;

  @IsBoolean()
  @IsOptional()
  isQuantity?: boolean;
}

export class UpdateAccountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(AccountType)
  @IsOptional()
  type?: AccountType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  requiresAnalytics?: boolean;

  @IsArray()
  @IsOptional()
  analyticsTypes?: string[];
}

export class AccountResponseDto {
  id: string;
  code: string;
  name: string;
  description: string | null;
  type: AccountType;
  category: AccountCategory;
  parentId: string | null;
  isSystem: boolean;
  isActive: boolean;
  requiresAnalytics: boolean;
  analyticsTypes: string[] | null;
  isCurrency: boolean;
  isQuantity: boolean;
  children?: AccountResponseDto[];
}

export class AccountBalanceDto {
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
