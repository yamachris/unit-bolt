import React, { useEffect, useState } from "react";
import { Card, AttackTarget } from "../types/game";
import "./AttackNotification.css";
import { useTranslation } from "react-i18next";
import { AudioManager } from "../sound-design/audioManager";

interface AttackNotificationProps {
  attackCard: Card;
  target: AttackTarget;
  onClose: () => void;
  duration?: number; // Duration in milliseconds before auto-closing
}

export const AttackNotification: React.FC<AttackNotificationProps> = ({
  attackCard,
  target,
  onClose,
  duration = 5000, // Default 5 seconds
}) => {
  const [timeRemaining, setTimeRemaining] = useState(
    Math.ceil(duration / 1000),
  );
  const { t } = useTranslation();

  // Play attack sound when notification appears
  useEffect(() => {
    AudioManager.getInstance().playRevolutionSound();
  }, []);

  // Auto-close after duration
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    // Countdown timer for display
    const countdownInterval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => {
      clearTimeout(timer);
      clearInterval(countdownInterval);
    };
  }, [duration, onClose]);

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

  // Determine attack type
  const isHealthAttack = !target.suit;
  const attackType = isHealthAttack ? "health" : "unit";

  return (
    <div className="attack-notification-overlay">
      <div className="attack-notification">
        <div className="notification-header">
          <h2>
            {attackType === "unit" ? "🗡️ Unit Attack!" : "❤️ Health Attack!"}
          </h2>
          <div className="timer">{timeRemaining}s</div>
        </div>

        <div className="notification-content">
          <div className="attack-card">
            <div className={`card ${attackCard.suit?.toLowerCase()}`}>
              <div className="card-value">{attackCard.value}</div>
              <div className="card-suit">
                {getSuitSymbol(attackCard.suit || "")}
              </div>
            </div>
          </div>

          <div className="attack-arrow">→</div>

          <div className="target-info">
            {isHealthAttack ? (
              <div className="health-damage">
                <div className="damage-value">-{target.cardValue}</div>
                <div className="damage-label">Health Points</div>
              </div>
            ) : (
              <div className="unit-target">
                <div className={`target-card ${target.suit?.toLowerCase()}`}>
                  <div className="card-value">{target.cardValue}</div>
                  <div className="card-suit">
                    {getSuitSymbol(target.suit || "")}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="notification-message">
          {isHealthAttack
            ? t("game.notifications.healthAttack", {
                damage: target.cardValue,
                defaultValue: `You are under attack! Your opponent is dealing {{damage}} damage to your health.`,
              })
            : t("game.notifications.unitAttack", {
                card: `${target.cardValue}${getSuitSymbol(target.suit || "")}`,
                defaultValue: `You are under attack! Your opponent is attacking your {{card}} card.`,
              })}
        </div>

        <button className="acknowledge-button" onClick={onClose}>
          {t("game.ui.acknowledge", { defaultValue: "OK" })}
        </button>
      </div>
    </div>
  );
};

export default AttackNotification;
