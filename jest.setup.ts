import "@testing-library/jest-dom";

// Supabase browser client (used by AuthProvider/PortfolioProvider) needs these
// at construction time. Dummy values are fine: tests don't hit the network.
process.env.NEXT_PUBLIC_SUPABASE_URL ??= "https://test.supabase.co";
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??= "test-anon-key";

// Components use the App Router hooks, which aren't mounted under jsdom.
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// next-themes reads matchMedia for system theme detection.
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}

// jsdom lacks SubtleCrypto and TextEncoder (used by the Bybit request signer).
if (!globalThis.crypto?.subtle) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { webcrypto } = require("node:crypto") as typeof import("node:crypto");
  Object.defineProperty(globalThis.crypto, "subtle", {
    value: webcrypto.subtle,
  });
}
if (!globalThis.TextEncoder) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const util = require("node:util") as typeof import("node:util");
  Object.assign(globalThis, {
    TextEncoder: util.TextEncoder,
    TextDecoder: util.TextDecoder,
  });
}

// recharts' ResponsiveContainer depends on ResizeObserver.
if (!global.ResizeObserver) {
  global.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}
