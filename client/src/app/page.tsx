"use client";

import { useState, useEffect, useMemo } from "react";
import Loading from "../components/Loading";
import MatchmakingModal from "../components/MatchmakingModal"; // import { gameSocket, MatchmakingStatusEvent } from "@/services/socket";
import { gameSocket } from "@/services/socket";
import { gameApi } from "@/services/api";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import "@/game-core/i18n/config";
import { LanguageSelector } from "@/game-core/components/LanguageSelector";
import ModernRulesModal from "@/game-core/components/ModernRulesModal";
import { tutorialTitle, tutorialChapters } from "@/data/tutorialData";

export default function Home() {
  const isProd = process.env.NODE_ENV === "production";
  const router = useRouter();
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [playerNickname, setPlayerNickname] = useState("");
  const [error, setError] = useState("");
  const [matchmakingStatus, setMatchmakingStatus] = useState<
    "idle" | "waiting" | "matched"
  >("idle");
  const [tempGameId, setTempGameId] = useState<string | null>(null);
  const [matchCheckInterval, setMatchCheckInterval] =
    useState<NodeJS.Timeout | null>(null);
  const [showRules, setShowRules] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Modern rules structure with complete chapters
  const memoizedTutorialChapters = useMemo(() => tutorialChapters, []);

  // Prevent hydration mismatch
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;

    // Initialize socket connection
    gameSocket.connect();

    // Load player name from local storage if available
    const savedPlayerName = localStorage.getItem("playerNickname");
    if (savedPlayerName) {
      setPlayerNickname(savedPlayerName);
    }

    // Check for existing token
    const token = localStorage.getItem("gameToken");
    if (token) {
      // gameSocket.setAuthToken(token);
    }

    // Set up matchmaking status callback
    // gameSocket.setMatchmakingStatusCallback((event) => {
    //   // console.log(" gameSocket.setMatchmakingStatusCallback ", event);

    //   if (event.status === "matched") {
    //     setMatchmakingStatus("matched");
    //     // Clear any polling interval
    //     if (matchCheckInterval) {
    //       clearInterval(matchCheckInterval);
    //       setMatchCheckInterval(null);
    //     }
    //     // Navigate to the game
    //     router.push(`/online?gameId=${event.gameId}`);
    //   } else if (event.status === "waiting") {
    //     setMatchmakingStatus("waiting");
    //     setTempGameId(event.gameId);
    //     // Start polling for match status
    //     startCheckingForMatch(event.gameId);
    //   }
    // });

    return () => {
      // Clean up interval on unmount
      if (matchCheckInterval) {
        clearInterval(matchCheckInterval);
      }
      gameSocket.disconnect();
    };
  }, [isMounted, matchCheckInterval, router]);

  const handleStartSoloGame = async () => {
    if (!playerNickname.trim()) {
      setError("Please enter your nickname");
      return;
    }
    try {
      setIsLoading(true);
      setError("");
      // Store the player nickname in local storage for persistence
      localStorage.setItem("playerNickname", playerNickname);
      setPlayerNickname(playerNickname);

      const socketId = gameSocket.getSocket()?.id || "";

      const response = await gameApi.createSoloGame(playerNickname, socketId);
      const { gameId } = response;
      if (gameId) {
        const soloPath = isProd
          ? `/solo.html?gameId=${gameId}`
          : `/solo?gameId=${gameId}`;

        router.push(soloPath);
      }
    } catch (error) {
      console.error("Error starting solo game:", error);
      setError("Échec du lancement du jeu solo. Veuillez réessayer.");
      setIsLoading(false);
    } finally {
      // setIsLoading(false);
    }
  };

  const handleFindMatch = async () => {
    if (!playerNickname.trim()) {
      setError("Veuillez entrer votre pseudo");
      return;
    }

    try {
      setIsLoading(true);
      setError("");
      // Store the player nickname in local storage for persistence
      localStorage.setItem("playerNickname", playerNickname);

      // Find a match
      const response = await gameSocket.findMatch(playerNickname);

      if (response.status === "waiting") {
        setMatchmakingStatus("waiting");
        setTempGameId(response.gameId);
        // Start polling for match status
        startCheckingForMatch(response.gameId);
      } else if (response.status === "matched") {
        // We found a match immediately
        setMatchmakingStatus("matched");
        const onlinePath = isProd
          ? `/online.html?gameId=${response.gameId}`
          : `/online?gameId=${response.gameId}`;
        router.push(onlinePath);
      }
    } catch (error) {
      console.error("Error finding match:", error);
      setError("Failed to find a match. Please try again.");
      setMatchmakingStatus("idle");
    } finally {
      setIsLoading(false);
    }
  };

  const startCheckingForMatch = (tempId: string) => {
    // Clear any existing interval
    if (matchCheckInterval) {
      clearInterval(matchCheckInterval);
    }
    // Set up polling to check match status
    const interval = setInterval(async () => {
      try {
        const status = await gameApi.checkMatchStatus(tempId);

        if (status.matched) {
          // We found a match
          clearInterval(interval);
          setMatchCheckInterval(null);
          setMatchmakingStatus("matched");
          // Navigate to the game
          const onlinePath = isProd
            ? `/online.html?gameId=${status.gameId}`
            : `/online?gameId=${status.gameId}`;
          router.push(onlinePath);
        }
      } catch (error) {
        console.error("Error checking match status:", error);
      }
    }, 2000); // Check every 2 seconds
    setMatchCheckInterval(interval);
  };

  const cancelMatchmaking = async () => {
    // Clear the interval
    if (matchCheckInterval) {
      clearInterval(matchCheckInterval);
      setMatchCheckInterval(null);
    }
    // Reset matchmaking status
    setMatchmakingStatus("idle");
    // Call the socket service to cancel matchmaking
    if (tempGameId) {
      try {
        await gameSocket.cancelMatchmaking(tempGameId);
        // console.log("Successfully canceled matchmaking");
      } catch (error) {
        console.error("Error canceling matchmaking:", error);
      }
      setTempGameId(null);
    }
    if (matchCheckInterval) {
      clearInterval(matchCheckInterval);
      setMatchCheckInterval(null);
    }
    // Reset state
    setMatchmakingStatus("idle");
    setTempGameId(null);
    setError("");
  };

  if (isLoading) return <Loading />;
  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl mx-auto">
        {/* Language Selector - positioned prominently */}
        <div className="fixed top-6 right-6 z-50">
          <LanguageSelector variant="homepage" />
        </div>
        {/* Header */}
        <div className="text-center mb-12">
          <div className="relative inline-block mb-6">
            {/* Animated card suits background */}
            <div className="absolute -inset-4 opacity-20">
              <div
                className="absolute top-0 left-0 text-red-500 text-3xl animate-pulse"
                style={{ animationDelay: "0s" }}
              >
                ♦️
              </div>
              <div
                className="absolute top-0 right-0 text-red-500 text-3xl animate-pulse"
                style={{ animationDelay: "0.5s" }}
              >
                ♥️
              </div>
              <div
                className="absolute bottom-0 left-0 text-white text-3xl animate-pulse"
                style={{ animationDelay: "1s" }}
              >
                ♣️
              </div>
              <div
                className="absolute bottom-0 right-0 text-white text-3xl animate-pulse"
                style={{ animationDelay: "1.5s" }}
              >
                ♠️
              </div>
            </div>

            {/* Main title card */}
            <div className="relative bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-1 rounded-3xl shadow-2xl">
              <div className="bg-slate-900/90 backdrop-blur-sm rounded-3xl px-8 py-6">
                <div className="flex items-center justify-center space-x-3">
                  <span
                    className="text-red-500 text-3xl animate-bounce"
                    style={{ animationDelay: "0s" }}
                  >
                    ♦️
                  </span>
                  <span
                    className="text-red-500 text-3xl animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  >
                    ♥️
                  </span>
                  <div className="mx-6">
                    <svg
                      width="200"
                      height="100"
                      viewBox="0 0 1440 1856"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                      className="filter drop-shadow-2xl"
                    >
                      <path
                        d="M1312 720L720 1312L128 720L473.005 374.994C473.003 375.279 473 375.565 473 375.851C473 397.581 478.46 418.035 488.079 435.92L462 462L276 720L462 978L720 1236L1145.49 810.51C1195.48 760.523 1195.48 679.477 1145.49 629.49L720 204L660.07 263.929C642.185 254.309 621.73 248.85 600 248.85C599.715 248.85 599.429 248.853 599.145 248.854L720 128L1312 720Z"
                        fill="url(#gradient1)"
                      />
                      <path
                        d="M720 797C764.183 797 800 832.817 800 877C800 898.995 791.122 918.916 776.756 933.378C787.678 927.786 800.054 924.632 813.167 924.632C857.353 924.632 893.174 960.452 893.174 1004.64C893.174 1048.83 857.354 1084.65 813.167 1084.65C779.082 1084.65 749.975 1063.33 738.448 1033.3C740.946 1072.26 759.825 1123.18 814.271 1149.57L720.043 1235L625.813 1149.57C678.985 1123.8 698.235 1074.63 701.434 1036.06C689.222 1064.63 660.866 1084.65 627.833 1084.65C583.646 1084.65 547.826 1048.83 547.826 1004.64C547.826 960.452 583.647 924.632 627.833 924.632C640.177 924.632 651.869 927.428 662.309 932.421C648.493 918.043 640 898.514 640 877C640 832.817 675.817 797 720 797Z"
                        fill="url(#gradient1)"
                      />
                      <path
                        d="M885.047 293.047C906.442 311.387 920 338.61 920 369C920 424.228 875.228 469 820 469C789.096 469 761.467 454.98 743.124 432.955C749.655 476.268 768.986 522.967 807.333 551H633C671.492 522.861 690.824 475.914 697.282 432.464C678.942 454.772 651.133 469 620 469C564.772 469 520 424.228 520 369C520 338.61 533.557 311.387 554.952 293.047L720 128L885.047 293.047Z"
                        fill="url(#gradient1)"
                      />
                      <path
                        d="M456 544L583 720L456 896L329 720L456 544Z"
                        fill="#DC2628"
                      />
                      <path
                        d="M1004.02 663.201C1019.1 649.707 1038.78 642.5 1059.01 643.06C1079.24 643.62 1098.49 651.904 1112.8 666.21C1127.1 680.507 1135.39 699.732 1135.97 719.944C1136.55 740.156 1129.37 759.824 1115.92 774.916L1004 887L892.101 774.916C878.629 759.816 871.448 740.131 872.033 719.903C872.618 699.675 880.925 680.438 895.247 666.142C909.569 651.846 928.821 643.576 949.049 643.029C969.278 642.482 988.948 649.7 1004.02 663.201Z"
                        fill="#DC2628"
                      />
                      <path
                        d="M352.195 1727.4C310.595 1727.4 280.595 1719.27 262.195 1703C243.795 1686.73 234.595 1660.07 234.595 1623V1511.4C234.595 1502.07 233.662 1494.87 231.795 1489.8C229.929 1484.73 226.329 1481.27 220.995 1479.4C215.662 1477.27 207.662 1476.2 196.995 1476.2V1459H331.795V1476.2C321.129 1476.2 312.995 1477.27 307.395 1479.4C302.062 1481.27 298.462 1484.87 296.595 1490.2C294.995 1495.53 294.195 1503.27 294.195 1513.4V1615.8C294.195 1633.13 296.195 1647.67 300.195 1659.4C304.195 1670.87 311.129 1679.53 320.995 1685.4C330.862 1691 344.595 1693.8 362.195 1693.8C387.262 1693.8 405.529 1688.2 416.995 1677C428.462 1665.53 434.195 1646.07 434.195 1618.6V1527.8C434.195 1513.67 433.395 1502.87 431.795 1495.4C430.195 1487.93 426.729 1482.87 421.395 1480.2C416.062 1477.53 407.795 1476.2 396.595 1476.2V1459H500.595V1476.2C489.129 1476.2 480.595 1477.53 474.995 1480.2C469.662 1482.87 466.195 1487.8 464.595 1495C463.262 1502.2 462.595 1512.73 462.595 1526.6V1616.2C462.595 1653.27 454.062 1681.13 436.995 1699.8C420.195 1718.2 391.929 1727.4 352.195 1727.4Z"
                        fill="url(#gradient2)"
                      />
                      <path
                        d="M780.127 1724.6H734.127L580.927 1518.2H566.527L554.527 1498.6C549.993 1491.93 545.727 1487.13 541.727 1484.2C537.993 1481 533.993 1478.87 529.727 1477.8C525.46 1476.73 520.527 1476.2 514.927 1476.2V1459H610.927L751.327 1647.4H753.327V1527.8C753.327 1517.4 752.66 1508.33 751.327 1500.6C750.26 1492.87 747.06 1486.87 741.727 1482.6C736.66 1478.33 727.86 1476.2 715.327 1476.2V1459H816.127V1476.2C804.66 1476.2 796.393 1478.33 791.327 1482.6C786.26 1486.87 783.06 1492.87 781.727 1500.6C780.66 1508.33 780.127 1517.4 780.127 1527.8V1724.6ZM615.327 1721.8H514.927V1704.6C525.593 1704.6 533.593 1701 538.927 1693.8C544.26 1686.6 547.86 1677.27 549.727 1665.8C551.593 1654.07 552.527 1641.53 552.527 1628.2V1489.4H578.927V1657C578.927 1670.33 579.86 1680.47 581.727 1687.4C583.593 1694.07 587.193 1698.6 592.527 1701C597.86 1703.4 605.46 1704.6 615.327 1704.6V1721.8Z"
                        fill="url(#gradient2)"
                      />
                      <path
                        d="M969.695 1721.8H837.295V1704.6C849.029 1704.6 857.429 1703.67 862.495 1701.8C867.829 1699.67 871.162 1695.8 872.495 1690.2C873.829 1684.33 874.495 1675.67 874.495 1664.2V1517.4C874.495 1506.73 873.695 1498.47 872.095 1492.6C870.762 1486.73 867.429 1482.6 862.095 1480.2C857.029 1477.53 848.762 1476.2 837.295 1476.2V1459H971.295V1476.2C959.562 1476.2 951.029 1477.53 945.695 1480.2C940.362 1482.6 937.029 1486.87 935.695 1493C934.629 1498.87 934.095 1507 934.095 1517.4V1664.2C934.095 1675.4 934.629 1683.93 935.695 1689.8C937.029 1695.67 940.229 1699.67 945.295 1701.8C950.362 1703.67 958.495 1704.6 969.695 1704.6V1721.8Z"
                        fill="url(#gradient2)"
                      />
                      <path
                        d="M1185.4 1721.8H1048.2V1704.6C1059.94 1704.6 1068.47 1703.8 1073.8 1702.2C1079.4 1700.33 1083 1696.47 1084.6 1690.6C1086.47 1684.73 1087.4 1675.8 1087.4 1663.8V1481.4H1069.4C1054.74 1481.4 1043.67 1483.13 1036.2 1486.6C1029 1490.07 1023.8 1495.93 1020.6 1504.2C1017.4 1512.47 1014.34 1523.8 1011.4 1538.2H991.405L995.805 1459H1239.4L1243 1538.2H1223C1220.07 1523.8 1216.87 1512.47 1213.4 1504.2C1210.2 1495.93 1205 1490.07 1197.8 1486.6C1190.6 1483.13 1179.54 1481.4 1164.6 1481.4H1147V1663.8C1147 1675.8 1147.8 1684.73 1149.4 1690.6C1151.27 1696.47 1154.87 1700.33 1160.2 1702.2C1165.8 1703.8 1174.2 1704.6 1185.4 1704.6V1721.8Z"
                        fill="url(#gradient2)"
                      />
                      <defs>
                        <linearGradient
                          id="gradient1"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#60A5FA" />
                          <stop offset="50%" stopColor="#A855F7" />
                          <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                        <linearGradient
                          id="gradient2"
                          x1="0%"
                          y1="0%"
                          x2="100%"
                          y2="100%"
                        >
                          <stop offset="0%" stopColor="#60A5FA" />
                          <stop offset="50%" stopColor="#A855F7" />
                          <stop offset="100%" stopColor="#EC4899" />
                        </linearGradient>
                      </defs>
                    </svg>
                  </div>
                  <span
                    className="text-white text-3xl animate-bounce"
                    style={{ animationDelay: "0.4s" }}
                  >
                    ♠️
                  </span>
                  <span
                    className="text-white text-3xl animate-bounce"
                    style={{ animationDelay: "0.6s" }}
                  >
                    ♣️
                  </span>
                </div>
                <div className="mt-2 text-center">
                  <span className="text-transparent bg-gradient-to-r from-blue-300 to-purple-300 bg-clip-text text-lg font-semibold tracking-wider">
                    Jeu de Cartes
                  </span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-gray-300 text-sm max-w-md mx-auto leading-relaxed">
            {`Stratégie et chance se rencontrent dans ce jeu de cartes rapide. Défiez l'IA
            ou affrontez de vrais joueurs en ligne !`}
          </p>

          {/* Decorative card suits */}
          <div className="flex justify-center space-x-8 mt-4 opacity-30">
            <span className="text-red-500 text-xl">♦️</span>
            <span className="text-red-500 text-xl">♥️</span>
            <span className="text-white text-xl">♠️</span>
            <span className="text-white text-xl">♣️</span>
          </div>
        </div>

        {/* Présentation améliorée et lisible */}
        <section className="mt-8 mb-10 rounded-3xl border border-slate-700/50 bg-gradient-to-br from-slate-900/80 to-slate-800/80 backdrop-blur-sm shadow-2xl overflow-hidden">
          {/* Header avec icône */}
          <div className="bg-gradient-to-r from-blue-600/20 to-purple-600/20 border-b border-slate-700/50 px-8 py-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-700/50 rounded-xl flex items-center justify-center">
                <span className="text-2xl">🎯</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-100">
                  Découvrez UNIT
                </h2>
                <p className="text-slate-400">
                  Un jeu de cartes stratégique explosif
                </p>
              </div>
            </div>
          </div>

          {/* Contenu principal */}
          <div className="p-8">
            <div className="space-y-6 text-slate-200 max-w-4xl">
              {/* Points clés avec icônes */}
              <div className="flex items-start gap-4">
                <span className="text-blue-400 text-xl mt-1">🎮</span>
                <p className="text-base leading-7 flex-1">
                  {t("home.presentation.line1")}
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-emerald-400 text-xl mt-1">🃏</span>
                <p className="text-base leading-7 flex-1">
                  {t("home.presentation.line2")}
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-amber-400 text-xl mt-1">⚡</span>
                <p className="text-base leading-7 flex-1">
                  {t("home.presentation.line3")}
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-red-400 text-xl mt-1">🎯</span>
                <p className="text-base leading-7 flex-1">
                  {t("home.presentation.line4")}
                </p>
              </div>

              <div className="flex items-start gap-4">
                <span className="text-purple-400 text-xl mt-1">🧠</span>
                <p className="text-base leading-7 flex-1">
                  {t("home.presentation.line5")}
                </p>
              </div>

              {/* Call to action highlight */}
              <div className="mt-8 p-6 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-700/30 rounded-2xl">
                <div className="flex items-start gap-4">
                  <span className="text-blue-300 text-xl mt-1">🚀</span>
                  <p className="text-blue-100 text-lg font-semibold leading-7 flex-1">
                    {t("home.presentation.line6")}
                  </p>
                </div>
              </div>
            </div>

            {/* Bouton d'action amélioré */}
            <div className="mt-8 flex justify-center">
              <button
                onClick={() => setShowRules(true)}
                className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-200 border border-blue-400/50"
              >
                <span className="text-xl group-hover:animate-bounce">📖</span>
                <span className="text-lg">Ouvrir le tutoriel complet</span>
                <span className="text-sm opacity-75">→</span>
              </button>
            </div>
          </div>
        </section>

        {/* Modern Rules Modal */}
        <ModernRulesModal
          open={showRules}
          onClose={() => setShowRules(false)}
          title={tutorialTitle}
          chapters={memoizedTutorialChapters}
        />

        <div className="grid md:grid-cols-2 gap-6">
          {/* Player Profile Card */}
          <div className="bg-slate-800/80 backdrop-blur-sm border border-slate-700 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center mb-4">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <span className="text-white font-bold">👤</span>
              </div>
              <h2 className="text-xl font-bold text-white">Profil Joueur</h2>
            </div>

            {/* Player name input */}
            <div className="mb-4">
              <label className="block text-gray-300 text-sm mb-2">
                Votre Pseudo :
              </label>
              <input
                type="text"
                value={playerNickname}
                onChange={(e) => setPlayerNickname(e.target.value)}
                placeholder="Entrez votre pseudo"
                className="w-full p-3 rounded-xl bg-slate-700/50 text-white border border-slate-600 focus:border-blue-500 focus:outline-none transition-colors"
                disabled={matchmakingStatus === "waiting"}
              />
            </div>

            {/* Player Statistics */}
            <div className="bg-slate-700/30 rounded-xl p-4">
              <h3 className="text-gray-300 text-sm font-medium mb-3">
                Statistiques Joueur
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-xs">Parties Jouées</p>
                  <p className="text-white font-bold text-lg">0</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Taux de Victoire</p>
                  <p className="text-white font-bold text-lg">0%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Game Modes */}
          <div className="space-y-4">
            {/* Solo Mode */}
            <div className="bg-gradient-to-r from-gray-600 to-gray-700 rounded-2xl p-6 shadow-xl border border-gray-500/30 opacity-75">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-gray-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold">🎲</span>
                </div>
                <h2 className="text-xl font-bold text-white">Mode Solo</h2>
                <span className="ml-auto text-xs bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded-lg border border-yellow-500/30">
                  En maintenance
                </span>
              </div>
              <p className="text-gray-200 text-sm mb-4">
                {`
                Le mode solo est temporairement désactivé pour des améliorations.
                Jouez en ligne en attendant !`}
              </p>
              <button
                disabled={true}
                className="w-full py-3 bg-gray-800/50 text-gray-400 font-semibold rounded-xl transition-all duration-200 cursor-not-allowed backdrop-blur-sm border border-gray-700/30"
              >
                Temporairement indisponible
              </button>
            </div>

            {/* Online Mode */}
            <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl p-6 shadow-xl border border-purple-500/30">
              <div className="flex items-center mb-3">
                <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center mr-3">
                  <span className="text-white font-bold">🌍</span>
                </div>
                <h2 className="text-xl font-bold text-white">Mode En Ligne</h2>
              </div>
              <p className="text-purple-100 text-sm mb-4">
                {`
                Affrontez de vrais adversaires en ligne et prouvez vos compétences.
                Le matchmaking trouvera l'adversaire parfait !`}
              </p>
              <button
                onClick={handleFindMatch}
                disabled={
                  !playerNickname.trim() || matchmakingStatus === "waiting"
                }
                className="w-full py-3 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed backdrop-blur-sm border border-white/20"
              >
                Trouver une Partie En Ligne
              </button>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mt-6 backdrop-blur-sm">
            <div className="flex items-center">
              <span className="mr-2">⚠️</span>
              {error}
            </div>
          </div>
        )}

        {/* Matchmaking status */}
        {matchmakingStatus === "waiting" && (
          <MatchmakingModal onCancel={cancelMatchmaking} />
        )}

        <style>{`
          @keyframes shine {
            0% {
              transform: translateX(-100%);
            }
            100% {
              transform: translateX(100%);
            }
          }

          @keyframes glow {
            0%,
            100% {
              text-shadow:
                0 0 20px rgba(147, 51, 234, 0.5),
                0 0 40px rgba(59, 130, 246, 0.3),
                0 0 60px rgba(236, 72, 153, 0.2);
            }
            50% {
              text-shadow:
                0 0 30px rgba(147, 51, 234, 0.8),
                0 0 60px rgba(59, 130, 246, 0.5),
                0 0 90px rgba(236, 72, 153, 0.4);
            }
          }

          .gaming-title {
            animation: glow 3s ease-in-out infinite;
          }
        `}</style>
      </div>
    </div>
  );
}
