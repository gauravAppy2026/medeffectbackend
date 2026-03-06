import { Injectable, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { extname } from 'path';

@Injectable()
export class UploadService {
  private s3: S3Client | null = null;
  private bucket: string;
  private publicUrl: string;

  constructor(private configService: ConfigService) {
    const endpoint = this.configService.get<string>('S3_ENDPOINT');
    const accessKey = this.configService.get<string>('S3_ACCESS_KEY');
    const secretKey = this.configService.get<string>('S3_SECRET_KEY');
    this.bucket = this.configService.get<string>('S3_BUCKET') || 'medeffects';
    this.publicUrl = this.configService.get<string>('S3_PUBLIC_URL') || '';

    if (endpoint && accessKey && secretKey) {
      this.s3 = new S3Client({
        region: 'auto',
        endpoint,
        credentials: {
          accessKeyId: accessKey,
          secretAccessKey: secretKey,
        },
      });
    }
  }

  async uploadFile(file: Express.Multer.File): Promise<string> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // If S3/R2 is configured, upload to cloud
    if (this.s3) {
      return this.uploadToS3(file);
    }

    // Fallback: local storage (dev only)
    return `/uploads/${file.filename}`;
  }

  private async uploadToS3(file: Express.Multer.File): Promise<string> {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const key = `uploads/${uniqueSuffix}${extname(file.originalname)}`;

    await this.s3!.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    // Return the public URL
    if (this.publicUrl) {
      return `${this.publicUrl}/${key}`;
    }
    return key;
  }
}
