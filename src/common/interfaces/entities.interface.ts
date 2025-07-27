import { MessageType } from '../dto/message.dto';

export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  scanUrl: string;    // 扫码链接，前端根据此链接生成二维码图片
  qrToken: string;
  createdAt: Date;
}

export interface Room {
  id: string;
  participants: Participant[];
  createdAt: Date;
}

export interface Participant {
  id: string;
  nickname: string;
  avatar?: string;
}

export interface Message {
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