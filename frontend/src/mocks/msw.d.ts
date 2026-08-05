export {};

declare global {
  interface Window {
    __MSW_MOCKING__?: boolean;
  }
}
