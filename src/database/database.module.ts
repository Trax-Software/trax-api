import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // ⚠️ Importante: Torna o serviço disponível em todo o app
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Exporta para que outros módulos usem
})
export class DatabaseModule {}