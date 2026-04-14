export const PACKAGE_ID = import.meta.env.VITE_PACKAGE_ID as string;
export const REGISTRY_ID = import.meta.env.VITE_REGISTRY_ID as string;

if (!PACKAGE_ID || !REGISTRY_ID) {
  throw new Error(
    "Missing VITE_PACKAGE_ID or VITE_REGISTRY_ID – check your .env file",
  );
}

// 1 SUI in MIST
export const COMMIT_FEE = 1_000_000_000;
export const REVEAL_FEE = 1_000_000_000;

// Reveal window: 2 minutes (ms)
export const REVEAL_WINDOW_MS = 120_000;
