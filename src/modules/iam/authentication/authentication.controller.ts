import { Body, Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { AuthenticationService } from './authentication.service';
import { SignUpDto } from './dto/sign-up.dto';
import { SignInDto } from './dto/sign-in.dto';
import { ApiBearerAuth, ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { ActiveUser, AuthUserPayload } from './decorators/active-user.decorator';
import { MeDto } from './dto/me.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthenticationController {
  constructor(private readonly authService: AuthenticationService) {}

  @Post('sign-up')
  @ApiOperation({ summary: 'Criar nova conta e workspace' })
  @ApiResponse({ status: 201, description: 'Usuário criado com sucesso' })
  @ApiResponse({ status: 409, description: 'Email já existe' })
  async signUp(@Body() signUpDto: SignUpDto) {
    return this.authService.signUp(signUpDto);
  }

  @Post('sign-in')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login com email e senha' })
  @ApiResponse({ status: 200, description: 'Token JWT gerado' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async signIn(@Body() signInDto: SignInDto) {
    return this.authService.signIn(signInDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Retornar usuário autenticado e workspace atual' })
  @ApiResponse({ status: 200, description: 'Perfil autenticado', type: MeDto })
  @ApiResponse({ status: 401, description: 'Usuário não encontrado.' })
  @ApiResponse({ status: 403, description: 'Usuário sem workspace.' })
  async me(@ActiveUser() user: AuthUserPayload) {
    return this.authService.me(user);
  }
}
