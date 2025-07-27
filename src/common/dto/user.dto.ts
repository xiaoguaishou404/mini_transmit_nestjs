import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UserResponseDto {
  id: string;
  nickname: string;
  avatar?: string;
  scanUrl: string;      // 二维码链接，前端根据此链接生成二维码图片
  qrToken: string;      // 保留 token，便于其他用途
  createdAt: Date;
}

 