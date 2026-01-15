import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';

@Injectable()
export class HashingService {
  async hash(data: string): Promise<string> {
    return argon2.hash(data);
  }

  async compare(data: string, encrypted: string): Promise<boolean> {
    return argon2.verify(encrypted, data);
  }
}