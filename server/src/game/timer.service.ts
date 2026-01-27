import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GameTimer, TimerType } from '../entities/game-timer.entity';
import { Game } from '../entities/game.entity';

@Injectable()
export class TimerService {
  constructor(
    @InjectRepository(GameTimer)
    private timerRepository: Repository<GameTimer>,
    @InjectRepository(Game)
    private gameRepository: Repository<Game>,
  ) {}

  /**
   * Creates a new timer for a game
   */
  async createTimer(gameId: string, timerType: TimerType, durationSeconds: number): Promise<GameTimer> {
    // Check if timer already exists
    const existingTimer = await this.timerRepository.findOne({
      where: { gameId, timerType: timerType.toString() },
    });

    if (existingTimer) {
      // Reset the existing timer
      existingTimer.durationSeconds = durationSeconds;
      existingTimer.remainingSeconds = durationSeconds;
      existingTimer.startTime = Date.now();
      existingTimer.isExpired = false;
      existingTimer.isPaused = false;
      return this.timerRepository.save(existingTimer);
    }

    // Create a new timer
    const timer = new GameTimer();
    timer.gameId = gameId;
    timer.timerType = timerType.toString();
    timer.durationSeconds = durationSeconds;
    timer.remainingSeconds = durationSeconds;
    timer.startTime = Date.now();

    return this.timerRepository.save(timer);
  }

  /**
   * Updates the remaining time for a timer
   */
  async updateTimer(gameId: string, timerType: TimerType): Promise<GameTimer | null> {
    const timer = await this.timerRepository.findOne({
      where: { gameId, timerType: timerType.toString() },
    });

    if (!timer || timer.isExpired || timer.isPaused) {
      return timer;
    }

    // Calculate remaining time
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - timer.startTime) / 1000);
    timer.remainingSeconds = Math.max(0, timer.durationSeconds - elapsedSeconds);

    // Check if timer has expired
    if (timer.remainingSeconds === 0) {
      timer.isExpired = true;
    }

    // Save the updated timer
    return this.timerRepository.save(timer);
  }

  /**
   * Gets the current timer for a game
   */
  async getTimer(gameId: string, timerType: TimerType): Promise<GameTimer | null> {
    return this.timerRepository.findOne({
      where: { gameId, timerType: timerType.toString() },
    });
  }

  /**
   * Pauses a timer
   */
  async pauseTimer(gameId: string, timerType: TimerType): Promise<GameTimer | null> {
    const timer = await this.timerRepository.findOne({
      where: { gameId, timerType: timerType.toString() },
    });

    if (!timer || timer.isExpired) {
      return timer;
    }

    // Update remaining seconds before pausing
    const currentTime = Date.now();
    const elapsedSeconds = Math.floor((currentTime - timer.startTime) / 1000);
    timer.remainingSeconds = Math.max(0, timer.durationSeconds - elapsedSeconds);
    timer.isPaused = true;

    return this.timerRepository.save(timer);
  }

  /**
   * Resumes a paused timer
   */
  async resumeTimer(gameId: string, timerType: TimerType): Promise<GameTimer | null> {
    const timer = await this.timerRepository.findOne({
      where: { gameId, timerType },
    });

    if (!timer || timer.isExpired) {
      return timer;
    }

    timer.startTime = Date.now() - (timer.durationSeconds - timer.remainingSeconds) * 1000;
    timer.isPaused = false;

    return this.timerRepository.save(timer);
  }

  /**
   * Resets a timer to its original duration
   */
  async resetTimer(gameId: string, timerType: TimerType): Promise<GameTimer | null> {
    const timer = await this.timerRepository.findOne({
      where: { gameId, timerType },
    });

    if (!timer) {
      return null;
    }

    timer.remainingSeconds = timer.durationSeconds;
    timer.startTime = Date.now();
    timer.isExpired = false;
    timer.isPaused = false;

    return this.timerRepository.save(timer);
  }

  /**
   * Deletes a timer
   */
  async deleteTimer(gameId: string, timerType: TimerType): Promise<void> {
    await this.timerRepository.delete({ gameId, timerType });
  }

  /**
   * Deletes all timers for a game
   */
  async deleteAllTimers(gameId: string): Promise<void> {
    await this.timerRepository.delete({ gameId });
  }
}
