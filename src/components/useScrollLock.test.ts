import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useScrollLock } from "./useScrollLock";

describe("useScrollLock", () => {
  it("bloquea el scroll de html y body mientras está montado, y lo restaura al desmontar", () => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    const { unmount } = renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe("hidden");
    expect(document.documentElement.style.overflow).toBe("hidden");

    unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });

  it("con dos instancias anidadas, solo desbloquea cuando se desmonta la última", () => {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
    const outer = renderHook(() => useScrollLock());
    const inner = renderHook(() => useScrollLock());

    expect(document.body.style.overflow).toBe("hidden");

    inner.unmount();
    expect(document.body.style.overflow).toBe("hidden"); // el modal exterior lo sigue necesitando

    outer.unmount();
    expect(document.body.style.overflow).toBe("");
    expect(document.documentElement.style.overflow).toBe("");
  });
});
