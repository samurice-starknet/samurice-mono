import { EGameStatus } from '@app/shared/utils/types';
import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class GameMatch {
  @PrimaryColumn()
  id: string;

  @Column()
  playerA: string;

  @Column()
  playerB: string;

  @Column({ default: null, nullable: true })
  winner?: string | null;

  @Column({ enum: EGameStatus, default: EGameStatus.Proccesing })
  status: EGameStatus;
}
