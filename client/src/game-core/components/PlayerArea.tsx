import React, { useState, useRef } from "react";
import { useGameStore } from "../store/GameStore";
import { Card } from "./Card";

import { Shield, ArrowLeftRight, RefreshCw } from "lucide-react";
import { cn } from "../utils/cn";
import { AudioManager } from "../sound-design/audioManager";
import type { Card as CardType } from "../types/game";
import { useTranslation } from "react-i18next";

import { JokerExchangeButton } from "./JokerExchangeButton";

export function PlayerArea() {
  const {
    currentPlayer,
    phase,
    isPlayerTurn,
    selectedCards,
    selectCard,
    hasPlayedAction,
    handleDiscard,
    exchangeCards,
    handleJokerAction,
    handleCardPlace,
    handleQueenChallenge,
    handleStrategicShuffle: storeHandleStrategicShuffle,
  } = useGameStore();

  const [showPopup, setShowPopup] = useState(false);
  const popupTimer = useRef<NodeJS.Timeout>();

  const canUseStrategicShuffle = useGameStore((state) =>
    state.canUseStrategicShuffle(),
  );
  const message = useGameStore((state) => state.message);

  // useEffect(() => {
  //   setShowPopup(true);

  //   popupTimer.current = setTimeout(() => {
  //     setShowPopup(false);
  //   }, 3000);
  // }, [message]);

  const handleStrategicShuffle = () => {
    if (!canUseStrategicShuffle) return;

    storeHandleStrategicShuffle();
    setShowPopup(true);

    if (popupTimer.current) {
      clearTimeout(popupTimer.current);
    }

    popupTimer.current = setTimeout(() => {
      setShowPopup(false);
    }, 3000);
  };

  const [exchangeMode, setExchangeMode] = useState(false);
  const [selectedForExchange, setSelectedForExchange] = useState<{
    card: CardType;
    from: "hand" | "reserve";
  } | null>(null);

  const totalCards = currentPlayer.hand.length + currentPlayer.reserve.length;
  const { t } = useTranslation();

  return (
    <div className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 h-36 transition-colors duration-300">
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-start gap-8">
          {/* Main */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between px-2 relative">
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {t("game.cards.hand")} ({currentPlayer.hand.length}/5)
              </span>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {t("game.cards.total")} {totalCards}/7{" "}
                    {t("game.cards.hand")}
                  </span>
                  {/* <div className="flex flex-col  justify-between"> */}
                  <button
                    onClick={() => {
                      setExchangeMode(!exchangeMode);
                      setSelectedForExchange(null);
                    }}
                    disabled={!isPlayerTurn}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                      !isPlayerTurn
                        ? "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                        : exchangeMode
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300 hover:bg-blue-200 dark:hover:bg-blue-800",
                    )}
                  >
                    <ArrowLeftRight className="w-4 h-4" />
                    <span>{t("game.actions.exchange")}</span>
                  </button>
                  <button
                    onClick={handleStrategicShuffle}
                    disabled={!canUseStrategicShuffle || !isPlayerTurn}
                    className={cn(
                      "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors mr-4",
                      canUseStrategicShuffle && isPlayerTurn
                        ? "bg-purple-100 dark:bg-purple-900/50 hover:bg-purple-200 dark:hover:bg-purple-800/70 text-purple-600 dark:text-purple-400"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50",
                      "ring-1 ring-purple-400/50 hover:ring-purple-500",
                    )}
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>{t("game.ui.strategicShuffle")}</span>
                  </button>

                  <JokerExchangeButton />
                  {/* </div> */}

                  {selectedCards.length > 0 &&
                    selectedCards[0]?.value &&
                    (selectedCards[0].value === "K" ||
                      selectedCards[0].value === "Q" ||
                      selectedCards[0].value === "J") && (
                      <button
                        onClick={() =>
                          useGameStore.getState().setSacrificeMode(true)
                        }
                        disabled={
                          hasPlayedAction || phase !== "PLAY" || !isPlayerTurn
                        }
                        className={cn(
                          "flex items-center gap-1 px-2 py-1 rounded text-sm transition-colors",
                          !hasPlayedAction && phase === "PLAY" && isPlayerTurn
                            ? "bg-red-100 dark:bg-red-900/50 hover:bg-red-200 dark:hover:bg-red-800/70 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed opacity-50",
                          "ring-1 ring-red-400/50 hover:ring-red-500",
                        )}
                        title={t("game.actions.sacrifice.tooltip")}
                      >
                        <span>☠️</span>
                        <span>{t("game.actions.sacrifice.button")}</span>
                      </button>
                    )}
                </div>
              </div>
            </div>

            <div className="flex gap-4 flex-wrap">
              {currentPlayer.hand.map((card) => (
                <div key={card.id} className="relative group">
                  <Card
                    card={card}
                    isSelected={selectedCards.some((c) => c.id === card.id)}
                    onClick={() => {
                      // Prevent any card interactions when it's not the player's turn
                      if (!isPlayerTurn) return;

                      if (exchangeMode) {
                        if (!selectedForExchange) {
                          setSelectedForExchange({ card, from: "hand" });
                        } else if (selectedForExchange.from === "reserve") {
                          exchangeCards(card, selectedForExchange.card);
                          setSelectedForExchange(null);
                          setExchangeMode(false);
                        }
                      } else if (phase === "DISCARD") {
                        handleDiscard(card);
                      } else {
                        selectCard(card);
                      }
                    }}
                    onJokerAction={(action) => {
                      // Only allow joker actions when it's the player's turn
                      if (isPlayerTurn) handleJokerAction(card, action);
                    }}
                    onQueenActivate={() => {
                      // Only allow queen activation when it's the player's turn
                      if (!isPlayerTurn) return;

                      const activator = selectedCards.find(
                        (c) => c.type === "JOKER" || c.value === "7",
                      );
                      if (activator) {
                        // Jouer UNIQUEMENT le son de guérison (pas le son de sacrifice)
                        if (activator.type === "JOKER") {
                          // Pour le +4 (Joker), jouer le son deux fois pour un effet plus puissant
                          AudioManager.getInstance().playHealSound();
                          setTimeout(() => {
                            AudioManager.getInstance().playHealSound();
                          }, 200);
                        } else {
                          // Pour le +2 (avec le 7), jouer le son de guérison une fois
                          AudioManager.getInstance().playHealSound();
                        }

                        handleCardPlace(card.suit);
                      }
                    }}
                    onQueenChallenge={() => {
                      // Only allow queen challenge when it's the player's turn
                      if (isPlayerTurn) {
                        handleQueenChallenge(selectedCards);
                      }
                    }}
                    selectedCards={selectedCards}
                    isPlayerTurn={isPlayerTurn}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Reserve */}
          <div className="w-48 space-y-2">
            <div className="flex items-center gap-2 px-2">
              <Shield className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                {t("game.cards.reserve")} ({currentPlayer.reserve.length}/2)
              </span>
            </div>

            <div className="flex gap-4 justify-center">
              {currentPlayer.reserve.map((card) => (
                <div key={card.id} className="relative group">
                  <Card
                    card={card}
                    isSelected={selectedCards.some((c) => c.id === card.id)}
                    onClick={() => {
                      if (exchangeMode) {
                        if (!selectedForExchange) {
                          setSelectedForExchange({ card, from: "reserve" });
                        } else if (selectedForExchange.from === "hand") {
                          exchangeCards(selectedForExchange.card, card);
                          setSelectedForExchange(null);
                          setExchangeMode(false);
                        }
                      } else if (phase === "DISCARD") {
                        handleDiscard(card);
                      } else {
                        selectCard(card);
                      }
                    }}
                    onJokerAction={(action) => handleJokerAction(card, action)}
                    onQueenActivate={() => {
                      const activator = selectedCards.find(
                        (c) => c.type === "JOKER" || c.value === "7",
                      );
                      if (activator) {
                        // Jouer UNIQUEMENT le son de guérison (pas le son de sacrifice)
                        if (activator.type === "JOKER") {
                          // Pour le +4 (Joker), jouer le son deux fois pour un effet plus puissant
                          AudioManager.getInstance().playHealSound();
                          setTimeout(() => {
                            AudioManager.getInstance().playHealSound();
                          }, 200);
                        } else {
                          // Pour le +2 (avec le 7), jouer le son de guérison une fois
                          AudioManager.getInstance().playHealSound();
                        }
                        handleCardPlace(card.suit);
                      }
                    }}
                    onQueenChallenge={() => {
                      // Only allow queen challenge when it's the player's turn
                      if (isPlayerTurn) {
                        handleQueenChallenge(selectedCards);
                      }
                    }}
                    selectedCards={selectedCards}
                    isPlayerTurn={isPlayerTurn}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {showPopup && (
        <div className="fixed bottom-4 right-4 bg-black/60 text-white px-4 py-2 rounded-lg shadow-lg backdrop-blur-sm transition-opacity duration-300">
          {t(message)}
        </div>
      )}

      {/* {showQueenChallenge && challengeQueen && (
        <QueenChallenge
          queen={challengeQueen}
          onGuess={(isCorrect) => {
            // Handle the queen challenge response locally
            handleQueenChallenge(selectedCards, isCorrect);

            // Hide the local UI
            setShowQueenChallenge(false);
            setChallengeQueen(null);

            // Also hide the popup for the opponent
            setShowQueenChallengePopup(false);
          }}
        />
      )} */}
    </div>
  );
}
