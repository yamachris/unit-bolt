import React from "react";
import { useGameStore } from "../store/GameStore";
import { UnitColumn } from "./UnitColumn";
import { Suit, SUITS } from "../types/game";
import { RevolutionPopup } from "./RevolutionPopup";
import { AudioManager } from "../sound-design/audioManager";
import { OpponentHandVisualizer } from "./OpponentHandVisualizer";
import { AttackPopup } from "./AttackPopup";
import { AttackNotification } from "./AttackNotification";
import { BlockPopup } from "./BlockPopup";
import { AttackResultPopup } from "./AttackResultPopup";
import { QueenChallenge } from "./QueenChallenge";

export function GameBoard() {
  const {
    selectedCards,
    columns,
    handleCardPlace,
    phase,
    showAttackPopup,
    setShowAttackPopup,
    handleAttackConfirm,
    showAttackNotification,
    attackNotificationData,
    setShowAttackNotification,
    showBlockPopup,
    blockRequestData,
    handleBlockResponse,
    showQueenChallengePopup,
    queenChallengeData,
    handleQueenChallengeResponse,
    showAttackResultPopup,
    attackResultData,
    setShowAttackResultPopup,
  } = useGameStore();

  const canPlaceCard = (suit: Suit) => {
    if (phase !== "PLAY") return false;

    // Pour l'activation avec As + JOKER/7
    if (selectedCards.length === 2) {
      const [card1, card2] = selectedCards;

      // Vérifier si c'est une activation de tête
      const hasFaceCard =
        card1.value === "J" ||
        card1.value === "K" ||
        card2.value === "J" ||
        card2.value === "K";
      const hasActivator =
        card1.type === "JOKER" ||
        card1.value === "7" ||
        card2.type === "JOKER" ||
        card2.value === "7";

      // Les têtes de jeu peuvent toujours être jouées avec un activateur, peu importe l'état de la colonne
      if (hasFaceCard && hasActivator) {
        const faceCard = selectedCards.find(
          (card) => card.value === "J" || card.value === "K",
        );
        // On vérifie uniquement que la tête correspond à la couleur de la colonne
        return faceCard?.suit === suit;
      }

      // Vérifier si c'est une Dame + activateur
      const hasQueen = card1.value === "Q" || card2.value === "Q";
      if (hasQueen && hasActivator) {
        return true;
      }

      // Pour l'activation avec As + Activateur (JOKER ou 7)
      const hasAs = card1.value === "A" || card2.value === "A";
      if (hasAs && hasActivator) {
        const ace = selectedCards.find((card) => card.value === "A");
        return ace?.suit === suit;
      }
    }

    // Pour le placement normal de cartes
    if (selectedCards.length === 1) {
      const column = columns[suit];
      if (!column.hasLuckyCard) return false;
      return (
        selectedCards[0].suit === suit || selectedCards[0].type === "JOKER"
      );
    }

    return false;
  };

  const handleColumnClick = (suit: Suit) => {
    if (!canPlaceCard(suit)) return;

    // Jouer le son de carte directement au moment du clic
    AudioManager.getInstance().playCardSound();

    handleCardPlace(suit);
  };

  return (
    <div className="bg-gradient-to-br from-green-50/95 to-green-100/95 dark:from-gray-800/95 dark:to-gray-700/95 rounded-2xl p-4 md:p-6 shadow-xl transition-colors duration-300">
      {/* Visualisation des cartes de l'adversaire (en haut) */}
      <div className="mb-4">
        <OpponentHandVisualizer />
      </div>

      {showAttackResultPopup &&
        attackResultData.attackCard &&
        attackResultData.target && (
          <AttackResultPopup
            attackCard={attackResultData.attackCard}
            target={attackResultData.target}
            isBlocked={attackResultData.isBlocked}
            onClose={() => setShowAttackResultPopup(false)}
          />
        )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {SUITS.map((suit) => {
          return (
            <UnitColumn
              key={suit}
              suit={suit}
              column={columns[suit]}
              onCardPlace={() => handleColumnClick(suit)}
              isActive={canPlaceCard(suit)}
            />
          );
        })}
      </div>
      <RevolutionPopup />

      {/* Attack Popup */}
      {showAttackPopup && (
        <AttackPopup
          onClose={() => setShowAttackPopup(false)}
          onConfirm={handleAttackConfirm}
        />
      )}

      {/* Attack Notification for opponent */}
      {showAttackNotification &&
        attackNotificationData.attackCard &&
        attackNotificationData.target && (
          <AttackNotification
            attackCard={attackNotificationData.attackCard}
            target={attackNotificationData.target}
            onClose={() =>
              setShowAttackNotification(false, undefined, undefined)
            }
          />
        )}

      {/* Joker Block Request Popup */}
      {showBlockPopup &&
        blockRequestData.attackCard &&
        blockRequestData.attackTarget &&
        blockRequestData.blockingCards && (
          <BlockPopup
            attackCard={blockRequestData.attackCard}
            attackTarget={blockRequestData.attackTarget}
            attackingPlayerId={blockRequestData.attackingPlayerId}
            blockingCards={blockRequestData.blockingCards}
            onClose={() => setShowAttackPopup(false)}
            onConfirm={handleBlockResponse}
          />
        )}

      {/* Queen Challenge Popup */}
      {showQueenChallengePopup && (
        <QueenChallenge
          challengingPlayerId={queenChallengeData.challengingPlayerId}
          onGuess={handleQueenChallengeResponse}
        />
      )}
    </div>
  );
}
