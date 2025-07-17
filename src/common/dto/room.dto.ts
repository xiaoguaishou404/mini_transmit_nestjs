import { IsString, IsUUID, IsArray, IsOptional } from 'class-validator';

export class CreateRoomDto {
  @IsUUID()
  ownerId: string;

  @IsUUID()
  participantId: string;

  @IsString()
  participantNickname: string;

  @IsOptional()
  @IsString()
  participantAvatar?: string;
}

export class RoomResponseDto {
  id: string;
  ownerId: string;
  participants: ParticipantDto[];
  lastMessage?: string;
  lastMessageTime?: Date;
  createdAt: Date;
}

export class ParticipantDto {
  id: string;
  nickname: string;
  avatar?: string;
  isOwner: boolean;
} 