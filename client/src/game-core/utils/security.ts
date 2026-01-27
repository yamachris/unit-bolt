// Expressions régulières pour la validation
const NAME_REGEX = /^[\p{L}\p{N}\s]{1,30}$/u;
const EPITHET_REGEX = /^[\p{L}\p{N}\s]{1,50}$/u;

export function sanitizeInput(input: string): string {
  if (!input) return "";

  // Supprime les caractères de contrôle et les caractères spéciaux dangereux
  // eslint-disable-next-line no-control-regex
  let sanitized = input.replace(/[\x00-\x1F\x7F-\x9F<>&"'`]/g, "");

  // Normalise les espaces
  sanitized = sanitized.replace(/\s+/g, " ").trim();

  return sanitized;
}

export function validateName(name: string): boolean {
  const sanitizedName = sanitizeInput(name);
  return (
    NAME_REGEX.test(sanitizedName) &&
    sanitizedName.length >= 1 &&
    sanitizedName.length <= 30
  );
}

export function validateEpithet(epithet: string): boolean {
  const sanitizedEpithet = sanitizeInput(epithet);
  return (
    EPITHET_REGEX.test(sanitizedEpithet) &&
    sanitizedEpithet.length >= 1 &&
    sanitizedEpithet.length <= 50
  );
}

export function validateAvatar(dataUrl: string | undefined): boolean {
  if (!dataUrl) return true; // Permet un avatar vide/undefined

  // Vérifie si c'est une image en base64 valide
  if (!dataUrl.startsWith("data:image/")) {
    return false;
  }

  // Liste des types MIME autorisés
  const validImageTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
  ];
  const [header] = dataUrl.split(",");

  // Vérifie le type MIME
  if (!validImageTypes.some((type) => header.includes(type))) {
    return false;
  }

  // Vérifie la taille maximale (5MB)
  const base64 = dataUrl.split(",")[1];
  if (!base64) return false;

  try {
    const decodedSize = atob(base64).length;
    if (decodedSize > 5 * 1024 * 1024) {
      return false;
    }
  } catch {
    return false;
  }

  return true;
}

export function validateProfileUpdate(
  name: string,
  epithet: string,
  avatar?: string,
): { isValid: boolean; error?: string } {
  const sanitizedName = sanitizeInput(name);
  const sanitizedEpithet = sanitizeInput(epithet);

  if (!validateName(sanitizedName)) {
    return {
      isValid: false,
      error: "Le nom doit contenir entre 1 et 30 caractères valides",
    };
  }

  if (!validateEpithet(sanitizedEpithet)) {
    return {
      isValid: false,
      error: "Le titre doit contenir entre 1 et 50 caractères valides",
    };
  }

  if (!validateAvatar(avatar)) {
    return {
      isValid: false,
      error: "L'image n'est pas valide ou dépasse 5MB",
    };
  }

  return { isValid: true };
}
