import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import { Role } from '../users/entities/user.entity';
export interface Principal {
  id: string;
  role: Role;
}
export const Public = () => SetMetadata('public', true);
export const Roles = (...roles: Role[]) => SetMetadata('roles', roles);
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Principal => ctx.switchToHttp().getRequest().user,
);
