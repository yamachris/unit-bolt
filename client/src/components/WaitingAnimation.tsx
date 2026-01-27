interface WaitingAnimationProps {
  message?: string;
  playerCount?: number;
  maxPlayers?: number;
}

export default function WaitingAnimation({
  message = "En attente d'autres joueurs...",
  playerCount = 1,
  maxPlayers = 2,
}: WaitingAnimationProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl shadow-xl">
      {/* Animation des cartes qui se mélangent */}
      <div className="relative mb-8">
        <div className="flex space-x-2">
          {/* Pile de cartes animées */}
          <div className="relative">
            <div className="w-20 h-28 bg-gradient-to-br from-blue-600 to-blue-800 rounded-lg shadow-lg transform rotate-6 animate-pulse"></div>
            <div className="absolute top-0 left-0 w-20 h-28 bg-gradient-to-br from-red-600 to-red-800 rounded-lg shadow-lg transform -rotate-3 animate-pulse delay-200"></div>
            <div className="absolute top-0 left-0 w-20 h-28 bg-gradient-to-br from-green-600 to-green-800 rounded-lg shadow-lg transform rotate-1 animate-pulse delay-400"></div>
          </div>

          {/* Cartes qui volent */}
          <div className="relative ml-8">
            <div className="w-16 h-22 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg shadow-lg animate-bounce transform translate-y-2"></div>
            <div className="absolute -top-4 -right-2 w-12 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-lg shadow-lg animate-bounce delay-300 transform -translate-y-1"></div>
          </div>
        </div>

        {/* Particules magiques */}
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2">
          <div className="flex space-x-3">
            <div className="w-3 h-3 bg-yellow-400 rounded-full animate-ping"></div>
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping delay-200"></div>
            <div className="w-3 h-3 bg-purple-400 rounded-full animate-ping delay-400"></div>
          </div>
        </div>

        {/* Cercles d'énergie */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-32 h-32 border-2 border-blue-300 rounded-full animate-spin opacity-30"></div>
          <div className="absolute w-24 h-24 border-2 border-purple-300 rounded-full animate-spin animate-reverse opacity-20"></div>
        </div>
      </div>

      {/* Compteur de joueurs */}
      <div className="mb-6">
        <div className="flex items-center justify-center space-x-4">
          {Array.from({ length: maxPlayers }, (_, i) => (
            <div
              key={i}
              className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg transition-all duration-500 ${
                i < playerCount
                  ? "bg-gradient-to-br from-green-500 to-green-600 shadow-lg scale-110"
                  : "bg-gray-300 animate-pulse"
              }`}
            >
              {i < playerCount ? "✓" : "?"}
            </div>
          ))}
        </div>
        <p className="text-center mt-3 text-sm text-gray-600">
          {playerCount} / {maxPlayers} joueurs
        </p>
      </div>

      {/* Message principal */}
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold text-gray-800 mb-2 animate-pulse">
          {message}
        </h3>

        {/* Barre de progression animée */}
        <div className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* Points de chargement avec style gaming */}
      <div className="flex justify-center space-x-2">
        <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
        <div className="w-3 h-3 bg-purple-500 rounded-full animate-bounce delay-100"></div>
        <div className="w-3 h-3 bg-pink-500 rounded-full animate-bounce delay-200"></div>
        <div className="w-3 h-3 bg-indigo-500 rounded-full animate-bounce delay-300"></div>
      </div>

      {/* Texte d'encouragement */}
      <p className="text-center text-gray-500 mt-4 text-sm animate-pulse">
        Préparez-vous pour une partie épique ! 🎮
      </p>
    </div>
  );
}
