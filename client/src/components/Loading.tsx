interface LoadingProps {
  message?: string;
  showCards?: boolean;
}

export default function Loading({
  message = "Chargement du jeu...",
  showCards = false,
}: LoadingProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8">
      {/* Animation principale avec cartes */}
      {showCards ? (
        <div className="relative mb-6">
          {/* Cartes qui tournent */}
          <div className="relative w-24 h-32">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg transform rotate-12 animate-pulse"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-red-500 to-pink-600 rounded-lg shadow-lg transform -rotate-12 animate-pulse delay-150"></div>
            <div className="absolute inset-0 bg-gradient-to-br from-green-500 to-teal-600 rounded-lg shadow-lg animate-pulse delay-300"></div>
          </div>

          {/* Particules flottantes */}
          <div className="absolute -top-4 -left-4 w-2 h-2 bg-yellow-400 rounded-full animate-bounce"></div>
          <div className="absolute -top-2 -right-6 w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce delay-200"></div>
          <div className="absolute -bottom-4 -right-2 w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-500"></div>
          <div className="absolute -bottom-2 -left-6 w-1.5 h-1.5 bg-green-400 rounded-full animate-bounce delay-700"></div>
        </div>
      ) : (
        /* Animation spinner classique améliorée */
        <div className="relative mb-6">
          <div className="w-16 h-16 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="absolute inset-2 w-12 h-12 border-4 border-gray-200 border-t-purple-500 rounded-full animate-spin animate-reverse"></div>
        </div>
      )}

      {/* Message avec animation de typing */}
      <div className="text-center">
        <p className="text-lg font-medium text-gray-700 mb-2 animate-pulse">
          {message}
        </p>

        {/* Points de chargement animés */}
        <div className="flex justify-center space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-100"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce delay-200"></div>
        </div>
      </div>
    </div>
  );
}
