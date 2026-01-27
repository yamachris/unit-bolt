import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
import { AuthService } from './auth.service';

@Injectable()
export class WsJwtGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  canActivate(context: ExecutionContext): boolean {
    const client = context.switchToWs().getClient();
    const token = this.extractTokenFromHeader(client.handshake);

    if (!token) {
      throw new WsException('Authentication token not found');
    }

    const user = this.authService.verifyToken(token);
    if (!user) {
      throw new WsException('Invalid authentication token');
    }

    // Attach user to client for later use
    client.user = user;
    return true;
  }

  private extractTokenFromHeader(handshake: any): string | undefined {
    if (!handshake.auth || !handshake.auth.token) {
      return undefined;
    }
    return handshake.auth.token;
  }
}
