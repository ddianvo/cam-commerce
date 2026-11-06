import { ApiProperty } from '@nestjs/swagger';
import { Type, Transform } from 'class-transformer';
import {
  IsOptional,
  IsInt,
  Min,
  Max,
  MaxLength,
  IsString,
  Matches,
  IsEnum,
  IsUUID,
} from 'class-validator';
import { OrderStatus } from '../entities/order.entity';
export class CheckoutDto {
  @IsUUID()
  @ApiProperty({
    format: 'uuid',
    example: '0f700a00-63d2-46da-bff5-868cc57affc1',
    description: 'Giữ nguyên key khi retry; tạo UUID mới cho lần mua mới',
  })
  idempotencyKey!: string;
  @ApiProperty({ required: false, example: 'CAM10' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  couponCode?: string;
}
export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  @ApiProperty({ enum: ['confirmed', 'shipped', 'delivered'] })
  status!: OrderStatus;
}

export class OrderManagementQueryDto {
  @IsOptional() @IsEnum(OrderStatus) status?: OrderStatus;
  @IsOptional() @IsString() @MaxLength(100) q?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(10000) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit = 20;
}
