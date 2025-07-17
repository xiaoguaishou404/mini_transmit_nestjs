import { Injectable, OnModuleInit } from '@nestjs/common';
import { supabaseAdmin, validateSupabaseConfig } from '../config/supabase.config';
import {
  DatabaseUser,
  DatabaseRoom,
  DatabaseRoomParticipant,
  DatabaseMessage,
  PaginationParams,
  MessageQuery,
  RoomQuery,
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
    qr_code: string;
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

  async getAllUsers(): Promise<DatabaseUser[]> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get users: ${error.message}`);
    }

    return data || [];
  }

  async updateUser(id: string, userData: Partial<{
    nickname: string;
    avatar: string;
    qr_code: string;
  }>): Promise<DatabaseUser> {
    const { data, error } = await supabaseAdmin
      .from('users')
      .update(userData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }

    return data;
  }

  // 聊天室相关操作
  async createRoom(roomData: {
    owner_id: string;
  }): Promise<DatabaseRoom> {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .insert([roomData])
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

  async updateRoomLastMessage(
    roomId: string,
    lastMessage: string,
  ): Promise<void> {
    const { error } = await supabaseAdmin
      .from('rooms')
      .update({
        last_message: lastMessage,
        last_message_time: new Date().toISOString(),
      })
      .eq('id', roomId);

    if (error) {
      throw new Error(`Failed to update room last message: ${error.message}`);
    }
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

  async getAllRooms(): Promise<DatabaseRoom[]> {
    const { data, error } = await supabaseAdmin
      .from('rooms')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to get all rooms: ${error.message}`);
    }

    return data || [];
  }

  // 聊天室参与者相关操作
  async addRoomParticipant(participantData: {
    room_id: string;
    user_id: string;
    nickname: string;
    avatar?: string;
    is_owner: boolean;
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

  async getMessageById(id: string): Promise<DatabaseMessage | null> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get message: ${error.message}`);
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

  async getLatestMessageInRoom(roomId: string): Promise<DatabaseMessage | null> {
    const { data, error } = await supabaseAdmin
      .from('messages')
      .select('*')
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to get latest message: ${error.message}`);
    }

    return data;
  }

  async deleteMessage(id: string): Promise<boolean> {
    const { error } = await supabaseAdmin
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete message: ${error.message}`);
    }

    return true;
  }
} 