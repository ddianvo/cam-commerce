import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { LoginDto, RegisterDto, UpdateRoleDto } from './dto/auth.dto';
import { CurrentUser, Principal, Public, Roles } from './auth.decorators';
import { Role } from '../users/entities/user.entity';
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}
  @Get('me') me(@CurrentUser() user: Principal) {
    return this.auth.me(user.id);
  }
  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }
  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }
  @Post('logout') logout(@CurrentUser() user: Principal) {
    return this.auth.logout(user.id);
  }
  @Patch('users/:id/role')
  @Roles(Role.ADMIN)
  changeRole(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRoleDto) {
    return this.auth.changeRole(id, dto.role);
  }
}
