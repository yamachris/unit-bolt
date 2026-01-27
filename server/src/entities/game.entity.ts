import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { GameType } from '../types/game';

@Entity('games')
export class Game {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  private _state: string;

  @Column({ type: 'text' })
  game_mode?: string;

  @Column({ type: 'integer', nullable: true })
  setup_timer_remaining?: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Getter and setter for state to handle JSON serialization
  get state(): GameType {
    try {
      return JSON.parse(this._state || '{}');
    } catch {
      return {} as GameType;
    }
  }

  set state(value: GameType) {
    this._state = JSON.stringify(value);
  }
}
