import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MaxLength, MinLength, Matches } from 'class-validator';
export class ChatDto {
  @ApiProperty({ format: 'uuid', description: 'ID tài khoản đang đăng nhập' })
  @IsUUID()
  userId!: string;
  @ApiProperty({ format: 'uuid', example: '30000000-0000-4000-8000-000000000001' })
  @IsUUID()
  sessionId!: string;
  @ApiProperty({ example: 'Tôi muốn mua giày nam dưới 700 nghìn' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  @Matches(/\S/, { message: 'message không được chỉ có khoảng trắng' })
  message!: string;
}
