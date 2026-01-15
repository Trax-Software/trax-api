import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SignUpDto {
  @ApiProperty({ example: 'ceo@trax.com.br' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'Sup3rS3cr3t!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'A senha deve ter no mínimo 8 caracteres' })
  @MaxLength(32)
  password!: string;

  @ApiProperty({ example: 'Thiago Ribeiro' })
  @IsString()
  name!: string;
}