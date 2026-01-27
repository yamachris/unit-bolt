import React, { useEffect, useRef } from "react";

// Interface définissant les props optionnelles du composant
interface ECGProps {
  width?: number; // Largeur du canvas en pixels
  height?: number; // Hauteur du canvas en pixels
  color?: string; // Couleur du tracé ECG
}

// Composant ECG avec des valeurs par défaut pour les props
export const ECG: React.FC<ECGProps> = ({
  width = 120, // Largeur par défaut
  height = 24, // Hauteur par défaut
  color = "#ef4444", // Rouge par défaut
}) => {
  // Références React pour maintenir l'état entre les rendus
  const canvasRef = useRef<HTMLCanvasElement>(null); // Référence vers l'élément canvas
  const positionRef = useRef(0); // Position actuelle du tracé
  const trailRef = useRef<Array<{ x: number; y: number; opacity: number }>>([]); // Historique des points du tracé

  // Effect pour gérer l'animation du tracé ECG
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Obtention du contexte 2D pour dessiner
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    const baseY = height / 2; // Ligne de base au milieu du canvas
    const speed = 0.5; // Vitesse ralentie pour ~45 BPM (sommeil)

    // Fonction pour calculer la position Y du tracé ECG
    const getYPosition = (x: number) => {
      const cycle = x % 60; // Ajustement du cycle à 60 pixels pour plus de détails
      let y = baseY;

      // Onde P
      if (cycle < 10) {
        y = baseY - 2 * Math.sin((Math.PI * cycle) / 10);
      }
      // Complexe QRS
      else if (cycle < 20) {
        const phase = (cycle - 10) / 10;
        if (phase < 0.2) y = baseY + 1;
        else if (phase < 0.4) y = baseY - 10;
        else if (phase < 0.6) y = baseY + 2;
      }
      // Onde T
      else if (cycle < 40) {
        y = baseY + 2 * Math.sin((Math.PI * (cycle - 20)) / 20);
      }

      return y;
    };

    // Fonction d'animation principale
    const animate = () => {
      // Effacement du canvas
      ctx.clearRect(0, 0, width, height);

      // Mise à jour de la position
      positionRef.current += speed;
      if (positionRef.current > width) positionRef.current = 0;

      // Ajout du nouveau point au début du tracé
      trailRef.current.unshift({
        x: positionRef.current,
        y: getYPosition(positionRef.current),
        opacity: 1,
      });

      // Configuration du style de tracé
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      // Dessin de tous les points du tracé
      trailRef.current.forEach((point, i) => {
        if (i === 0) return;
        const prev = trailRef.current[i - 1];

        // Effet de lueur
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;

        // Calcul de l'opacité avec effet de fondu
        const fadeStart = width * 0.7;
        const opacity =
          point.x > fadeStart
            ? Math.max(0, 1 - (point.x - fadeStart) / (width * 0.3)) *
              point.opacity
            : point.opacity;

        // Dessin de la ligne
        ctx.beginPath();
        ctx.strokeStyle = `rgba(239, 68, 68, ${opacity})`;
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
      });

      // Nettoyage des points invisibles
      trailRef.current = trailRef.current
        .map((p) => ({
          ...p,
          opacity: Math.max(0, p.opacity - 0.01), // Diminution progressive de l'opacité
        }))
        .filter((p) => p.opacity > 0); // Suppression des points invisibles

      // Demande de la prochaine frame d'animation
      requestAnimationFrame(animate);
    };

    // Démarrage de l'animation
    const animationFrame = requestAnimationFrame(animate);

    // Nettoyage lors du démontage du composant
    return () => cancelAnimationFrame(animationFrame);
  }, [width, height, color]);

  // Rendu du canvas
  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      style={{ background: "transparent" }}
    />
  );
};
