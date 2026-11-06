import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Request } from 'express';
import { Principal } from './auth.decorators';
import { User, Role } from '../users/entities/user.entity';
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}
  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (this.reflector.getAllAndOverride<boolean>('public', [ctx.getHandler(), ctx.getClass()]))
      return true;
    const request = ctx.switchToHttp().getRequest<Request & { user: Principal }>();
    const match = /^Bearer ([^ ]+)$/i.exec(request.headers.authorization ?? '');
    if (!match) throw new UnauthorizedException('Thiếu access token');
    let payload: { sub: string; ver: number };
    try {
      payload = await this.jwt.verifyAsync(match[1], {
        algorithms: ['HS256'],
        issuer: 'nest-commerce',
        audience: 'commerce-api',
      });
      if (typeof payload.sub !== 'string' || !Number.isInteger(payload.ver))
        throw new Error('Invalid claims');
    } catch {
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
    const user = await this.users.findOneBy({ id: payload.sub });
    if (!user || user.tokenVersion !== payload.ver)
      throw new UnauthorizedException('Token đã bị thu hồi');
    request.user = { id: user.id, role: user.role };
    return true;
  }
}
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(ctx: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<Role[]>('roles', [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const user = ctx.switchToHttp().getRequest<{ user?: Principal }>().user;
    if (!user || !roles.includes(user.role)) throw new ForbiddenException('Không đủ quyền');
    return true;
  }
}
