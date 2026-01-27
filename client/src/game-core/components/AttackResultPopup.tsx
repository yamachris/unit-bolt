import React, { useEffect, useState } from "react";
import { Card, AttackTarget } from "../types/game";
// import { useTranslation } from "react-i18next";
import { AudioManager } from "../sound-design/audioManager";
import "./AttackResultPopup.css";

interface AttackResultPopupProps {
  attackCard: Card;
  target: AttackTarget;
  isBlocked: boolean;
  onClose: () => void;
  duration?: number;
}

export const AttackResultPopup: React.FC<AttackResultPopupProps> = ({
  attackCard,
  target,
  isBlocked,
  onClose,
  duration = 1000,
}) => {
  const [timeRemaining, setTimeRemaining] = useState(
    Math.ceil(duration / 1000),
  );
  // const { t } = useTranslation();

  // Play appropriate sound effect
  useEffect(() => {
    if (isBlocked) {
      AudioManager.getInstance().playBlockSound();
    } else {
      AudioManager.getInstance().playAttackSound();
    }
  }, [isBlocked]);

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

  return (
    <div className="attack-result-overlay">
      <div
        className={`attack-result-popup ${isBlocked ? "blocked" : "successful"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="notification-header">
          <h2>{isBlocked ? "🛡️ Attack Blocked!" : "💥 Attack Successful!"}</h2>
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
            {!target.suit ? (
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
      </div>
    </div>
  );
};

export default AttackResultPopup;
