import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AccountService } from '../services/account.service';
import { CreateAccountDto, UpdateAccountDto } from '../dto/account.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/entities';

@Controller('accounts')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get()
  async findAll(@CurrentUser() user: CurrentUserData) {
    return this.accountService.findAll(user.organizationId);
  }

  @Get(':code')
  async findByCode(
    @Param('code') code: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.accountService.findByCode(code, user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT)
  async create(
    @Body() dto: CreateAccountDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.accountService.create(dto, user.organizationId);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateAccountDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.accountService.update(id, dto, user.organizationId);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT)
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    await this.accountService.delete(id, user.organizationId);
  }

  @Post('initialize')
  @Roles(UserRole.ADMIN)
  async initializeStandardAccounts(@CurrentUser() user: CurrentUserData) {
    await this.accountService.initializeStandardAccounts(user.organizationId);
    return { message: 'План счетов успешно инициализирован' };
  }
}
