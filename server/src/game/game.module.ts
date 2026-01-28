import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameService } from './game.service';
import { GameController } from './game.controller';
import { GameGateway } from './game.gateway';
import { TimerService } from './timer.service';
import { GameAIService } from './ai/game-ai.service';
import { SimpleBotService } from './simple-bot.service';
import { Game } from '../entities/game.entity';
import { Player } from '../entities/player.entity';
import { MatchmakingQueue } from '../entities/matchmaking-queue.entity';
import { GameTimer } from '../entities/game-timer.entity';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [TypeOrmModule.forFeature([Game, Player, MatchmakingQueue, GameTimer]), AuthModule],
  providers: [GameService, GameGateway, TimerService, GameAIService, SimpleBotService],
  controllers: [GameController],
})
export class GameModule {}
