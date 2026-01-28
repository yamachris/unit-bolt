import { Injectable } from '@nestjs/common';
import { Game, Card, Suit } from '../types/game';

@Injectable()
export class SimpleBotService {
  isBot(playerId: string): boolean {
    return playerId.startsWith('AI_');
  }

  async playBotTurn(
    game: Game,
    gateway: any,
  ): Promise<void> {
    const currentPlayerId = game.players[game.currentPlayerIndex];

    if (!this.isBot(currentPlayerId)) {
      return;
    }

    console.log('🤖 Bot turn started');
    await this.delay(1000);

    const playerState = game.playersGameStates[game.currentPlayerIndex];

    if (playerState.phase === 'SETUP') {
      await this.handleBotSetupPlay(game, currentPlayerId, gateway);
      return;
    }

    if (playerState.phase === 'DISCARD' && !playerState.hasDiscarded) {
      await this.handleBotDiscard(game, currentPlayerId, gateway);
      await this.delay(500);
      return;
    }

    if (playerState.phase === 'DRAW' && !playerState.hasDrawn) {
      await this.handleBotDraw(game, currentPlayerId, gateway);
      await this.delay(500);
      return;
    }

    if (playerState.phase === 'PLAY') {
      const played = await this.handleBotPlay(game, currentPlayerId, gateway);
      await this.delay(800);

      if (!played) {
        await this.handleBotEndTurn(game, currentPlayerId, gateway);
      }
      return;
    }
  }

  async handleBotSetupPlay(
    game: Game,
    botPlayerId: string,
    gateway: any,
  ): Promise<void> {
    console.log('🤖 Bot setup phase');
    await this.delay(1000);

    const botIndex = game.players.indexOf(botPlayerId);
    if (botIndex === -1) return;

    const botState = game.playersGameStates[botIndex];
    const hand = botState.currentPlayer.hand;

    const cardsToReserve = hand.slice(0, Math.min(3, hand.length));

    for (const card of cardsToReserve) {
      await gateway.moveToReserve({
        gameId: game.gameId,
        playerId: botPlayerId,
        card,
      }, null);
      await this.delay(300);
    }

    await this.delay(500);
    await gateway.handleStartGame({ gameId: game.gameId, playerId: botPlayerId }, null);
  }

  private async handleBotDiscard(
    game: Game,
    botPlayerId: string,
    gateway: any,
  ): Promise<void> {
    console.log('🤖 Bot discarding card');

    const botIndex = game.players.indexOf(botPlayerId);
    if (botIndex === -1) return;

    const botState = game.playersGameStates[botIndex];
    const hand = botState.currentPlayer.hand;

    if (hand.length === 0) return;

    const cardToDiscard = this.findWorstCard(hand);

    await gateway.handleDiscard({
      gameId: game.gameId,
      playerId: botPlayerId,
      card: cardToDiscard,
    });
  }

  private async handleBotDraw(
    game: Game,
    botPlayerId: string,
    gateway: any,
  ): Promise<void> {
    console.log('🤖 Bot drawing card');

    await gateway.handleDrawCard({
      gameId: game.gameId,
      playerId: botPlayerId,
    });
  }

  private async handleBotPlay(
    game: Game,
    botPlayerId: string,
    gateway: any,
  ): Promise<boolean> {
    console.log('🤖 Bot playing card');

    const botIndex = game.players.indexOf(botPlayerId);
    if (botIndex === -1) return false;

    const botState = game.playersGameStates[botIndex];
    const hand = botState.currentPlayer.hand;

    const suits: Suit[] = ['HEARTS', 'DIAMONDS', 'CLUBS', 'SPADES'];

    for (const suit of suits) {
      const column = botState.columns[suit];
      if (!column) continue;

      for (const card of hand) {
        if (card.suit === suit && this.canPlaceCard(card, column)) {
          await gateway.handlePlaceCard({
            gameId: game.gameId,
            playerId: botPlayerId,
            suit: suit,
            cards: [card],
          });
          return true;
        }
      }
    }

    return false;
  }

  private async handleBotEndTurn(
    game: Game,
    botPlayerId: string,
    gateway: any,
  ): Promise<void> {
    console.log('🤖 Bot ending turn');

    await gateway.handleEndTurn({
      gameId: game.gameId,
      playerId: botPlayerId,
    });
  }

  private canPlaceCard(card: Card, column: any): boolean {
    if (!column.cards || column.cards.length === 0) {
      return card.value === 'A';
    }

    const lastCard = column.cards[column.cards.length - 1];
    const sequence = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

    const lastIndex = sequence.indexOf(lastCard.value);
    const cardIndex = sequence.indexOf(card.value);

    return cardIndex === lastIndex + 1;
  }

  private findWorstCard(hand: Card[]): Card {
    const valueOrder = ['10', '9', '8', '7', '6', '5', '4', '3', '2', 'A'];

    for (const value of valueOrder) {
      const card = hand.find(c => c.value === value);
      if (card) return card;
    }

    return hand[0];
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
