import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios'; // 👈 Importante
import { IntegrationsService } from './integrations.service';
import { IntegrationsController } from './integrations.controller';

@Module({
  imports: [HttpModule], // O SecurityModule e DatabaseModule são globais, não precisa importar aqui
  controllers: [IntegrationsController],
  providers: [IntegrationsService],
})
export class IntegrationsModule {}