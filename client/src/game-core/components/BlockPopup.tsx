import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGameStore } from "../store/GameStore";
import { Card, AttackTarget } from "../types/game";
import { useTranslation } from "react-i18next";
import { AudioManager } from "../sound-design/audioManager";
import "./AttackPopup.css"; // Reuse the attack popup styles
import "./BlockPopup.css"; // Additional styles specific to BlockPopup

interface BlockPopupProps {
  onClose: () => void;
  onConfirm: (willBlock: boolean, blockingCard?: Card) => void;
  attackCard: Card;
  attackTarget: AttackTarget;
  attackingPlayerId: string;
  blockingCards?: Card[];
}

export const BlockPopup: React.FC<BlockPopupProps> = ({
  onClose,
  onConfirm,
  attackCard,
  attackTarget,
  attackingPlayerId,
  blockingCards,
}) => {
  const { columns, currentPlayer, turnTimeRemaining, turnTimeInit } =
    useGameStore();
  const [timeRemaining, setTimeRemaining] = useState(turnTimeRemaining);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  const [selectedBlockingCard, setSelectedBlockingCard] = useState<Card | null>(
    blockingCards && blockingCards.length > 0 ? blockingCards[0] : null,
  );

  // Close the popup
  const handleClose = useCallback(() => {
    AudioManager.getInstance().playCardSound();
    onClose();
  }, [onClose]);

  // Handle block confirmation
  const handleBlock = () => {
    // console.log("handle block ", selectedBlockingCard);

    if (!selectedBlockingCard) return;
    onConfirm(true, selectedBlockingCard);
    handleClose();
  };

  // Handle decline
  const handleDecline = useCallback(() => {
    // console.log("handleDecline...");

    onConfirm(false);
    handleClose();
  }, [onConfirm, handleClose]);

  // Setup countdown timer
  useEffect(() => {
    // Initialize timer with the current turn time remaining
    setTimeRemaining(turnTimeRemaining > 0 ? turnTimeRemaining : turnTimeInit);

    // Create interval to update timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - automatically decline
          // handleDecline();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [turnTimeRemaining, turnTimeInit, handleDecline]);

  // Get the target description
  const getTargetDescription = () => {
    if (attackTarget.attackType === "health") {
      return t("attack.healthTarget");
    } else if (attackTarget.attackType === "unit") {
      return `${attackTarget.cardValue} of ${attackTarget.suit}`;
    }
    return "";
  };

  if (blockingCards && attackTarget.suit)
    console.log(
      blockingCards.filter((card) => {
        return card.value === "7";
      }),
    );

  console.log(blockingCards);
  console.log(columns);

  return (
    <div className="attack-popup-overlay">
      <div className="attack-popup">
        <div className="popup-header">
          <h2>🃏 {t("game.block.title")}</h2>
          <button className="close-button" onClick={handleDecline}>
            ×
          </button>
        </div>

        <div className="selection-help">
          {t("game.block.description", {
            player: attackingPlayerId,
            card: `${attackCard.value} of ${attackCard.suit}`,
            target: getTargetDescription(),
          })}
        </div>

        <div className="attack-type-selector">
          <button className={`attack-type-button selected`} disabled={false}>
            🃏 {t("game.block.block")}
          </button>
        </div>

        <p className="selection-info">
          Time remaining:{" "}
          <span className={`timer ${timeRemaining <= 3 ? "urgent" : ""}`}>
            {timeRemaining}s
          </span>
        </p>

        {blockingCards && blockingCards.length > 0 && attackTarget.suit ? (
          <>
            <div className="suits-container">
              <div className="suit-column">
                <div className="suit-header popup-header">
                  <h2>🃏 {t("game.block.selectCard")}</h2>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  {/* Group jokers by location (column/hand/reserve) */}
                  <div className="card-group">
                    <div className="card-group-header">
                      {t("game.block.inColumn")}
                    </div>
                    {blockingCards
                      .filter((card) => {
                        return card.value === "7";
                      })
                      .map((card) => (
                        <div
                          key={card.id}
                          className={`card-slot ${selectedBlockingCard?.id === card.id ? "selected" : ""}`}
                          onClick={() => setSelectedBlockingCard(card)}
                        >
                          <div className="card-value">{card.value}</div>
                          <div className="card-suit">{card.suit}</div>
                        </div>
                      ))}
                  </div>
                  <div className="card-group">
                    <div className="card-group-header">
                      {t("game.block.inHand")}
                    </div>
                    {blockingCards
                      .filter((card) =>
                        currentPlayer.hand.some((c) => c.id === card.id),
                      )
                      .map((card) => (
                        <div
                          key={card.id}
                          className={`card-slot ${selectedBlockingCard?.id === card.id ? "selected" : ""}`}
                          onClick={() => setSelectedBlockingCard(card)}
                        >
                          <div className="card-value">{card.value}</div>
                          <div className="card-suit">{card.suit}</div>
                        </div>
                      ))}
                  </div>

                  <div className="card-group">
                    <div className="card-group-header">
                      {t("game.block.inReserve")}
                    </div>
                    {blockingCards
                      .filter((card) =>
                        currentPlayer.reserve.some((c) => c.id === card.id),
                      )
                      .map((card) => (
                        <div
                          key={card.id}
                          className={`card-slot ${selectedBlockingCard?.id === card.id ? "selected" : ""}`}
                          onClick={() => setSelectedBlockingCard(card)}
                        >
                          <div className="card-value">{card.value}</div>
                          <div className="card-suit">{card.suit}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="popup-actions">
              <button className="cancel-button" onClick={handleDecline}>
                ❌ {t("game.block.decline")}
              </button>
              <button
                className="confirm-button"
                onClick={handleBlock}
                disabled={!selectedBlockingCard}
              >
                ✅ {t("game.block.block")}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="suits-container">
              <div className="damage-container">
                <div className="damage-header">
                  ⚠️ {t("game.block.noJokers")}
                </div>
                <div className="damage-description">
                  {t("game.block.description", {
                    player: attackingPlayerId,
                    card: `${attackCard.value} of ${attackCard.suit}`,
                    target: getTargetDescription(),
                  })}
                </div>
              </div>
            </div>
            <div className="popup-actions">
              <button className="cancel-button" onClick={handleDecline}>
                ❌ {t("game.block.decline")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
