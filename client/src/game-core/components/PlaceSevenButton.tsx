import React from "react";
import { useGameStore } from "../store/GameStore";
import { cn } from "../utils/cn";
import { useTranslation } from "react-i18next";
import { ArrowDown } from "lucide-react";
import { AudioManager } from "../sound-design/audioManager";

export function PlaceSevenButton() {
  const { t } = useTranslation();
  const { phase, hasPlayedAction, columns, currentPlayer } = useGameStore();

  // Accès aux cartes du joueur
  const playerHand = currentPlayer.hand;
  const playerReserve = currentPlayer.reserve;

  // Vérifie si toutes les conditions sont remplies pour afficher le bouton
  const canPlaceSeven = () => {
    // Vérification de base : phase d'action et aucune action jouée
    if (phase !== "PLAY" || hasPlayedAction) return false;

    // Cherche une colonne avec soit une reserveSuit contenant un 7, soit une sixième carte présente
    return Object.entries(columns).some(([suit, column]) => {
      // Vérifie que la sixième carte est présente
      const isSixthCardPresent = column.cards.length >= 6;
      if (!isSixthCardPresent) return false;

      // Vérifie si un 7 de la bonne couleur est disponible
      const isSevenInReserveSuit =
        column.reserveSuit?.value === "7" && column.reserveSuit?.suit === suit;
      const isSevenInHandOrReserve =
        playerHand.some((card) => card.value === "7" && card.suit === suit) ||
        playerReserve.some((card) => card.value === "7" && card.suit === suit);

      return isSevenInHandOrReserve || isSevenInReserveSuit;
    });
  };

  // Gère le clic sur le bouton
  const handlePlaceSeven = (e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche la propagation du clic
    if (!canPlaceSeven()) return;

    // Trouve la colonne appropriée pour placer le 7
    const suitEntry = Object.entries(columns).find(([suit, column]) => {
      const isSixthCardPresent = column.cards.length >= 6;
      if (!isSixthCardPresent) return false;

      // Vérifie si un 7 de la bonne couleur est disponible
      const isSevenInReserveSuit =
        column.reserveSuit?.value === "7" && column.reserveSuit?.suit === suit;
      const isSevenInHandOrReserve =
        playerHand.some((card) => card.value === "7" && card.suit === suit) ||
        playerReserve.some((card) => card.value === "7" && card.suit === suit);

      return isSevenInHandOrReserve || isSevenInReserveSuit;
    });

    if (suitEntry) {
      const [suit, _] = suitEntry;
      console.log(_);

      // Jouer le son de pose de carte
      AudioManager.getInstance().playCardSound(); // Place le 7 dans la colonne correspondante
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      useGameStore.getState().handleCardPlace(suit as any);
    }
  };

  // Vérifie si le bouton peut être activé
  const isEnabled = canPlaceSeven();

  return (
    <button
      onClick={handlePlaceSeven}
      disabled={!isEnabled}
      className={cn(
        "flex items-center gap-1 px-2 py-1 text-sm rounded",
        "transition-colors duration-200",
        isEnabled
          ? "text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900"
          : "text-gray-400 dark:text-gray-600 cursor-not-allowed",
      )}
    >
      <ArrowDown className="w-4 h-4" />
      <span>{t("game.actions.placeSeven")}</span>
    </button>
  );
}

export default PlaceSevenButton;
