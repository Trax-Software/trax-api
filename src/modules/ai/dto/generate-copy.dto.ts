import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateCopyDto {
  @ApiProperty({ example: 'Tênis de Corrida UltraFast' })
  @IsString()
  @IsNotEmpty()
  productName!: string;

  @ApiProperty({ example: 'Aumentar vendas para público jovem' })
  @IsString()
  @IsNotEmpty()
  objective!: string;
}