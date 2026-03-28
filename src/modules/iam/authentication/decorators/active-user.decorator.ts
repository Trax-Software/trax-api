import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Define o formato do payload do token
export interface AuthUserPayload {
  sub: string;
  email: string;
}

export type ActiveUserData = AuthUserPayload;

export const ActiveUser = createParamDecorator(
  (field: keyof AuthUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user: AuthUserPayload | undefined = request.user;

    // Se o guard falhar (o que não deve acontecer se a rota for protegida), retorna undefined
    if (!user) {
      return undefined;
    }

    return field ? user[field] : user;
  },
);
