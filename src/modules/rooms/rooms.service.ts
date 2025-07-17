import { Injectable } from '@nestjs/common';
import { Room, Participant } from '../../common/interfaces/entities.interface';
import { CreateRoomDto, RoomResponseDto } from '../../common/dto/room.dto';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class RoomsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createRoom(createRoomDto: CreateRoomDto): Promise<RoomResponseDto> {
    // 创建聊天室
    const dbRoom = await this.databaseService.createRoom({
      owner_id: createRoomDto.ownerId,
    });

    // 获取房主信息
    const owner = await this.databaseService.getUserById(createRoomDto.ownerId);
    const ownerNickname = owner ? owner.nickname : '房主';

    // 添加房主作为参与者
    await this.databaseService.addRoomParticipant({
      room_id: dbRoom.id,
      user_id: createRoomDto.ownerId,
      nickname: ownerNickname,
      avatar: owner?.avatar,
      is_owner: true,
    });

    // 添加其他参与者
    await this.databaseService.addRoomParticipant({
      room_id: dbRoom.id,
      user_id: createRoomDto.participantId,
      nickname: createRoomDto.participantNickname,
      avatar: createRoomDto.participantAvatar,
      is_owner: false,
    });

    // 获取所有参与者
    const dbParticipants = await this.databaseService.getRoomParticipants(dbRoom.id);
    
    const participants: Participant[] = dbParticipants.map(p => ({
      id: p.user_id,
      nickname: p.nickname,
      avatar: p.avatar,
      isOwner: p.is_owner,
    }));

    return {
      id: dbRoom.id,
      ownerId: dbRoom.owner_id,
      participants,
      lastMessage: dbRoom.last_message,
      lastMessageTime: dbRoom.last_message_time ? new Date(dbRoom.last_message_time) : undefined,
      createdAt: new Date(dbRoom.created_at),
    };
  }

  async getRoomById(roomId: string): Promise<Room | null> {
    const dbRoom = await this.databaseService.getRoomById(roomId);
    if (!dbRoom) return null;

    const dbParticipants = await this.databaseService.getRoomParticipants(roomId);
    const participants: Participant[] = dbParticipants.map(p => ({
      id: p.user_id,
      nickname: p.nickname,
      avatar: p.avatar,
      isOwner: p.is_owner,
    }));

    return {
      id: dbRoom.id,
      ownerId: dbRoom.owner_id,
      participants,
      lastMessage: dbRoom.last_message,
      lastMessageTime: dbRoom.last_message_time ? new Date(dbRoom.last_message_time) : undefined,
      createdAt: new Date(dbRoom.created_at),
    };
  }

  async getRoomsByUserId(userId: string): Promise<RoomResponseDto[]> {
    const dbRooms = await this.databaseService.getRoomsByUserId(userId);
    
    const roomsWithParticipants = await Promise.all(
      dbRooms.map(async (room) => {
        const dbParticipants = await this.databaseService.getRoomParticipants(room.id);
        const participants: Participant[] = dbParticipants.map(p => ({
          id: p.user_id,
          nickname: p.nickname,
          avatar: p.avatar,
          isOwner: p.is_owner,
        }));

        return {
          id: room.id,
          ownerId: room.owner_id,
          participants,
          lastMessage: room.last_message,
          lastMessageTime: room.last_message_time ? new Date(room.last_message_time) : undefined,
          createdAt: new Date(room.created_at),
        };
      })
    );

    return roomsWithParticipants;
  }

  async updateLastMessage(roomId: string, message: string): Promise<void> {
    await this.databaseService.updateRoomLastMessage(roomId, message);
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    return await this.databaseService.isUserInRoom(roomId, userId);
  }

  async getAllRooms(): Promise<RoomResponseDto[]> {
    // 获取所有房间（注意：这可能不是最优的实现，生产环境应该分页）
    const dbRooms = await this.databaseService.getAllRooms();
    
    const roomsWithParticipants = await Promise.all(
      dbRooms.map(async (room) => {
        const dbParticipants = await this.databaseService.getRoomParticipants(room.id);
        const participants: Participant[] = dbParticipants.map(p => ({
          id: p.user_id,
          nickname: p.nickname,
          avatar: p.avatar,
          isOwner: p.is_owner,
        }));

        return {
          id: room.id,
          ownerId: room.owner_id,
          participants,
          lastMessage: room.last_message,
          lastMessageTime: room.last_message_time ? new Date(room.last_message_time) : undefined,
          createdAt: new Date(room.created_at),
        };
      })
    );

    return roomsWithParticipants;
  }
} 