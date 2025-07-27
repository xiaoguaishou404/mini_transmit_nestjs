import { Injectable, OnModuleInit } from '@nestjs/common';
import { supabaseAdmin, validateSupabaseConfig } from '../config/supabase.config';
import {
  DatabaseUser,
  DatabaseRoom,
  DatabaseRoomParticipant,
  DatabaseMessage,
  PaginationParams,
} from '../common/interfaces/database.interface';

@Injectable()
export class DatabaseService implements OnModuleInit {
  async onModuleInit() {
    // 验证Supabase配置
    validateSupabaseConfig();
    console.log('✅ Database service initialized with Supabase');
  }

  // 用户相关操作
  async createUser(userData: {
    nickname: string;
    avatar?: string;
    scan_url: string;    // 扫码链接
    qr_token: string;
  }): Promise<DatabaseUser> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([userData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }

    return data;
  }

  async getUserById(id: string): Promise<DatabaseUser | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user: ${error.message}`);
    }

    return data;
  }

  async getUserByToken(token: string): Promise<DatabaseUser | null> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('qr_token', token)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get user by token: ${error.message}`);
    }

    return data;
  }

  // 聊天室相关操作
  async createRoom(): Promise<DatabaseRoom> {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert([{}])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create room: ${error.message}`);
    }

    return data;
  }

  async getRoomById(id: string): Promise<DatabaseRoom | null> {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get room: ${error.message}`);
    }

    return data;
  }

  async getRoomsByUserId(userId: string): Promise<DatabaseRoom[]> {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        room_participants!inner(user_id)
      `)
      .eq('room_participants.user_id', userId)
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get user rooms: ${error.message}`);
    }

    return data || [];
  }

  // 聊天室参与者相关操作
  async addRoomParticipant(participantData: {
    room_id: string;
    user_id: string;
    nickname: string;
    avatar?: string;
  }): Promise<DatabaseRoomParticipant> {
    const { data, error } = await supabaseAdmin
      .from('room_participants')
      .insert([participantData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add room participant: ${error.message}`);
    }

    return data;
  }

  async getRoomParticipants(roomId: string): Promise<DatabaseRoomParticipant[]> {
    const { data, error } = await supabaseAdmin
      .from('room_participants')
      .select('*')
      .eq('room_id', roomId)
      .order('joined_at');

    if (error) {
      throw new Error(`Failed to get room participants: ${error.message}`);
    }

    return data || [];
  }

  async isUserInRoom(roomId: string, userId: string): Promise<boolean> {
    const { data, error } = await supabaseAdmin
      .from('room_participants')
      .select('id')
      .eq('room_id', roomId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to check user room access: ${error.message}`);
    }

    return !!data;
  }

  // 查找两个用户之间是否已经存在聊天室
  async findRoomBetweenUsers(userId1: string, userId2: string): Promise<DatabaseRoom | null> {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select(`
        *,
        room_participants!inner(user_id)
      `)
      .in('room_participants.user_id', [userId1, userId2])
      .limit(1);

    if (error) {
      throw new Error(`Failed to find room between users: ${error.message}`);
    }

    // 检查返回的房间是否确实包含这两个用户
    if (data && data.length > 0) {
      const room = data[0];
      const participants = await this.getRoomParticipants(room.id);
      const participantIds = participants.map(p => p.user_id);
      
      if (participantIds.includes(userId1) && participantIds.includes(userId2) && participantIds.length === 2) {
        return room;
      }
    }

    return null;
  }

  // 消息相关操作
  async createMessage(messageData: {
    room_id: string;
    sender_id: string;
    sender_nickname: string;
    type: 'text' | 'image' | 'file';
    content?: string;
    file_name?: string;
    file_url?: string;
    file_size?: string;
  }): Promise<DatabaseMessage> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .insert([messageData])
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create message: ${error.message}`);
    }

    return data;
  }

  async getMessagesByRoomId(
    roomId: string,
    params: PaginationParams = {},
  ): Promise<DatabaseMessage[]> {
    const { limit = 50, offset = 0 } = params;

    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      throw new Error(`Failed to get messages: ${error.message}`);
    }

    return data || [];
  }
} 