import {
  WebSocketGateway,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import configSystem from '@app/shared/config/config-system';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from '@app/shared/utils/types';
import { GameService } from './game.service';

@WebSocketGateway(configSystem().GAME_SOCKET_GATEWAY_PORT, {
  cors: { origin: '*' },
})
export class GameSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  protected logger = new Logger(GameSocketGateway.name);
  constructor(
    private readonly gameService: GameService,
    private readonly jwtService: JwtService,
  ) {}

  async afterInit(server: any) {
    await this.gameService.initSystem();
    this.logger.log('Game WebSocket Gateway initialized');
  }

  async handleConnection(client: any) {
    this.logger.log(`New player connected`);
  }

  @SubscribeMessage('startNewGame')
  async startNewGame(client: any, payload?: { gameId?: string }) {
    const authenPayload = await this.validateToken(client.handshake.auth.token);
    const { isMatchFound, gameId } = await this.gameService.startNewGame(
      authenPayload.sub,
      payload.gameId,
    );

    client.emit('MatchMakingStatus', { isMatchFound, gameId });
  }

  async handleDisconnect(client: any) {
    const jwtPayload = await this.validateToken(client.handshake.auth.token);
    await this.gameService.handlDisconnect(jwtPayload.sub);
    this.logger.log('Client disconnected');
  }

  private async validateToken(token: string): Promise<JwtPayload> {
    try {
      if (
        typeof token !== 'string' ||
        token.length === 0 ||
        !token.startsWith('Bearer ')
      ) {
        throw new WsException('Invalid token');
      }
      const payload = await this.jwtService.verify(
        token.replace('Bearer ', ''),
        {
          secret: configSystem().JWT_SECRET,
        },
      );
      return payload;
    } catch (error) {
      throw new WsException('Invalid token');
    }
  }
}
