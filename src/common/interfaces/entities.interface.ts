import { MessageType } from '../dto/message.dto';

export interface User {
  id: string;
  nickname: string;
  avatar?: string;
  qrCode: string;
  createdAt: Date;
}

export interface Room {
  id: string;
  ownerId: string;
  participants: Participant[];
  lastMessage?: string;
  lastMessageTime?: Date;
  createdAt: Date;
}

export interface Participant {
  id: string;
  nickname: string;
  avatar?: string;
  isOwner: boolean;
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