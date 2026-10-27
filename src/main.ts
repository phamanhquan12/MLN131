import "./ui/styles.css";
import { mount } from "./ui/view";
import type { ViewOptions } from "./ui/view";
const options: ViewOptions = {
  store: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
  },
  now: () => Date.now(),
  seed: () => crypto.getRandomValues(new Uint32Array(1))[0],
  roundId: () => crypto.randomUUID(),
  confirm: (message) => window.confirm(message),
  notify: () => {
    const sound = new Audio(new URL("./ui/signal.wav", import.meta.url).href);
    void sound.play().catch(() => {});
  },
  download: (raw) => {
    const url = URL.createObjectURL(
      new Blob([raw], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "mln131-du-lieu-buoi.json";
    link.click();
    URL.revokeObjectURL(url);
  },
};
if (import.meta.env.MODE === "e2e") {
  const { fixtureBoard } = await import("./testing/fixture");
  options.boardFactory = fixtureBoard;
  options.seed = () => 42;
}
export const application = mount(
  document.querySelector<HTMLElement>("#app")!,
  options,
);
