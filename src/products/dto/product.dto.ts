import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  IsIn,
  Matches,
} from 'class-validator';
export class CreateProductDto {
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @ApiProperty({ example: 'Giày thể thao' })
  name!: string;
  @ApiProperty({ required: false, nullable: true, type: String, example: '/images/backpack.jpg' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @Matches(/^\/images\/[a-z0-9-]+\.(jpg|png|webp)$/)
  imageUrl?: string | null;
  @IsString()
  @MinLength(1)
  @MaxLength(5000)
  @ApiProperty({ example: 'Giày màu đen' })
  description!: string;
  @IsInt()
  @Min(0)
  @Max(1000000000)
  @ApiProperty({ example: 650000 })
  price!: number;
  @IsInt()
  @Min(0)
  @Max(1000000000)
  @ApiProperty({ example: 20 })
  stock!: number;
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @ApiProperty({ example: 'Giày' })
  category!: string;
  @IsArray()
  @ArrayMaxSize(30)
  @ArrayUnique()
  @IsString({ each: true })
  @MinLength(1, { each: true })
  @MaxLength(50, { each: true })
  @ApiProperty({ example: ['nam', 'giày thể thao'], type: 'array', items: { type: 'string' } })
  tags!: string[];
  @IsOptional()
  @IsBoolean()
  @ApiProperty({ required: false, example: true })
  isActive?: boolean;
}
export class UpdateProductDto extends PartialType(CreateProductDto, {
  skipNullProperties: false,
}) {}
export class ProductQueryDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  @ApiProperty({ required: false, example: 'giay' })
  q?: string;
  @IsOptional() @IsString() @MaxLength(100) category?: string;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000)
  @ApiProperty({ required: false, example: 0 })
  minPrice?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1000000000)
  @ApiProperty({ required: false, example: 700000 })
  maxPrice?: number;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10000)
  @ApiProperty({ required: false, default: 1 })
  page = 1;
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @ApiProperty({ required: false, default: 20 })
  limit = 20;
}

export class ProductManagementQueryDto extends ProductQueryDto {
  @ApiProperty({ required: false, enum: ['all', 'active', 'inactive'], default: 'all' })
  @IsOptional()
  @IsIn(['all', 'active', 'inactive'])
  status: 'all' | 'active' | 'inactive' = 'all';
}
