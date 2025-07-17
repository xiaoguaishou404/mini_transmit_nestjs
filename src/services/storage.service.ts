import { Injectable } from '@nestjs/common';
import { supabaseAdmin } from '../config/supabase.config';
import { v4 as uuidv4 } from 'uuid';

// 获取必需的环境变量，如果缺失则抛出错误
function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

@Injectable()
export class StorageService {
  private readonly bucketName = getRequiredEnv('SUPABASE_STORAGE_BUCKET');

  /**
   * 初始化存储桶（如果不存在则创建）
   */
  async initializeBucket(): Promise<void> {
    try {
      // 检查存储桶是否存在
      const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
      
      if (listError) {
        console.error('Failed to list buckets:', listError.message);
        return;
      }

      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);

      if (!bucketExists) {
        // 创建存储桶
        const { error: createError } = await supabaseAdmin.storage.createBucket(this.bucketName, {
          public: true,
          fileSizeLimit: 10 * 1024 * 1024, // 10MB
          allowedMimeTypes: [
            'image/jpeg',
            'image/png',
            'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'text/plain',
            'application/zip',
            'application/x-rar-compressed'
          ]
        });

        if (createError) {
          console.error('Failed to create bucket:', createError.message);
        } else {
          console.log(`✅ Storage bucket '${this.bucketName}' created successfully`);
        }
      } else {
        console.log(`✅ Storage bucket '${this.bucketName}' already exists`);
      }
    } catch (error) {
      console.error('Storage initialization error:', error);
    }
  }

  /**
   * 上传文件到Supabase Storage
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'uploads'
  ): Promise<{
    url: string;
    path: string;
    filename: string;
  }> {
    try {
      // 生成唯一文件名
      const fileExtension = file.originalname.split('.').pop();
      const filename = `${uuidv4()}.${fileExtension}`;
      const filePath = `${folder}/${filename}`;

      // 上传文件
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .upload(filePath, file.buffer, {
          contentType: file.mimetype,
          duplex: 'half'
        });

      if (error) {
        throw new Error(`Failed to upload file: ${error.message}`);
      }

      // 获取公共URL
      const { data: urlData } = supabaseAdmin.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath,
        filename: filename
      };
    } catch (error) {
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        throw new Error(`Failed to delete file: ${error.message}`);
      }

      return true;
    } catch (error) {
      console.error('File deletion error:', error);
      return false;
    }
  }

  /**
   * 获取文件的公共URL
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabaseAdmin.storage
      .from(this.bucketName)
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  /**
   * 创建签名URL（用于私有文件访问）
   */
  async createSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (error) {
        throw new Error(`Failed to create signed URL: ${error.message}`);
      }

      return data.signedUrl;
    } catch (error) {
      throw new Error(`Signed URL creation failed: ${error.message}`);
    }
  }

  /**
   * 列出文件夹中的文件
   */
  async listFiles(folder: string = 'uploads'): Promise<any[]> {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .list(folder);

      if (error) {
        throw new Error(`Failed to list files: ${error.message}`);
      }

      return data || [];
    } catch (error) {
      console.error('File listing error:', error);
      return [];
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(filePath: string): Promise<any> {
    try {
      // 使用 list 方法获取文件元数据
      const { data, error } = await supabaseAdmin.storage
        .from(this.bucketName)
        .list('', {
          search: filePath.split('/').pop() // 获取文件名
        });

      if (error) {
        throw new Error(`Failed to get file info: ${error.message}`);
      }

      const fileInfo = data.find(file => file.name === filePath.split('/').pop());
      
      if (!fileInfo) {
        throw new Error('File not found');
      }

      return {
        size: fileInfo.metadata?.size || 0,
        type: fileInfo.metadata?.mimetype || 'application/octet-stream',
        lastModified: fileInfo.updated_at || fileInfo.created_at
      };
    } catch (error) {
      throw new Error(`File info retrieval failed: ${error.message}`);
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * 验证文件类型
   */
  validateFileType(file: Express.Multer.File): boolean {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(file.originalname.toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    return extname && mimetype;
  }

  /**
   * 验证文件大小
   */
  validateFileSize(file: Express.Multer.File, maxSize: number = 10 * 1024 * 1024): boolean {
    return file.size <= maxSize;
  }
} 