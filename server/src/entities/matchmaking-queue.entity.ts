import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity()
export class MatchmakingQueue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  playerId: string;

  @Column()
  socketId: string;

  @Column({ default: false })
  isMatched: boolean;

  @Column({ nullable: true })
  matchedGameId: string;

  @CreateDateColumn()
  createdAt: Date;
}
