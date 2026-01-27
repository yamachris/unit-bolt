import React, { useState, useEffect, useRef, useCallback } from "react";
import { useGameStore } from "../store/GameStore";
import "./AttackPopup.css";
import { Card, AttackTarget } from "../types/game";
import { useTranslation } from "react-i18next";
import { AudioManager } from "../sound-design/audioManager";

// Attack types
type AttackType = "unit" | "health";

interface AttackPopupProps {
  onClose: () => void;
  onConfirm: (attackCard: Card, target: AttackTarget) => void;
}

export const AttackPopup: React.FC<AttackPopupProps> = ({
  onClose,
  onConfirm,
}) => {
  const {
    opponentPlayerColumns,
    turnTimeRemaining,
    turnTimeInit,
    currentAttackCard,
    gameId,
    currentPlayer,
    validAttackTargets,
  } = useGameStore();

  // Get the player ID from the current player
  const playerId = currentPlayer?.id;

  // Check if the attack card is a unit card with value less than 8
  const isLowValueUnitCard: boolean = !!(
    currentAttackCard &&
    ["A", "2", "3", "4", "5", "6", "7"].includes(currentAttackCard.value)
  );

  const isJokerCard = currentAttackCard?.value === "JOKER";

  // Check if health attack is blocked by a King in the same suit
  const isHealthAttackBlocked = (): boolean => {
    if (!currentAttackCard || isJokerCard) return false;
    const currentSuit = currentAttackCard.suit;
    const opponentColumn = opponentPlayerColumns[currentSuit];
    return opponentColumn.faceCards?.K !== undefined;
  };

  // Default attack type logic
  const getDefaultAttackType = (): AttackType => {
    if (isJokerCard) return "unit"; // Joker defaults to unit attack
    if (isLowValueUnitCard && !isHealthAttackBlocked()) return "health"; // Low value unit cards default to health attack if not blocked
    return "unit"; // Default to unit attack otherwise
  };
  const [selectedAttackType, setSelectedAttackType] = useState<AttackType>(
    getDefaultAttackType(),
  );
  const healthAttackBlocked = isHealthAttackBlocked();

  // Calculate damage points based on the card value
  const calculateDamagePoints = () => {
    if (!currentAttackCard) return 1; // Default damage

    // Map card values to damage points
    const damageMap: { [key: string]: number } = {
      A: 1,
      "2": 2,
      "3": 3,
      "4": 4,
      "5": 5,
      "6": 6,
      "7": 7,
      "8": 8,
      "9": 9,
      "10": 10,
      J: 10,
      Q: 10,
      K: 10,
    };

    return damageMap[currentAttackCard.value] || 1;
  };

  const damagePoints = calculateDamagePoints();
  const [selectedTarget, setSelectedTarget] = useState<AttackTarget | null>(
    null,
  );
  const [availableTargets, setAvailableTargets] = useState<AttackTarget[]>([]);
  const [timeRemaining, setTimeRemaining] = useState(turnTimeRemaining);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();

  // Close the popup
  const handleClose = useCallback(() => {
    // Play sound effect
    AudioManager.getInstance().playCardSound();
    onClose();
  }, [onClose]);

  // Handle attack confirmation
  const handleConfirm = () => {
    if (!selectedTarget || !selectedTarget.valid || !currentAttackCard) return;

    onConfirm(currentAttackCard, selectedTarget);

    handleClose();
  };

  // Setup countdown timer
  useEffect(() => {
    // Initialize timer with the current turn time remaining
    setTimeRemaining(turnTimeRemaining > 0 ? turnTimeRemaining : turnTimeInit);

    // Create interval to update timer
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Time's up - close the popup
          handleClose();
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
  }, [turnTimeRemaining, turnTimeInit, handleClose]);

  // Get attack targets from game state when attack type or card changes
  useEffect(() => {
    setSelectedTarget(null);

    // Only process targets if we have a valid attack card
    if (!currentAttackCard || !gameId || !playerId) {
      setAvailableTargets([]);
      return;
    }

    if (
      validAttackTargets &&
      currentAttackCard.id &&
      validAttackTargets[currentAttackCard.id]
    ) {
      const targets = validAttackTargets[currentAttackCard.id];

      // Filter targets based on selected attack type
      const filteredTargets = targets.filter((target) =>
        selectedAttackType === "health"
          ? target.attackType === "health"
          : target.attackType === "unit",
      );

      // Process the targets to ensure column references are correct
      const processedTargets = filteredTargets.map((target) => {
        if (target.suit && target.suit !== "SPECIAL") {
          // For unit attacks, ensure we have the correct column reference
          return {
            ...target,
            column: opponentPlayerColumns[target.suit],
          };
        }
        return target;
      });

      setAvailableTargets(processedTargets);
    } else {
      setAvailableTargets([]);
    }
  }, [
    selectedAttackType,
    currentAttackCard,
    gameId,
    playerId,
    opponentPlayerColumns,
    validAttackTargets,
  ]);

  // Get suit symbol
  const getSuitSymbol = (suit: string) => {
    switch (suit.toUpperCase()) {
      case "HEARTS":
        return "♥";
      case "DIAMONDS":
        return "♦";
      case "CLUBS":
        return "♣";
      case "SPADES":
        return "♠";
      default:
        return "";
    }
  };

  // Group cards by suit for display
  const groupTargetsBySuit = () => {
    // For health attack, we don't need to group by suit
    if (selectedAttackType === "health") {
      return { DAMAGE: availableTargets };
    }

    // For unit attack, group by suit as before
    const grouped: { [key: string]: AttackTarget[] } = {
      HEARTS: [] as AttackTarget[],
      DIAMONDS: [] as AttackTarget[],
      CLUBS: [] as AttackTarget[],
      SPADES: [] as AttackTarget[],
    };

    availableTargets.forEach((target) => {
      if (target.suit && grouped[target.suit]) {
        grouped[target.suit].push(target);
      }
    });

    return grouped;
  };

  const groupedTargets = groupTargetsBySuit();

  return (
    <div className="attack-popup-overlay">
      <div className="attack-popup">
        <div className="popup-header">
          <h2>
            {selectedAttackType === "unit"
              ? "🗡️ Unit Attack"
              : "❤️ Health Attack"}
          </h2>
          <button className="close-button" onClick={handleClose}>
            ×
          </button>
        </div>

        <div className="attack-type-selector">
          <button
            className={`attack-type-button ${selectedAttackType === "unit" && !isLowValueUnitCard ? "selected" : ""} ${
              isLowValueUnitCard ? "disabled" : ""
            }`}
            onClick={() => !isLowValueUnitCard && setSelectedAttackType("unit")}
            disabled={isLowValueUnitCard}
            title={
              isLowValueUnitCard
                ? "Unit attack unavailable for cards below 8"
                : ""
            }
          >
            🗡️ Unit Attack {isLowValueUnitCard && "(Unavailable)"}
          </button>
          <button
            className={`attack-type-button ${selectedAttackType === "health" ? "selected" : ""} ${
              isJokerCard || healthAttackBlocked ? "disabled" : ""
            }`}
            onClick={() =>
              !isJokerCard &&
              !healthAttackBlocked &&
              setSelectedAttackType("health")
            }
            disabled={isJokerCard || healthAttackBlocked}
            title={
              isJokerCard
                ? "Joker cannot attack health directly"
                : healthAttackBlocked
                  ? "Health attack blocked by King in same suit"
                  : "Attaquer les points de vie de l'adversaire"
            }
          >
            ❤️ Health Attack{" "}
            {(isJokerCard || healthAttackBlocked) && "(Unavailable)"}
          </button>
        </div>

        <p className="selection-info">
          Time remaining:{" "}
          <span className={`timer ${timeRemaining <= 3 ? "urgent" : ""}`}>
            {timeRemaining}s
          </span>
        </p>

        <div className="suits-container">
          {selectedAttackType === "health" ? (
            // For health attack, show damage points
            <div className="damage-container">
              <div className="damage-header">💥 Damage Points</div>
              <div className="damage-value">
                {availableTargets.length > 0 && (
                  <div
                    className={`damage-slot ${selectedTarget === availableTargets[0] ? "selected" : ""}`}
                    onClick={() =>
                      availableTargets[0].valid &&
                      setSelectedTarget(availableTargets[0])
                    }
                  >
                    {damagePoints}
                  </div>
                )}
              </div>
              <div className="damage-description">
                Your attack will deal {damagePoints} damage points to your
                opponent
              </div>
            </div>
          ) : (
            // For unit attack, show suits as before
            Object.entries(groupedTargets).map(([suit, targets]) => (
              <div key={suit} className="suit-column">
                {!isLowValueUnitCard && (
                  <>
                    <div className={`suit-header ${suit}`}>
                      {getSuitSymbol(suit)}
                    </div>
                    <div className="suit-cards">
                      {targets.map((target) => (
                        <div
                          key={`${target.suit}-${target.cardValue}`}
                          className={`card-slot ${selectedTarget === target ? "selected" : ""} ${
                            !target.valid ? "invalid" : ""
                          }`}
                          onClick={() =>
                            target.valid && setSelectedTarget(target)
                          }
                        >
                          {target.cardValue}
                          {!target.valid && target.reason && (
                            <div className="invalid-reason">
                              {target.reason}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))
          )}
        </div>

        <div className="popup-actions">
          <button className="cancel-button" onClick={handleClose}>
            {t("game.ui.cancel")}
          </button>
          <button
            className="confirm-button"
            onClick={handleConfirm}
            disabled={!selectedTarget?.valid}
          >
            {t("game.ui.confirm") + " & " + t("game.actions.endTurn")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AttackPopup;
