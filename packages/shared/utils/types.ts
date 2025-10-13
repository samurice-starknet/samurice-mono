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
