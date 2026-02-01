import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { Posting, PostingStatus, JournalEntry, Account } from '../../database/entities';
import {
  CreatePostingDto,
  UpdatePostingDto,
  PostingFilterDto,
  JournalEntryDto,
  PostingResponseDto,
} from '../dto/posting.dto';
import { AccountBalanceDto } from '../dto/account.dto';
import { AccountService } from './account.service';

@Injectable()
export class PostingService {
  constructor(
    @InjectRepository(Posting)
    private postingRepository: Repository<Posting>,
    @InjectRepository(JournalEntry)
    private journalEntryRepository: Repository<JournalEntry>,
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
    private accountService: AccountService,
  ) {}

  async findAll(
    filter: PostingFilterDto,
    organizationId: string,
  ): Promise<{ data: PostingResponseDto[]; total: number }> {
    const query = this.postingRepository
      .createQueryBuilder('posting')
      .leftJoinAndSelect('posting.debitAccount', 'debitAccount')
      .leftJoinAndSelect('posting.creditAccount', 'creditAccount')
      .where('posting.organizationId = :organizationId', { organizationId })
      .orderBy('posting.postingDate', 'DESC')
      .addOrderBy('posting.createdAt', 'DESC');

    if (filter.dateFrom) {
      query.andWhere('posting.postingDate >= :dateFrom', {
        dateFrom: filter.dateFrom,
      });
    }

    if (filter.dateTo) {
      query.andWhere('posting.postingDate <= :dateTo', {
        dateTo: filter.dateTo,
      });
    }

    if (filter.accountCode) {
      query.andWhere(
        '(debitAccount.code = :accountCode OR creditAccount.code = :accountCode)',
        { accountCode: filter.accountCode },
      );
    }

    if (filter.status) {
      query.andWhere('posting.status = :status', { status: filter.status });
    }

    const page = filter.page || 1;
    const limit = filter.limit || 50;
    const skip = (page - 1) * limit;

    const [postings, total] = await query.skip(skip).take(limit).getManyAndCount();

    const data = postings.map((posting) => this.toResponseDto(posting));

    return { data, total };
  }

  async findById(id: string, organizationId: string): Promise<PostingResponseDto> {
    const posting = await this.postingRepository.findOne({
      where: { id, organizationId },
      relations: ['debitAccount', 'creditAccount'],
    });

    if (!posting) {
      throw new NotFoundException('Проводка не найдена');
    }

    return this.toResponseDto(posting);
  }

  async create(
    dto: CreatePostingDto,
    organizationId: string,
    userId: string,
  ): Promise<PostingResponseDto> {
    // Find accounts by code
    const debitAccount = await this.accountService.findByCode(
      dto.debitAccountCode,
      organizationId,
    );
    const creditAccount = await this.accountService.findByCode(
      dto.creditAccountCode,
      organizationId,
    );

    if (!debitAccount.isActive) {
      throw new BadRequestException(
        `Счёт ${dto.debitAccountCode} деактивирован`,
      );
    }

    if (!creditAccount.isActive) {
      throw new BadRequestException(
        `Счёт ${dto.creditAccountCode} деактивирован`,
      );
    }

    const posting = this.postingRepository.create({
      postingDate: dto.postingDate,
      debitAccountId: debitAccount.id,
      creditAccountId: creditAccount.id,
      amount: dto.amount,
      description: dto.description,
      debitAnalytics: dto.debitAnalytics,
      creditAnalytics: dto.creditAnalytics,
      quantity: dto.quantity,
      unitOfMeasure: dto.unitOfMeasure,
      currency: dto.currency || 'RUB',
      currencyAmount: dto.currencyAmount,
      exchangeRate: dto.exchangeRate,
      documentId: dto.documentId,
      documentType: dto.documentType,
      status: PostingStatus.POSTED,
      organizationId,
      createdById: userId,
    });

    const savedPosting = await this.postingRepository.save(posting);

    // Reload with relations
    const result = await this.postingRepository.findOne({
      where: { id: savedPosting.id },
      relations: ['debitAccount', 'creditAccount'],
    });

    return this.toResponseDto(result!);
  }

