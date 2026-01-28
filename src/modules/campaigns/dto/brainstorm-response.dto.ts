import { ApiProperty } from '@nestjs/swagger';

export class StrategyOptionDto {
  @ApiProperty({ 
    example: 'Foco em Performance e Superação',
    description: 'Um título curto e chamativo para a estratégia.'
  })
  title!: string; // 👈 Adicionei o ! aqui

  @ApiProperty({ 
    example: 'Atletas amadores de 25-40 anos que treinam para maratonas.',
    description: 'Definição detalhada do público-alvo.'
  })
  targetAudience!: string; // 👈 Aqui

  @ApiProperty({ 
    example: 'Amortecimento responsivo, Durabilidade extrema, Leveza',
    description: 'Os principais pontos de venda a serem destacados.'
  })
  keyBenefits!: string; // 👈 Aqui

  @ApiProperty({ 
    example: 'Desafiador, Intenso e Motivacional',
    description: 'O tom de voz sugerido para os textos.'
  })
  brandTone!: string; // 👈 Aqui

  @ApiProperty({ 
    example: 'Este público valoriza resultados e estatísticas, por isso...',
    description: 'A justificativa da IA para escolher este caminho.'
  })
  reasoning!: string; // 👈 E aqui
}