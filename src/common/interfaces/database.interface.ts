// 数据库表结构接口定义

export interface DatabaseUser {
  id: string;
  nickname: string;
  avatar?: string;
  qr_code: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRoom {
  id: string;
  owner_id: string;
  last_message?: string;
  last_message_time?: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar?: string;
  is_owner: boolean;
  joined_at: string;
}

export interface DatabaseMessage {
  id: string;
  room_id: string;
  sender_id: string;
  sender_nickname: string;
  type: 'text' | 'image' | 'file';
  content?: string;
  file_name?: string;
  file_url?: string;
  file_size?: string;
  created_at: string;
}

// 查询参数接口
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface MessageQuery extends PaginationParams {
  roomId: string;
}

export interface RoomQuery {
  userId?: string;
} 