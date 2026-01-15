import { 
    ConflictException, 
    Injectable, 
    UnauthorizedException 
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { PrismaService } from '../../../database/prisma.service';
  import { HashingService } from '../hashing/hashing.service';
  import { SignUpDto } from './dto/sign-up.dto';
  import { SignInDto } from './dto/sign-in.dto';
  import { Role } from '@prisma/client';
  
  @Injectable()
  export class AuthenticationService {
    constructor(
      private readonly prisma: PrismaService,
      private readonly hashingService: HashingService,
      private readonly jwtService: JwtService,
    ) {}
  
    async signUp(signUpDto: SignUpDto) {
      const { email, password, name } = signUpDto;
  
      const existingUser = await this.prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        throw new ConflictException('Email já está em uso.');
      }
  
      const hashedPassword = await this.hashingService.hash(password);
  
      return this.prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
          },
        });
  
        const workspace = await tx.workspace.create({
          data: {
            name: `Workspace de ${name}`,
            description: 'Workspace Padrão',
          },
        });
  
        await tx.workspaceMember.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: Role.OWNER,
          },
        });
  
        return this.generateTokens(user);
      });
    }
  
    async signIn(signInDto: SignInDto) {
      const { email, password } = signInDto;
  
      const user = await this.prisma.user.findUnique({ where: { email } });
      if (!user) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
  
      const isEqual = await this.hashingService.compare(password, user.password);
      if (!isEqual) {
        throw new UnauthorizedException('Credenciais inválidas');
      }
  
      return this.generateTokens(user);
    }
  
    private async generateTokens(user: { id: string; email: string }) {
      // CORRIGIDO: Passando apenas o payload
      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email }
      );
  
      return { accessToken };
    }
  }