import { Module, Global } from '@nestjs/common';
import { EncryptionService } from './encryption.service';

@Global() // ⚠️ Importante: Torna acessível em todo o app sem precisar importar em cada módulo
@Module({
  providers: [EncryptionService],
  exports: [EncryptionService],
})
export class SecurityModule {}