import React from "react";
import { Card, SUITS } from "../types/game";
import { useTranslation } from "react-i18next";
import { useGameStore } from "../store/GameStore";

// Associer chaque couleur à un symbole et un nom
const suitInfo: Record<
  string,
  { symbol: string; name: string; colorClass: string }
> = {
  HEARTS: { symbol: "♥️", name: "Cœurs", colorClass: "text-red-500" },
  DIAMONDS: { symbol: "♦️", name: "Carreaux", colorClass: "text-red-500" },
  CLUBS: {
    symbol: "♣️",
    name: "Trèfles",
    colorClass: "text-gray-800 dark:text-gray-300",
  },
  SPADES: {
    symbol: "♠️",
    name: "Piques",
    colorClass: "text-gray-800 dark:text-gray-300",
  },
};

export const OpponentHandVisualizer = () => {
  // Get opponent's columns from GameStore
  const { opponentPlayerColumns } = useGameStore();

  // Extract cards from opponent's columns
  const extractOpponentCards = () => {
    const cards: Card[] = [];

    Object.values(opponentPlayerColumns).forEach((column) => {
      // Add cards from the column
      cards.push(...column.cards);

      // Add face cards if present
      if (column.faceCards) {
        Object.entries(column.faceCards).forEach(([value, card]) => {
          if (card) cards.push(card);
          if (!value) console.log(value);
        });
      }
    });

    return cards;
  };

  // Use extracted cards or provided cards
  const allOpponentCards = extractOpponentCards();

  // Création d'un tableau pour suivre quelles cartes sont dans la main de l'adversaire
  const opponentCardMap: Record<string, boolean> = {};

  // Remplir le tableau avec les cartes de l'adversaire
  allOpponentCards.forEach((card) => {
    if (card.suit && card.value) {
      const cardKey = `${card.suit}-${card.value}`;
      opponentCardMap[cardKey] = true;
    }
  });

  // Les cartes importantes à afficher
  const importantCards = ["J", "K", "A", "10"];

  // Hook de traduction
  const { t } = useTranslation();

  return (
    <div className="relative p-1 bg-gray-100/70 dark:bg-gray-800/70 rounded-md shadow-sm mb-2">
      {/* Texte ajouté entre les enseignes */}
      <div className="absolute top-[15%] left-1/2 transform -translate-x-1/2 z-10">
        <span className="text-gray-700 dark:text-gray-300 font-medium text-xs">
          {t("game.ui.opponentCards")}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-1 p-1">
        {SUITS.map((suit) => (
          <div key={suit} className="rounded px-1">
            <div className="flex items-center justify-center mb-1">
              <span className={`text-sm ${suitInfo[suit].colorClass}`}>
                {suitInfo[suit].symbol}
              </span>
            </div>

            <div className="flex flex-wrap justify-center gap-1">
              {/* Figures (J, K) avec une taille et bordure distinctive */}
              <div
                key={`${suit}-J`}
                className={`
                  w-4 h-4 rounded-full flex items-center justify-center
                  ${opponentCardMap[`${suit}-J`] ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}
                  border border-yellow-400
                `}
                title={`J de ${suitInfo[suit].name}`}
              >
                <span className="text-[8px] text-black dark:text-white font-bold">
                  J
                </span>
              </div>

              <div
                key={`${suit}-K`}
                className={`
                  w-4 h-4 rounded-full flex items-center justify-center
                  ${opponentCardMap[`${suit}-K`] ? "bg-green-500" : "bg-gray-200 dark:bg-gray-600"}
                  border border-yellow-400
                `}
                title={`K de ${suitInfo[suit].name}`}
              >
                <span className="text-[8px] text-black dark:text-white font-bold">
                  K
                </span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-[2px] mt-1">
              {/* Points minimalistes pour les cartes A-10 avec valeurs */}

              {["A", "2", "3", "4", "5", "6", "7", "8", "9", "10"].map(
                (value, index) => {
                  const cardKey = `${suit}-${value}`;
                  const hasCard = opponentCardMap[cardKey];

                  const placedCard = opponentPlayerColumns[suit].cards[index];
                  const hasJoker = placedCard?.value === "JOKER" ? true : false;

                  const attackButton = opponentPlayerColumns[
                    suit
                  ].attackStatus.attackButtons.find((card) => {
                    return card.id === placedCard?.value;
                  });

                  const canAttack = attackButton?.active;

                  const isImportant = importantCards.includes(value);
                  // Utiliser As pour A et R pour 10/0 (comme dans UnitColumn)
                  let displayValue = value;
                  if (value === "A") displayValue = "As";
                  if (value === "10") displayValue = "R";
                  if (hasJoker) displayValue = "🎭";

                  return (
                    <div
                      key={cardKey}
                      className={`
                      w-4 h-4 rounded-full flex items-center justify-center
                      ${
                        hasCard && canAttack
                          ? "bg-green-500"
                          : hasJoker || (placedCard && !canAttack)
                            ? "bg-red-500"
                            : "bg-gray-200 dark:bg-gray-600"
                      }
                      ${isImportant ? "ring-1 ring-blue-700" : ""}
                    `}
                      title={
                        value === "10"
                          ? `10 ${t("game.cards.of")} ${t("game.cards.revolution")} ${t(
                              `game.cards.suits.${suit.toLowerCase()}`,
                            )}`
                          : `${value === "A" ? t("game.cards.as") : displayValue} ${t("game.cards.of")} ${t(
                              `game.cards.suits.${suit.toLowerCase()}`,
                            )}`
                      }
                    >
                      <span className="text-[7px] text-black dark:text-white font-bold">
                        {displayValue}
                      </span>
                    </div>
                  );
                },
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
