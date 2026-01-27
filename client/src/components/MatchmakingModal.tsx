"use client";

interface MatchmakingModalProps {
  onCancel: () => void;
}

export default function MatchmakingModal({ onCancel }: MatchmakingModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 modal-backdrop">
      <div className="bg-gray-800 border border-gray-600 text-white p-6 rounded-2xl shadow-2xl relative overflow-hidden max-w-sm w-full mx-4 modal-content">
        {/* Animated background waves */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute w-full h-full bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 animate-pulse"></div>
        </div>

        {/* Content */}
        <div className="relative z-10 text-center">
          {/* Header */}
          <div className="flex items-center justify-center mb-4">
            <div className="text-2xl mr-2">🎮</div>
            <h3 className="text-xl font-bold text-white">{`Recherche d'adversaire`}</h3>
            <div className="text-2xl ml-2 animate-bounce">🔍</div>
          </div>

          {/* Animated spinner */}
          <div className="relative w-20 h-20 mx-auto mb-4">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-blue-500/30 rounded-full animate-spin"></div>
            {/* Middle ring */}
            <div
              className="absolute inset-2 border-4 border-purple-500/50 rounded-full animate-spin"
              style={{
                animationDirection: "reverse",
                animationDuration: "1.5s",
              }}
            ></div>
            {/* Inner ring */}
            <div
              className="absolute inset-4 border-4 border-pink-500/70 rounded-full animate-spin"
              style={{ animationDuration: "0.8s" }}
            ></div>

            {/* Orbiting dots */}
            <div
              className="absolute inset-0 animate-spin"
              style={{ animationDuration: "2s" }}
            >
              <div className="absolute w-2 h-2 bg-yellow-400 rounded-full -top-1 left-1/2 transform -translate-x-1/2"></div>
              <div className="absolute w-2 h-2 bg-green-400 rounded-full top-1/2 -right-1 transform -translate-y-1/2"></div>
              <div className="absolute w-2 h-2 bg-red-400 rounded-full -bottom-1 left-1/2 transform -translate-x-1/2"></div>
              <div className="absolute w-2 h-2 bg-blue-400 rounded-full top-1/2 -left-1 transform -translate-y-1/2"></div>
            </div>

            {/* Center icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-2xl animate-pulse">⚔️</div>
            </div>
          </div>

          {/* Status text */}
          <div className="mb-4">
            <p className="text-lg font-semibold mb-2">
              Recherche en cours
              <span className="inline-flex ml-1">
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "0ms" }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "150ms" }}
                >
                  .
                </span>
                <span
                  className="animate-bounce"
                  style={{ animationDelay: "300ms" }}
                >
                  .
                </span>
              </span>
            </p>

            {/* Progress bar */}
            <div className="w-full bg-gray-700 rounded-full h-2 mb-3 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full relative">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-pulse"></div>
                <div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent w-full"
                  style={{
                    animation: "shine 2s ease-in-out infinite",
                  }}
                ></div>
              </div>
            </div>

            <p className="text-sm text-gray-300">
              Recherche dans toutes les régions...
            </p>
          </div>

          {/* Cancel button */}
          <div className="flex justify-center">
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all duration-200 border border-red-500 hover:border-red-400 shadow-md hover:shadow-lg transform hover:scale-105 font-medium"
            >
              ❌ Annuler
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes shine {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(100%);
          }
        }

        .modal-backdrop {
          animation: backdropFadeIn 0.5s ease-out forwards;
        }

        .modal-content {
          animation: modalSlideIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }

        @keyframes backdropFadeIn {
          from {
            background-color: rgba(0, 0, 0, 0);
            backdrop-filter: blur(0px);
          }
          to {
            background-color: rgba(0, 0, 0, 0.6);
            backdrop-filter: blur(4px);
          }
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
