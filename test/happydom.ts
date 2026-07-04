import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();

// Polyfill matchMedia for radix select/dialog components
window.matchMedia =
  window.matchMedia ||
  (() => ({
    matches: false,
    media: "",
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }));

// jsdom/happy-dom don't implement PointerEvent — Radix Select requires it
// https://github.com/radix-ui/primitives/issues/1207
// Only mock if not already available (happy-dom's GlobalRegistrator may provide one)
if (!window.PointerEvent) {
  class MockPointerEvent extends Event {
    button: number;
    ctrlKey: boolean;
    pointerType: string;

    constructor(type: string, props: PointerEventInit) {
      super(type, props);
      this.button = props.button || 0;
      this.ctrlKey = props.ctrlKey || false;
      this.pointerType = props.pointerType || "mouse";
    }
  }
  window.PointerEvent = MockPointerEvent as typeof PointerEvent;
}

window.HTMLElement.prototype.scrollIntoView =
  window.HTMLElement.prototype.scrollIntoView || (() => {});
window.HTMLElement.prototype.releasePointerCapture =
  window.HTMLElement.prototype.releasePointerCapture || (() => {});
window.HTMLElement.prototype.hasPointerCapture =
  window.HTMLElement.prototype.hasPointerCapture || (() => false);