  async createJournalEntry(
    dto: JournalEntryDto,
    organizationId: string,
    userId: string,
  ): Promise<JournalEntry> {
    // Validate that debits equal credits
    let totalDebit = 0;
    let totalCredit = 0;

    for (const posting of dto.postings) {
      totalDebit += posting.amount;
      totalCredit += posting.amount;
    }

    // Generate entry number
    const lastEntry = await this.journalEntryRepository.findOne({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    const entryNumber = lastEntry
      ? `JE-${String(parseInt(lastEntry.entryNumber.split('-')[1] || '0') + 1).padStart(6, '0')}`
      : 'JE-000001';

    // Create journal entry
    const journalEntry = this.journalEntryRepository.create({
      entryNumber,
      entryDate: dto.entryDate,
      description: dto.description,
      postings: dto.postings.map((p) => ({
        debitAccountCode: p.debitAccountCode,
        creditAccountCode: p.creditAccountCode,
        amount: p.amount,
        description: p.description,
      })),
      totalAmount: totalDebit,
      documentId: dto.documentId,
      documentType: dto.documentType,
      status: PostingStatus.DRAFT,
      organizationId,
      createdById: userId,
    });

    return this.journalEntryRepository.save(journalEntry);
  }

  async postJournalEntry(
    entryId: string,
    organizationId: string,
    userId: string,
  ): Promise<Posting[]> {
    const entry = await this.journalEntryRepository.findOne({
      where: { id: entryId, organizationId },
    });

    if (!entry) {
      throw new NotFoundException('Операция не найдена');
    }

    if (entry.status === PostingStatus.POSTED) {
      throw new BadRequestException('Операция уже проведена');
    }

    const createdPostings: Posting[] = [];

    for (const postingData of entry.postings) {
      const posting = await this.create(
        {
          postingDate: entry.entryDate,
          debitAccountCode: postingData.debitAccountCode,
          creditAccountCode: postingData.creditAccountCode,
          amount: postingData.amount,
          description: postingData.description || entry.description,
          documentId: entry.documentId,
          documentType: entry.documentType,
        },
        organizationId,
        userId,
      );
      
      const fullPosting = await this.postingRepository.findOne({
        where: { id: posting.id },
      });
      if (fullPosting) {
        createdPostings.push(fullPosting);
      }
    }

    // Update journal entry status
    entry.status = PostingStatus.POSTED;
    await this.journalEntryRepository.save(entry);

    return createdPostings;
  }

  async update(
    id: string,
    dto: UpdatePostingDto,
    organizationId: string,
  ): Promise<PostingResponseDto> {
    const posting = await this.postingRepository.findOne({
      where: { id, organizationId },
      relations: ['debitAccount', 'creditAccount'],
    });

    if (!posting) {
      throw new NotFoundException('Проводка не найдена');
    }

    if (posting.status === PostingStatus.CANCELLED) {
      throw new BadRequestException('Нельзя редактировать отменённую проводку');
    }

    Object.assign(posting, dto);
    const savedPosting = await this.postingRepository.save(posting);

    return this.toResponseDto(savedPosting);
  }

  async cancel(id: string, organizationId: string): Promise<PostingResponseDto> {
    const posting = await this.postingRepository.findOne({
      where: { id, organizationId },
      relations: ['debitAccount', 'creditAccount'],
    });

    if (!posting) {
      throw new NotFoundException('Проводка не найдена');
    }

    posting.status = PostingStatus.CANCELLED;
    const savedPosting = await this.postingRepository.save(posting);

    return this.toResponseDto(savedPosting);
  }

  // Оборотно-сальдовая ведомость
  async getTrialBalance(
    dateFrom: Date,
    dateTo: Date,
    organizationId: string,
  ): Promise<AccountBalanceDto[]> {
    const accounts = await this.accountRepository.find({
      where: { organizationId, isActive: true },
      order: { code: 'ASC' },
    });

    const result: AccountBalanceDto[] = [];

    for (const account of accounts) {
      // Opening balance (before dateFrom)
      const openingDebit = await this.getAccountTurnover(
        account.id,
        organizationId,
        null,
        new Date(dateFrom.getTime() - 1),
        'debit',
      );

      const openingCredit = await this.getAccountTurnover(
        account.id,
        organizationId,
        null,
        new Date(dateFrom.getTime() - 1),
        'credit',
      );

      // Period turnover
      const turnoverDebit = await this.getAccountTurnover(
        account.id,
        organizationId,
        dateFrom,
        dateTo,
        'debit',
      );

      const turnoverCredit = await this.getAccountTurnover(
        account.id,
        organizationId,
        dateFrom,
        dateTo,
        'credit',
      );

      // Calculate balances
      const openingBalance = openingDebit - openingCredit;
      const closingBalance = openingBalance + turnoverDebit - turnoverCredit;

      // Only include accounts with any activity
      if (
        openingDebit !== 0 ||
        openingCredit !== 0 ||
        turnoverDebit !== 0 ||
        turnoverCredit !== 0
      ) {
        result.push({
          accountId: account.id,
          accountCode: account.code,
          accountName: account.name,
          openingDebit: openingBalance > 0 ? openingBalance : 0,
          openingCredit: openingBalance < 0 ? Math.abs(openingBalance) : 0,
          turnoverDebit,
          turnoverCredit,
          closingDebit: closingBalance > 0 ? closingBalance : 0,
          closingCredit: closingBalance < 0 ? Math.abs(closingBalance) : 0,
        });
      }
    }

    return result;
  }

  // Карточка счёта
  async getAccountCard(
    accountCode: string,
    dateFrom: Date,
    dateTo: Date,
    organizationId: string,
  ): Promise<{
    account: Account;
    openingBalance: number;
    entries: Array<{
      date: Date;
      description: string;
      correspondingAccount: string;
      debit: number;
      credit: number;
      balance: number;
    }>;
    closingBalance: number;
  }> {
    const account = await this.accountService.findByCode(accountCode, organizationId);

    // Get opening balance
    const openingDebit = await this.getAccountTurnover(
      account.id,
      organizationId,
      null,
      new Date(dateFrom.getTime() - 1),
      'debit',
    );

    const openingCredit = await this.getAccountTurnover(
      account.id,
      organizationId,
      null,
      new Date(dateFrom.getTime() - 1),
      'credit',
    );

    const openingBalance = openingDebit - openingCredit;

    // Get postings for the period
    const postings = await this.postingRepository.find({
      where: [
        {
          debitAccountId: account.id,
          organizationId,
          status: PostingStatus.POSTED,
          postingDate: Between(dateFrom, dateTo),
        },
        {
          creditAccountId: account.id,
          organizationId,
          status: PostingStatus.POSTED,
          postingDate: Between(dateFrom, dateTo),
        },
      ],
      relations: ['debitAccount', 'creditAccount'],
      order: { postingDate: 'ASC', createdAt: 'ASC' },
    });

    let balance = openingBalance;
    const entries = postings.map((posting) => {
      const isDebit = posting.debitAccountId === account.id;
      const debit = isDebit ? Number(posting.amount) : 0;
      const credit = !isDebit ? Number(posting.amount) : 0;
      balance = balance + debit - credit;

      return {
        date: posting.postingDate,
        description: posting.description || '',
        correspondingAccount: isDebit
          ? posting.creditAccount.code
          : posting.debitAccount.code,
        debit,
        credit,
        balance,
      };
    });

    return {
      account,
      openingBalance,
      entries,
      closingBalance: balance,
    };
  }

  private async getAccountTurnover(
    accountId: string,
    organizationId: string,
    dateFrom: Date | null,
    dateTo: Date,
    type: 'debit' | 'credit',
  ): Promise<number> {
    const query = this.postingRepository
      .createQueryBuilder('posting')
      .select(`SUM(posting.amount)`, 'total')
      .where('posting.organizationId = :organizationId', { organizationId })
      .andWhere('posting.status = :status', { status: PostingStatus.POSTED })
      .andWhere('posting.postingDate <= :dateTo', { dateTo });

    if (dateFrom) {
      query.andWhere('posting.postingDate >= :dateFrom', { dateFrom });
    }

    if (type === 'debit') {
      query.andWhere('posting.debitAccountId = :accountId', { accountId });
    } else {
      query.andWhere('posting.creditAccountId = :accountId', { accountId });
    }

    const result = await query.getRawOne();
    return Number(result?.total || 0);
  }

  private toResponseDto(posting: Posting): PostingResponseDto {
    return {
      id: posting.id,
      postingDate: posting.postingDate,
      debitAccount: {
        id: posting.debitAccount.id,
        code: posting.debitAccount.code,
        name: posting.debitAccount.name,
      },
      creditAccount: {
        id: posting.creditAccount.id,
        code: posting.creditAccount.code,
        name: posting.creditAccount.name,
      },
      amount: Number(posting.amount),
      description: posting.description,
      status: posting.status,
      debitAnalytics: posting.debitAnalytics,
      creditAnalytics: posting.creditAnalytics,
      quantity: posting.quantity ? Number(posting.quantity) : null,
      unitOfMeasure: posting.unitOfMeasure,
      currency: posting.currency,
      documentId: posting.documentId,
      documentType: posting.documentType,
      createdAt: posting.createdAt,
    };
  }
}
