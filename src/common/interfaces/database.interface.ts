// 数据库表结构接口定义

export interface DatabaseUser {
  id: string;
  nickname: string;
  avatar?: string;
  scan_url: string;      // 数据库存储扫码链接
  qr_token: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRoom {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface DatabaseRoomParticipant {
  id: string;
  room_id: string;
  user_id: string;
  nickname: string;
  avatar?: string;
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