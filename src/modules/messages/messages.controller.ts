import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  UseInterceptors,
  UploadedFile,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagesService } from './messages.service';
import { StorageService } from '../../services/storage.service';
import { DatabaseService } from '../../services/database.service';
import { CreateMessageDto, MessageResponseDto, MessageType } from '../../common/dto/message.dto';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly storageService: StorageService,
    private readonly databaseService: DatabaseService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB 限制
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<{ fileUrl: string; fileName: string; fileSize: string; fileType: MessageType }> {
    if (!file) {
      throw new HttpException('请选择文件', HttpStatus.BAD_REQUEST);
    }

    // 验证文件类型和大小
    if (!this.storageService.validateFileType(file)) {
      throw new HttpException('不支持的文件类型', HttpStatus.BAD_REQUEST);
    }

    if (!this.storageService.validateFileSize(file)) {
      throw new HttpException('文件过大', HttpStatus.BAD_REQUEST);
    }

    try {
      // 上传文件到Supabase Storage
      const uploadResult = await this.storageService.uploadFile(file, 'messages');
      
      // 判断文件类型
      const fileType = file.mimetype.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE;
      const fileSize = this.storageService.formatFileSize(file.size);

      // 只返回文件信息，不创建消息记录
      // 消息记录由客户端通过WebSocket发送时创建，确保实时广播
      return {
        fileUrl: uploadResult.url,
        fileName: file.originalname,
        fileSize,
        fileType,
      };
    } catch (error) {
      throw new HttpException(
        `文件上传失败: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('room/:roomId')
  async getMessagesByRoom(
    @Param('roomId') roomId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<MessageResponseDto[]> {
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    
    return this.messagesService.getMessagesByRoomId(roomId, limitNum, offsetNum);
  }

} 