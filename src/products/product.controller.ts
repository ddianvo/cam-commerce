import {
  Body,
  ForbiddenException,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser, Principal, Public, Roles } from '../auth/auth.decorators';
import { Role } from '../users/entities/user.entity';
import { ProductService } from './product.service';
import {
  CreateProductDto,
  ProductManagementQueryDto,
  ProductQueryDto,
  UpdateProductDto,
} from './dto/product.dto';
@Controller('products')
export class ProductController {
  constructor(private readonly products: ProductService) {}
  @Public() @Get() list(@Query() query: ProductQueryDto) {
    return this.products.list(query);
  }
  @Get('manage')
  @Roles(Role.ADMIN, Role.STAFF)
  manage(@Query() query: ProductManagementQueryDto) {
    return this.products.list(query, true, query.status);
  }
  @Public() @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.get(id);
  }
  @Post() @Roles(Role.ADMIN, Role.STAFF) create(
    @Body() dto: CreateProductDto,
    @CurrentUser() user: Principal,
  ) {
    if (user.role !== Role.ADMIN && dto.isActive === false)
      throw new ForbiddenException('Chỉ Admin có quyền ngừng bán sản phẩm');
    return this.products.create(dto);
  }
  @Patch(':id') @Roles(Role.ADMIN, Role.STAFF) update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateProductDto,
    @CurrentUser() user: Principal,
  ) {
    if (user.role !== Role.ADMIN && dto.isActive !== undefined)
      throw new ForbiddenException('Chỉ Admin có quyền thay đổi trạng thái bán hàng');
    return this.products.update(id, dto);
  }
  @Delete(':id') @Roles(Role.ADMIN) remove(@Param('id', ParseUUIDPipe) id: string) {
    return this.products.remove(id);
  }
}
