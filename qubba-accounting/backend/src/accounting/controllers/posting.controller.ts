import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PostingService } from '../services/posting.service';
import {
  CreatePostingDto,
  UpdatePostingDto,
  PostingFilterDto,
  JournalEntryDto,
} from '../dto/posting.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CurrentUser, CurrentUserData } from '../../auth/decorators/current-user.decorator';
import { UserRole } from '../../database/entities';

@Controller('postings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PostingController {
  constructor(private readonly postingService: PostingService) {}

  @Get()
  async findAll(
    @Query() filter: PostingFilterDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.findAll(filter, user.organizationId);
  }

  @Get(':id')
  async findById(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.findById(id, user.organizationId);
  }

  @Post()
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT, UserRole.ACCOUNTANT)
  async create(
    @Body() dto: CreatePostingDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.create(dto, user.organizationId, user.id);
  }

  @Post('journal-entry')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT, UserRole.ACCOUNTANT)
  async createJournalEntry(
    @Body() dto: JournalEntryDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.createJournalEntry(dto, user.organizationId, user.id);
  }

  @Post('journal-entry/:id/post')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT, UserRole.ACCOUNTANT)
  async postJournalEntry(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.postJournalEntry(id, user.organizationId, user.id);
  }

  @Put(':id')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT, UserRole.ACCOUNTANT)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdatePostingDto,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.update(id, dto, user.organizationId);
  }

  @Post(':id/cancel')
  @Roles(UserRole.ADMIN, UserRole.CHIEF_ACCOUNTANT)
  @HttpCode(HttpStatus.OK)
  async cancel(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserData,
  ) {
    return this.postingService.cancel(id, user.organizationId);
  }
}
