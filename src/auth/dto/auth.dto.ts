import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsByteLength, IsEmail, IsString, MaxLength, MinLength, IsEnum } from 'class-validator';
import { Role } from '../../users/entities/user.entity';
export class LoginDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(254)
  @ApiProperty({ example: 'demo@example.com' })
  email!: string;
  @IsString()
  @MinLength(10)
  @MaxLength(72)
  @IsByteLength(0, 72)
  @ApiProperty({ example: 'DemoCustomer2026!', format: 'password' })
  password!: string;
}
export class RegisterDto extends LoginDto {}
export class UpdateRoleDto {
  @IsEnum(Role)
  @ApiProperty({ enum: ['admin', 'staff', 'customer'] })
  role!: Role;
}
