import { createClient } from '@supabase/supabase-js';

// 获取环境变量，如果缺失则立即抛出错误
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

export const supabaseConfig = {
  url: getRequiredEnv('SUPABASE_URL'),
  anonKey: getRequiredEnv('SUPABASE_ANON_KEY'),
  serviceRoleKey: getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
};

// 应用配置
export const appConfig = {
  frontendUrl: getRequiredEnv('FRONTEND_URL'),
};

// 创建Supabase客户端
export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey
);

// 创建具有服务角色权限的客户端（用于管理操作）
export const supabaseAdmin = createClient(
  supabaseConfig.url,
  supabaseConfig.serviceRoleKey
);

// 检查配置是否完整（现在主要用于运行时验证）
export function validateSupabaseConfig() {
  // 环境变量验证已经在配置读取时完成
  // 这里只需要验证配置对象是否正确初始化
  if (!supabaseConfig.url || !supabaseConfig.anonKey || !supabaseConfig.serviceRoleKey) {
    throw new Error('Supabase configuration is not properly initialized');
  }
  
  return true;
} 