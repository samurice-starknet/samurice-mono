import { ApiProperty } from '@nestjs/swagger';
import { IsNumber } from 'class-validator';

export class BaseResult<T> {
  @ApiProperty()
  data?: T;
  @ApiProperty()
  success = 200;

  constructor(data: T) {
    this.data = data;
    this.success = 200;
  }
}

export class JwtPayload {
  sub: string; //address user
  role: string[];
}

export class iInfoToken extends JwtPayload {
  @ApiProperty()
  @IsNumber()
  iat: number;

  @ApiProperty()
  @IsNumber()
  exp: number;
}

export enum EGameStatus {
  Proccesing = 'PROCESSING',
  Finished = 'FINISHED',
  Cancelled = 'CANCELLED',
}

export enum EEventClashHash {
  GameStart = '0x321a4571878ea16d0759b3aee103f818a3f7519b3556d76ce2cb2143f456c2f',
  GameFinished = '0x7ed5043c400ba14a09949c14fe3681ef8dcfc6bc46a95f0bbb494505e729910',
}

export type TEventGameFinished = {
  gameId: string;
  winner: string;
  loser: string;
};
