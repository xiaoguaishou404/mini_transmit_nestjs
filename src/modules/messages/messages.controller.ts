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
import { CreateMessageDto, MessageResponseDto, MessageType } from '../../common/dto/message.dto';

@Controller('messages')
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    private readonly storageService: StorageService,
  ) {}

  @Post()
  async createMessage(@Body() createMessageDto: CreateMessageDto): Promise<MessageResponseDto> {
    // 简化版本：直接使用发送者ID作为昵称，实际应用中应该查询用户服务
    const senderNickname = `用户${createMessageDto.senderId.slice(0, 8)}`;
    return this.messagesService.createMessage(createMessageDto, senderNickname);
  }

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
    @Body() body: { roomId: string; senderId: string },
  ): Promise<MessageResponseDto> {
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
      const messageType = file.mimetype.startsWith('image/') ? MessageType.IMAGE : MessageType.FILE;
      const fileSize = this.storageService.formatFileSize(file.size);

      const createMessageDto: CreateMessageDto = {
        roomId: body.roomId,
        senderId: body.senderId,
        type: messageType,
        fileName: file.originalname,
        fileUrl: uploadResult.url,
        fileSize,
      };

      const senderNickname = `用户${body.senderId.slice(0, 8)}`;
      return this.messagesService.createMessage(createMessageDto, senderNickname);
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

  @Get(':id')
  async getMessageById(@Param('id') id: string): Promise<MessageResponseDto> {
    const message = await this.messagesService.getMessageById(id);
    if (!message) {
      throw new HttpException('消息不存在', HttpStatus.NOT_FOUND);
    }
    return {
      id: message.id,
      roomId: message.roomId,
      senderId: message.senderId,
      senderNickname: message.senderNickname,
      type: message.type,
      content: message.content,
      fileName: message.fileName,
      fileUrl: message.fileUrl,
      fileSize: message.fileSize,
      createdAt: message.createdAt,
    };
  }
} 