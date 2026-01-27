// Get development token on startup
export async function getDevToken() {
  const response = await fetch("/api/dev/token", {
    method: "POST",
  });
  const { token } = await response.json();
  localStorage.setItem("gameToken", token);
  return token;
}
