import { Injectable } from '@nestjs/common';
import { Room, Participant } from '../../common/interfaces/entities.interface';
import { JoinOrCreateRoomDto, RoomResponseDto } from '../../common/dto/room.dto';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class RoomsService {
  constructor(private readonly databaseService: DatabaseService) {}

  async joinOrCreateRoom(joinOrCreateRoomDto: JoinOrCreateRoomDto): Promise<RoomResponseDto> {
    const { userId1, userId2 } = joinOrCreateRoomDto;

    // 首先检查两个用户之间是否已经存在聊天室
    const existingRoom = await this.databaseService.findRoomBetweenUsers(userId1, userId2);
    
    if (existingRoom) {
      // 返回现有房间信息
      return this.formatRoomResponse(existingRoom);
    }

    // 获取两个用户的信息
    const [user1, user2] = await Promise.all([
      this.databaseService.getUserById(userId1),
      this.databaseService.getUserById(userId2),
    ]);

    if (!user1 || !user2) {
      throw new Error('用户不存在');
    }

    // 创建新聊天室
    const dbRoom = await this.databaseService.createRoom();

    // 添加两个用户作为参与者
    await Promise.all([
      this.databaseService.addRoomParticipant({
        room_id: dbRoom.id,
        user_id: userId1,
        nickname: user1.nickname,
        avatar: user1.avatar,
      }),
      this.databaseService.addRoomParticipant({
        room_id: dbRoom.id,
        user_id: userId2,
        nickname: user2.nickname,
        avatar: user2.avatar,
      }),
    ]);

    return this.formatRoomResponse(dbRoom);
  }

  private async formatRoomResponse(dbRoom: any): Promise<RoomResponseDto> {
    // 获取所有参与者
    const dbParticipants = await this.databaseService.getRoomParticipants(dbRoom.id);
    
    const participants: Participant[] = dbParticipants.map(p => ({
      id: p.user_id,
      nickname: p.nickname,
      avatar: p.avatar,
    }));

    return {
      id: dbRoom.id,
      participants,
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
    }));

    return {
      id: dbRoom.id,
      participants,
      createdAt: new Date(dbRoom.created_at),
    };
  }

  async getRoomsByUserId(userId: string): Promise<RoomResponseDto[]> {
    const dbRooms = await this.databaseService.getRoomsByUserId(userId);
    
    const roomsWithParticipants = await Promise.all(
      dbRooms.map(async (room) => {
        return this.formatRoomResponse(room);
      })
    );

    return roomsWithParticipants;
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    return await this.databaseService.isUserInRoom(roomId, userId);
  }
} 