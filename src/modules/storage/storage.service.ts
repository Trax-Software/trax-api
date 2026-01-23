import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private readonly logger = new Logger(StorageService.name);

  constructor(private readonly configService: ConfigService) {
    this.bucketName = this.configService.getOrThrow('R2_BUCKET_NAME');

    // Configuração do Cliente R2 (Compatível com S3)
    this.s3Client = new S3Client({
      region: 'auto',
      endpoint: this.configService.getOrThrow('R2_ENDPOINT'),
      credentials: {
        accessKeyId: this.configService.getOrThrow('R2_ACCESS_KEY_ID'),
        secretAccessKey: this.configService.getOrThrow('R2_SECRET_ACCESS_KEY'),
      },
    });
  }

  async uploadFile(fileBuffer: Buffer, fileName: string, mimeType: string): Promise<string> {
    const uniqueFileName = `${uuidv4()}-${fileName}`;

    try {
      const upload = new Upload({
        client: this.s3Client,
        params: {
          Bucket: this.bucketName,
          Key: uniqueFileName,
          Body: fileBuffer,
          ContentType: mimeType,
          // ACL: 'public-read', // No R2, geralmente configuramos o bucket como público no painel
        },
      });

      await upload.done();

      // Monta a URL pública final
      const publicUrl = `${this.configService.getOrThrow('R2_PUBLIC_URL')}/${uniqueFileName}`;
      
      this.logger.log(`Arquivo enviado com sucesso: ${publicUrl}`);
      return publicUrl;
    } catch (error) {
      this.logger.error('Erro ao enviar arquivo para R2', error);
      throw new InternalServerErrorException('Falha no upload da imagem.');
    }
  }
}