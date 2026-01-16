import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

@Injectable()
export class EncryptionService implements OnModuleInit {
  // 👇 O '!' aqui resolve o erro (Definite Assignment Assertion)
  private key!: Buffer;

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    const keyString = this.configService.getOrThrow<string>('ENCRYPTION_KEY');
    this.key = Buffer.from(keyString, 'hex');
  }

  async encrypt(text: string): Promise<string> {
    const iv = randomBytes(16);
    // Agora o TS sabe que 'this.key' não é null/undefined
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag().toString('hex');

    return `${iv.toString('hex')}:${encrypted}:${authTag}`;
  }

  async decrypt(encryptedData: string): Promise<string> {
    const [ivHex, encryptedHex, authTagHex] = encryptedData.split(':');

    if (!ivHex || !encryptedHex || !authTagHex) {
      throw new Error('Formato de dados criptografados inválido');
    }

    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);

    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}