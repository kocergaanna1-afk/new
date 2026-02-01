import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Account, AccountType, AccountCategory } from '../../database/entities';
import { CreateAccountDto, UpdateAccountDto, AccountResponseDto } from '../dto/account.dto';

@Injectable()
export class AccountService {
  constructor(
    @InjectRepository(Account)
    private accountRepository: Repository<Account>,
  ) {}

  async findAll(organizationId: string): Promise<AccountResponseDto[]> {
    const accounts = await this.accountRepository.find({
      where: { organizationId },
      order: { code: 'ASC' },
    });

    return this.buildAccountTree(accounts);
  }

  async findByCode(code: string, organizationId: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { code, organizationId },
    });

    if (!account) {
      throw new NotFoundException(`Счёт ${code} не найден`);
    }

    return account;
  }

  async findById(id: string, organizationId: string): Promise<Account> {
    const account = await this.accountRepository.findOne({
      where: { id, organizationId },
    });

    if (!account) {
      throw new NotFoundException('Счёт не найден');
    }

    return account;
  }

  async create(dto: CreateAccountDto, organizationId: string): Promise<Account> {
    // Check if account code already exists
    const existing = await this.accountRepository.findOne({
      where: { code: dto.code, organizationId },
    });

    if (existing) {
      throw new ConflictException(`Счёт с кодом ${dto.code} уже существует`);
    }

    // Validate parent if provided
    if (dto.parentId) {
      const parent = await this.accountRepository.findOne({
        where: { id: dto.parentId, organizationId },
      });
      if (!parent) {
        throw new NotFoundException('Родительский счёт не найден');
      }
    }

    const account = this.accountRepository.create({
      ...dto,
      organizationId,
    });

    return this.accountRepository.save(account);
  }

  async update(
    id: string,
    dto: UpdateAccountDto,
    organizationId: string,
  ): Promise<Account> {
    const account = await this.findById(id, organizationId);

    if (account.isSystem && dto.isActive === false) {
      throw new BadRequestException('Нельзя деактивировать системный счёт');
    }

    Object.assign(account, dto);
    return this.accountRepository.save(account);
  }

  async delete(id: string, organizationId: string): Promise<void> {
    const account = await this.findById(id, organizationId);

    if (account.isSystem) {
      throw new BadRequestException('Нельзя удалить системный счёт');
    }

    // Check if account has children
    const children = await this.accountRepository.count({
      where: { parentId: id, organizationId },
    });

    if (children > 0) {
      throw new BadRequestException(
        'Нельзя удалить счёт с субсчетами. Сначала удалите субсчета.',
      );
    }

    // TODO: Check if account has postings

    await this.accountRepository.remove(account);
  }

  async initializeStandardAccounts(organizationId: string): Promise<void> {
    const standardAccounts = this.getStandardChartOfAccounts();

    for (const accountData of standardAccounts) {
      const exists = await this.accountRepository.findOne({
        where: { code: accountData.code, organizationId },
      });

      if (!exists) {
        const account = this.accountRepository.create({
          ...accountData,
          organizationId,
          isSystem: true,
        });
        await this.accountRepository.save(account);
      }
    }

    // Now set parent relationships
    await this.setParentRelationships(organizationId);
  }

  private async setParentRelationships(organizationId: string): Promise<void> {
    const accounts = await this.accountRepository.find({
      where: { organizationId },
      order: { code: 'ASC' },
    });

    for (const account of accounts) {
      if (account.code.includes('.')) {
        const parentCode = account.code.split('.').slice(0, -1).join('.');
        const parent = accounts.find((a) => a.code === parentCode);
        if (parent && account.parentId !== parent.id) {
          account.parentId = parent.id;
          await this.accountRepository.save(account);
        }
      }
    }
  }

  private buildAccountTree(accounts: Account[]): AccountResponseDto[] {
    const accountMap = new Map<string, AccountResponseDto>();
    const rootAccounts: AccountResponseDto[] = [];

    // First pass: create response objects
    for (const account of accounts) {
      accountMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        description: account.description,
        type: account.type,
        category: account.category,
        parentId: account.parentId,
        isSystem: account.isSystem,
        isActive: account.isActive,
        requiresAnalytics: account.requiresAnalytics,
        analyticsTypes: account.analyticsTypes,
        isCurrency: account.isCurrency,
        isQuantity: account.isQuantity,
        children: [],
      });
    }

    // Second pass: build tree
    for (const account of accounts) {
      const accountDto = accountMap.get(account.id)!;
      if (account.parentId && accountMap.has(account.parentId)) {
        const parent = accountMap.get(account.parentId)!;
        parent.children = parent.children || [];
        parent.children.push(accountDto);
      } else {
        rootAccounts.push(accountDto);
      }
    }

    return rootAccounts;
  }

  private getStandardChartOfAccounts(): Partial<Account>[] {
    return [
      // Внеоборотные активы
      { code: '01', name: 'Основные средства', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '02', name: 'Амортизация основных средств', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '04', name: 'Нематериальные активы', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '05', name: 'Амортизация НМА', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      
      // Производственные запасы
      { code: '10', name: 'Материалы', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      { code: '10.01', name: 'Сырье и материалы', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      { code: '10.09', name: 'Инвентарь и хозпринадлежности', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      
      // Товары
      { code: '41', name: 'Товары', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      { code: '41.01', name: 'Товары на складах', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      { code: '41.02', name: 'Товары в розничной торговле', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      { code: '41.03', name: 'Товары на маркетплейсах', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isQuantity: true },
      
      // Расходы на продажу
      { code: '44', name: 'Расходы на продажу', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '44.01', name: 'Издержки обращения', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '44.02', name: 'Коммерческие расходы', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      
      // Денежные средства
      { code: '50', name: 'Касса', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '50.01', name: 'Касса организации', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '51', name: 'Расчетные счета', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '51.01', name: 'Расчетный счет (основной)', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '52', name: 'Валютные счета', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, isCurrency: true },
      { code: '57', name: 'Переводы в пути', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      
      // Расчеты с поставщиками
      { code: '60', name: 'Расчеты с поставщиками и подрядчиками', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty', 'contract'] },
      { code: '60.01', name: 'Расчеты с поставщиками', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty', 'contract'] },
      { code: '60.02', name: 'Авансы выданные', type: AccountType.ACTIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty', 'contract'] },
      
      // Расчеты с покупателями
      { code: '62', name: 'Расчеты с покупателями и заказчиками', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty', 'contract'] },
      { code: '62.01', name: 'Расчеты с покупателями', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty', 'contract'] },
      { code: '62.02', name: 'Авансы полученные', type: AccountType.PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty', 'contract'] },
      { code: '62.03', name: 'Расчеты с маркетплейсами', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty'] },
      
      // Налоги
      { code: '68', name: 'Расчеты по налогам и сборам', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      { code: '68.01', name: 'НДФЛ', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '68.02', name: 'НДС', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      { code: '68.04', name: 'Налог на прибыль', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '68.12', name: 'УСН', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      
      // Страховые взносы
      { code: '69', name: 'Расчеты по социальному страхованию', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      { code: '69.01', name: 'Расчеты по соцстраху', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '69.02', name: 'Расчеты по пенсионному обеспечению', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '69.03', name: 'Расчеты по медстраху', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      
      // Расчеты с персоналом
      { code: '70', name: 'Расчеты с персоналом по оплате труда', type: AccountType.PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['employee'] },
      
      // Подотчетные лица
      { code: '71', name: 'Расчеты с подотчетными лицами', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['employee'] },
      
      // Прочие расчеты
      { code: '76', name: 'Расчеты с разными дебиторами и кредиторами', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty'] },
      { code: '76.05', name: 'Расчеты с прочими поставщиками', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty'] },
      { code: '76.06', name: 'Расчеты с прочими покупателями', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty'] },
      { code: '76.09', name: 'Прочие расчеты', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE, requiresAnalytics: true, analyticsTypes: ['counterparty'] },
      
      // Капитал
      { code: '80', name: 'Уставный капитал', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '84', name: 'Нераспределенная прибыль (непокрытый убыток)', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      
      // Продажи
      { code: '90', name: 'Продажи', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      { code: '90.01', name: 'Выручка', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '90.01.1', name: 'Выручка по деятельности с основной системой н/о', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '90.02', name: 'Себестоимость продаж', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '90.02.1', name: 'Себестоимость продаж по деятельности с основной системой н/о', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '90.03', name: 'НДС', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '90.07', name: 'Расходы на продажу', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '90.09', name: 'Прибыль / убыток от продаж', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      
      // Прочие доходы и расходы
      { code: '91', name: 'Прочие доходы и расходы', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      { code: '91.01', name: 'Прочие доходы', type: AccountType.PASSIVE, category: AccountCategory.BALANCE },
      { code: '91.02', name: 'Прочие расходы', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '91.09', name: 'Сальдо прочих доходов и расходов', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      
      // Прибыли и убытки
      { code: '99', name: 'Прибыли и убытки', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      { code: '99.01', name: 'Прибыли и убытки', type: AccountType.ACTIVE_PASSIVE, category: AccountCategory.BALANCE },
      
      // НДС
      { code: '19', name: 'НДС по приобретенным ценностям', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '19.03', name: 'НДС по приобретенным МПЗ', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
      { code: '19.04', name: 'НДС по приобретенным услугам', type: AccountType.ACTIVE, category: AccountCategory.BALANCE },
    ];
  }
}
