import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateUserDto {
  @IsString()
  nickname: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UserResponseDto {
  id: string;
  nickname: string;
  avatar?: string;
  qrCode: string;
  createdAt: Date;
}

export class ScanQrCodeDto {
  @IsUUID()
  userId: string;

  @IsString()
  scannerNickname: string;

  @IsOptional()
  @IsString()
  scannerAvatar?: string;
} 