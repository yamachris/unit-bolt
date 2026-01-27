import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { GameModule } from './game/game.module';
import { Game } from './entities/game.entity';
import { Player } from './entities/player.entity';
import { MatchmakingQueue } from './entities/matchmaking-queue.entity';
import { GameTimer } from './entities/game-timer.entity';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      load: [databaseConfig],
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const dbConfig = configService.get('database');
        return {
          ...dbConfig,
          entities: [Game, Player, MatchmakingQueue, GameTimer],
          synchronize: true, // À désactiver en production
        };
      },
      inject: [ConfigService],
    }),
    GameModule,
  ],
})
export class AppModule {}
