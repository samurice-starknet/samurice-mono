import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class MatchMakingQueue {
  @PrimaryColumn()
  id: string;

  @Column({ default: null, nullable: true })
  player: string | null;
}
