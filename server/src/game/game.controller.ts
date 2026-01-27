import { Controller, Post, Body, Get, Param, Query } from '@nestjs/common';
import { GameService } from './game.service';
import { Card } from '../types/game';

@Controller('game')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  @Post('create')
  async createGame(@Body() body: { mode: string; creatorPlayerId: string; socketId: string }) {
    const gameId = await this.gameService.createGame(body.mode, [
      { playerId: body.creatorPlayerId, socketId: body.socketId },
    ]);

    return { gameId };
  }

  @Get(':gameId')
  async getGameState(@Param('gameId') gameId: string, @Query('playerId') playerId: string) {
    console.log(`@Get(':gameId'), game state for PlayerId: ${playerId} in game ${gameId}`);
    return await this.gameService.getPlayerState(gameId, playerId);
  }

  @Get('check-match-status/:tempGameId')
  async checkMatchStatus(@Param('tempGameId') tempGameId: string) {
    console.log("@Get('check-match-status/:tempGameId'");
    return await this.gameService.checkMatchStatus(tempGameId);
  }

  @Post(':gameId/draw-card')
  async drawCard(@Param('gameId') gameId: string, @Body() body: { playerId: string; card: Card }) {
    return await this.gameService.handleDrawCard(gameId, body.playerId);
  }

  @Post(':gameId/discard')
  async discard(@Param('gameId') gameId: string, @Body() body: { playerId: string; card: Card }) {
    return await this.gameService.handleDiscardCard(gameId, body.playerId, body.card);
  }

  @Post(':gameId/end-turn')
  async endTurn(@Param('gameId') gameId: string, @Body() body: { playerId: string }) {
    return await this.gameService.endTurn(gameId, body.playerId);
  }
}
