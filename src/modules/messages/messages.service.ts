import { Injectable } from '@nestjs/common';
import { CreateMessageDto, MessageResponseDto } from '../../common/dto/message.dto';
import { DatabaseService } from '../../services/database.service';

@Injectable()
export class MessagesService {
  constructor(private readonly databaseService: DatabaseService) {}

  async createMessage(createMessageDto: CreateMessageDto): Promise<MessageResponseDto> {
    // 通过senderId获取用户信息
    const user = await this.databaseService.getUserById(createMessageDto.senderId);
    if (!user) {
      throw new Error('发送者用户不存在');
    }

    const dbMessage = await this.databaseService.createMessage({
      room_id: createMessageDto.roomId,
      sender_id: createMessageDto.senderId,
      sender_nickname: user.nickname,
      type: createMessageDto.type,
      content: createMessageDto.content,
      file_name: createMessageDto.fileName,
      file_url: createMessageDto.fileUrl,
      file_size: createMessageDto.fileSize,
    });

    return {
      id: dbMessage.id,
      roomId: dbMessage.room_id,
      senderId: dbMessage.sender_id,
      senderNickname: dbMessage.sender_nickname,
      type: dbMessage.type as any,
      content: dbMessage.content,
      fileName: dbMessage.file_name,
      fileUrl: dbMessage.file_url,
      fileSize: dbMessage.file_size,
      createdAt: new Date(dbMessage.created_at),
    };
  }

  async getMessagesByRoomId(roomId: string, limit: number = 50, offset: number = 0): Promise<MessageResponseDto[]> {
    const dbMessages = await this.databaseService.getMessagesByRoomId(roomId, { limit, offset });

    return dbMessages.map(message => ({
      id: message.id,
      roomId: message.room_id,
      senderId: message.sender_id,
      senderNickname: message.sender_nickname,
      type: message.type as any,
      content: message.content,
      fileName: message.file_name,
      fileUrl: message.file_url,
      fileSize: message.file_size,
      createdAt: new Date(message.created_at),
    }));
  }

  generateFileUrl(filename: string): string {
    // 简单的文件URL生成，实际应用中应该使用云存储
    return `/uploads/${filename}`;
  }

  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
} 