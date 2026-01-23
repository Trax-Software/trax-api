import { Module, Global } from '@nestjs/common';
import { StorageService } from './storage.service';

@Global() // Deixa disponível para o AiModule usar sem importar toda hora
@Module({
  providers: [StorageService],
  exports: [StorageService],
})
export class StorageModule {}