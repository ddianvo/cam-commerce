import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Max, Min } from 'class-validator';
export class SetCartItemDto {
  @IsUUID()
  @ApiProperty({ format: 'uuid', example: '10000000-0000-4000-8000-000000000001' })
  productId!: string;
  @IsInt()
  @Min(1)
  @Max(1000)
  @ApiProperty({ example: 1, minimum: 1, maximum: 1000 })
  quantity!: number;
}
