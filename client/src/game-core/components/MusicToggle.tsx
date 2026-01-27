import React, { useState, useEffect } from "react";
import { AudioManager } from "../sound-design/audioManager";

export const MusicToggle: React.FC = () => {
  const [isMuted, setIsMuted] = useState(false);

  useEffect(() => {
    const audioManager = AudioManager.getInstance();
    setIsMuted(audioManager.isMusicMuted());
  }, []);

  const toggleMusic = () => {
    const audioManager = AudioManager.getInstance();
    audioManager.toggleMute();
    setIsMuted(audioManager.isMusicMuted());
  };

  return (
    <button
      onClick={toggleMusic}
      className="h-[40px] w-[40px] flex items-center justify-center dark:bg-gray-700 bg-gray-200 dark:hover:bg-gray-600 hover:bg-gray-300 rounded-full transition-colors"
      aria-label={isMuted ? "Unmute music" : "Mute music"}
    >
      <span
        className={`text-xl ${isMuted ? "opacity-50" : ""} dark:text-gray-300 text-gray-700`}
      >
        ♪
      </span>
    </button>
  );
};
