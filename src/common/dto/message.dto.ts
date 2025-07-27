import { IsString, IsUUID, IsEnum, IsOptional, IsDateString } from 'class-validator';

export enum MessageType {
  TEXT = 'text',
  IMAGE = 'image',
  FILE = 'file',
}

export class CreateMessageDto {
  @IsUUID()
  roomId: string;

  @IsUUID()
  senderId: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileSize?: string;
}

export class MessageResponseDto {
  id: string;
  roomId: string;
  senderId: string;
  senderNickname: string;
  type: MessageType;
  content?: string;
  fileName?: string;
  fileUrl?: string;
  fileSize?: string;
  createdAt: Date;
}

export class SendMessageDto {
  @IsUUID()
  roomId: string;

  @IsEnum(MessageType)
  type: MessageType;

  @IsOptional()
  @IsString()
  content?: string;
} 