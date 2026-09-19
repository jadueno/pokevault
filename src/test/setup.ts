import { cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import "@testing-library/jest-dom/vitest";

afterEach(() => {
  cleanup();
});

// jsdom no implementa scrollIntoView (usado al abrir la edición de una página de compra
// en Plan, para que el formulario quede a la vista aunque esté fuera del viewport).
if (typeof Element.prototype.scrollIntoView === "undefined") {
  Element.prototype.scrollIntoView = () => {};
}
