import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { compare, hash } from 'bcryptjs';
import { User, Role } from '../users/entities/user.entity';
import { LoginDto, RegisterDto } from './dto/auth.dto';
@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}
  async me(id: string) {
    const user = await this.users.findOneBy({ id });
    if (!user) throw new UnauthorizedException();
    return { id: user.id, email: user.email, role: user.role };
  }
  async register(dto: RegisterDto) {
    const user = this.users.create({
      email: dto.email,
      passwordHash: await hash(dto.password, 12),
      role: Role.CUSTOMER,
    });
    try {
      await this.users.save(user);
    } catch (error) {
      if ((error as { code?: string }).code === '23505')
        throw new ConflictException('Email đã được sử dụng');
      throw error;
    }
    return this.tokens(user);
  }
  async login(dto: LoginDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();
    // Constant bcrypt work for unknown accounts reduces email enumeration via timing.
    const dummyHash = '$2b$12$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy';
    const valid = await compare(dto.password, user?.passwordHash ?? dummyHash);
    if (!user || !valid) throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    return this.tokens(user);
  }
  async logout(id: string) {
    await this.users.increment({ id }, 'tokenVersion', 1);
    return { message: 'Đã đăng xuất tất cả thiết bị' };
  }
  async changeRole(id: string, role: Role) {
    const result = await this.users.update(id, { role });
    if (!result.affected) throw new NotFoundException('Không tìm thấy người dùng');
    return { id, role };
  }
  private async tokens(user: User) {
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id, ver: user.tokenVersion }),
      tokenType: 'Bearer',
      expiresIn: this.config.get<number>('JWT_EXPIRES_SECONDS'),
      user: { id: user.id, email: user.email, role: user.role },
    };
  }
}
