import { IsString, IsUUID, IsArray, IsOptional } from 'class-validator';

export class JoinOrCreateRoomDto {
  @IsUUID()
  userId1: string;

  @IsUUID()
  userId2: string;
}

export class RoomResponseDto {
  id: string;
  participants: ParticipantDto[];
  createdAt: Date;
}

export class ParticipantDto {
  id: string;
  nickname: string;
  avatar?: string;
} 