import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

if (typeof window.matchMedia !== "function") {
  Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => undefined,
      removeListener: () => undefined,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}

const originalShowModal = HTMLDialogElement.prototype.showModal;

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  try {
    originalShowModal.call(this);
  } catch {
    this.setAttribute("open", "");
  }
};

if (typeof HTMLDialogElement.prototype.close !== "function") {
  HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
    this.removeAttribute("open");
  };
}
