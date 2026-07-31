export type AuthRoute = "/login" | "/register";

/** Faqat shu ilova ichidagi manzillarga qaytishga ruxsat beradi. */
export function getSafeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) {
    return "/";
  }

  try {
    const url = new URL(value, window.location.origin);
    if (url.origin !== window.location.origin || url.pathname === "/login" || url.pathname === "/register") {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}

export function getAuthPath(route: AuthRoute, returnTo: string): string {
  return `${route}?returnTo=${encodeURIComponent(getSafeReturnTo(returnTo))}`;
}