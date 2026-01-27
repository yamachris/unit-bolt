import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Game } from './game.entity';

export enum TimerType {
  SETUP = 'setup',
  TURN = 'turn',
  ACTION = 'action',
  // Add more timer types as needed
}

@Entity('game_timers')
export class GameTimer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  gameId: string;

  @ManyToOne(() => Game, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'gameId' })
  game: Game;

  @Column({
    type: 'varchar',
    length: 50,
  })
  timerType: string;

  @Column({ type: 'int' })
  durationSeconds: number;

  @Column({ type: 'int' })
  remainingSeconds: number;

  @Column({ type: 'bigint' })
  startTime: number;

  @Column({ default: false })
  isExpired: boolean;

  @Column({ default: false })
  isPaused: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
