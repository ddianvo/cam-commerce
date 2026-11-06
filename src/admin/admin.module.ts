import { Controller, Get, Module } from '@nestjs/common';
import { Roles } from '../auth/auth.decorators';
import { Role } from '../users/entities/user.entity';
import { AdminService } from './admin.service';
@Controller('admin')
@Roles(Role.ADMIN, Role.STAFF)
class AdminController {
  constructor(private readonly admin: AdminService) {}
  @Get('overview') overview() {
    return this.admin.overview();
  }
}
@Module({ controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
