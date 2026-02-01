import {
  IsString,
  IsNumber,
  IsDate,
  IsOptional,
  IsEnum,
  IsObject,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { PostingStatus } from '../../database/entities';

export class AnalyticsDto {
  @IsString()
  @IsOptional()
  counterpartyId?: string;

  @IsString()
  @IsOptional()
  contractId?: string;

  @IsString()
  @IsOptional()
  itemId?: string;

  @IsString()
  @IsOptional()
  employeeId?: string;
}

export class CreatePostingDto {
  @Transform(({ value }) => new Date(value))
  @IsDate()
  postingDate: Date;

  @IsString()
  debitAccountCode: string;

  @IsString()
  creditAccountCode: string;

  @IsNumber()
  @Min(0.01, { message: 'Сумма должна быть больше 0' })
  amount: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsDto)
  debitAnalytics?: AnalyticsDto;

  @IsObject()
  @IsOptional()
  @ValidateNested()
  @Type(() => AnalyticsDto)
  creditAnalytics?: AnalyticsDto;

  @IsNumber()
  @IsOptional()
  quantity?: number;

  @IsString()
  @IsOptional()
  unitOfMeasure?: string;

  @IsString()
  @IsOptional()
  currency?: string;

  @IsNumber()
  @IsOptional()
  currencyAmount?: number;

  @IsNumber()
  @IsOptional()
  exchangeRate?: number;

  @IsString()
  @IsOptional()
  documentId?: string;

  @IsString()
  @IsOptional()
  documentType?: string;
}

export class UpdatePostingDto {
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  @IsOptional()
  postingDate?: Date;

  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsEnum(PostingStatus)
  @IsOptional()
  status?: PostingStatus;
}

export class PostingFilterDto {
  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  @IsOptional()
  dateFrom?: Date;

  @Transform(({ value }) => value ? new Date(value) : undefined)
  @IsDate()
  @IsOptional()
  dateTo?: Date;

  @IsString()
  @IsOptional()
  accountCode?: string;

  @IsString()
  @IsOptional()
  counterpartyId?: string;

  @IsEnum(PostingStatus)
  @IsOptional()
  status?: PostingStatus;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsNumber()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 50;
}

export class JournalEntryDto {
  @IsString()
  description: string;

  @Transform(({ value }) => new Date(value))
  @IsDate()
  entryDate: Date;

  @ValidateNested({ each: true })
  @Type(() => CreatePostingDto)
  postings: CreatePostingDto[];

  @IsString()
  @IsOptional()
  documentId?: string;

  @IsString()
  @IsOptional()
  documentType?: string;
}

export class PostingResponseDto {
  id: string;
  postingDate: Date;
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
  description: string | null;
  status: PostingStatus;
  debitAnalytics: AnalyticsDto | null;
  creditAnalytics: AnalyticsDto | null;
  quantity: number | null;
  unitOfMeasure: string | null;
  currency: string;
  documentId: string | null;
  documentType: string | null;
  createdAt: Date;
}
