import { useEffect, useRef, useState } from "react";
import { useGameStore } from "../store/GameStore";

export function useGameTimer() {
  const { phase, isGameOver, startAt } = useGameStore();
  const [totalGameTime, setTotalGameTime] = useState<number>(0);
  const [isWaiting, setIsWaiting] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Don't start timer during setup or if game is over
    if (phase === "SETUP" || isGameOver) {
      return;
    }

    // If startAt is not set, we're waiting for the other player
    if (!startAt) {
      setIsWaiting(true);
      return;
    }

    setIsWaiting(false);

    // Calculate elapsed time since game started
    const now = Date.now();
    const initialElapsedSeconds = Math.floor((now - startAt) / 1000);
    setTotalGameTime(initialElapsedSeconds > 0 ? initialElapsedSeconds : 0);

    // Start the timer that updates every second
    timerRef.current = setInterval(() => {
      const currentTime = Date.now();
      const elapsedSeconds = Math.floor((currentTime - startAt) / 1000);
      setTotalGameTime(elapsedSeconds > 0 ? elapsedSeconds : 0);
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [phase, isGameOver, startAt]);

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
  };

  return {
    totalGameTime,
    formattedTotalTime: formatTime(totalGameTime),
    isWaiting,
  };
}
