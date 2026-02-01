import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { User, Organization, UserRole } from '../database/entities';
import { LoginDto, RegisterDto, RegisterUserDto, TokenResponseDto } from './dto/auth.dto';
import { JwtPayload } from './strategies/jwt.strategy';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Organization)
    private organizationRepository: Repository<Organization>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<TokenResponseDto> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Неверный email или пароль');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Аккаунт деактивирован');
    }

    // Update last login
    await this.userRepository.update(user.id, { lastLoginAt: new Date() });

    return this.generateTokens(user);
  }

  async register(dto: RegisterDto): Promise<TokenResponseDto> {
    // Check if user exists
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    // Check if organization exists
    const existingOrg = await this.organizationRepository.findOne({
      where: { inn: dto.inn },
    });

    if (existingOrg) {
      throw new ConflictException('Организация с таким ИНН уже зарегистрирована');
    }

    // Create organization
    const organization = this.organizationRepository.create({
      name: dto.organizationName,
      inn: dto.inn,
      kpp: dto.kpp,
    });
    await this.organizationRepository.save(organization);

    // Create user
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      organizationId: organization.id,
      role: UserRole.ADMIN, // First user is admin
    });
    await this.userRepository.save(user);

    // Initialize chart of accounts for the organization
    await this.initializeChartOfAccounts(organization.id);

    user.organization = organization;
    return this.generateTokens(user);
  }

  async registerUser(dto: RegisterUserDto, organizationId: string): Promise<User> {
    const existingUser = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (existingUser) {
      throw new ConflictException('Пользователь с таким email уже существует');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.userRepository.create({
      email: dto.email.toLowerCase(),
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      middleName: dto.middleName,
      organizationId,
      role: dto.role || UserRole.ACCOUNTANT,
    });

    const savedUser = await this.userRepository.save(user);
    return savedUser;
  }

  async refreshToken(refreshToken: string): Promise<TokenResponseDto> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(refreshToken, {
        secret: this.configService.get('JWT_REFRESH_SECRET', 'refresh-secret'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
        relations: ['organization'],
      });

      if (!user) {
        throw new UnauthorizedException('Пользователь не найден');
      }

      return this.generateTokens(user);
    } catch (error) {
      throw new UnauthorizedException('Недействительный refresh token');
    }
  }

  async getProfile(userId: string): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('Пользователь не найден');
    }

    return user;
  }

  private generateTokens(user: User): TokenResponseDto {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds

    const accessToken = this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
    });

    const refreshToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET', 'refresh-secret'),
      expiresIn: '30d',
    });

    return {
      accessToken,
      refreshToken,
      expiresIn,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        organizationId: user.organizationId,
        organizationName: user.organization?.name || '',
      },
    };
  }

  private async initializeChartOfAccounts(organizationId: string): Promise<void> {
    // This will be implemented in the accounting module
    // For now, we just log that it should be done
    console.log(`Initializing chart of accounts for organization ${organizationId}`);
  }
}
