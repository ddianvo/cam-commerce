import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';
export class CouponCodeDto {
  @ApiProperty({ example: 'CAM10', description: 'Mỗi đơn dùng một mã giảm giá' })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @Matches(/^[A-Z0-9_-]{3,32}$/)
  code!: string;
}
