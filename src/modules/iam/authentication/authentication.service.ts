import { 
    ConflictException, 
    ForbiddenException,
    Injectable, 
    UnauthorizedException 
  } from '@nestjs/common';
  import { JwtService } from '@nestjs/jwt';
  import { PrismaService } from '../../../database/prisma.service';
  import { HashingService } from '../hashing/hashing.service';
  import { SignUpDto } from './dto/sign-up.dto';
  import { SignInDto } from './dto/sign-in.dto';
  import { Role } from '@prisma/client';
  import { AuthUserPayload } from './decorators/active-user.decorator';
  import { MeDto } from './dto/me.dto';
  
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

    async me(authUser: AuthUserPayload): Promise<MeDto> {
      const userById = await this.prisma.extended.user.findFirst({
        where: { id: authUser.sub },
        select: { id: true, email: true, name: true },
      });

      const user =
        userById ||
        (await this.prisma.extended.user.findFirst({
          where: { email: authUser.email },
          select: { id: true, email: true, name: true },
        }));

      if (!user) {
        throw new UnauthorizedException('Usuário não encontrado.');
      }

      // Se houver múltiplos vínculos, usamos o primeiro por ordem de criação (MVP atual).
      const membership = await this.prisma.extended.workspaceMember.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'asc' },
        select: {
          role: true,
          workspace: {
            select: {
              id: true,
              name: true,
              credits: true,
              metaAdAccountId: true,
              metaPageId: true,
            },
          },
        },
      });

      if (!membership) {
        throw new ForbiddenException('Usuário sem workspace.');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
        },
        membership: {
          role: membership.role,
        },
        workspace: {
          id: membership.workspace.id,
          name: membership.workspace.name,
          credits: membership.workspace.credits,
          metaAdAccountId: membership.workspace.metaAdAccountId,
          metaPageId: membership.workspace.metaPageId,
        },
      };
    }
  
    private async generateTokens(user: { id: string; email: string }) {
      // CORRIGIDO: Passando apenas o payload
      const accessToken = await this.jwtService.signAsync(
        { sub: user.id, email: user.email }
      );
  
      return { accessToken };
    }
  }
