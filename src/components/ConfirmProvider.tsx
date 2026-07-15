import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react";
import { Button } from "./Button";

type ConfirmFn = (message: string) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext);
  if (!confirm) throw new Error("useConfirm debe usarse dentro de <ConfirmProvider>");
  return confirm;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [message, setMessage] = useState<string | null>(null);
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const confirm = useCallback<ConfirmFn>((msg) => {
    setMessage(msg);
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
    });
  }, []);

  function close(result: boolean) {
    resolveRef.current?.(result);
    resolveRef.current = null;
    setMessage(null);
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {message && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-message"
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-black/50 p-4 backdrop-blur-sm"
          style={{ overscrollBehavior: "contain" }}
          onKeyDown={(e) => e.key === "Escape" && close(false)}
        >
          <div className="w-full max-w-sm rounded-[1.75rem] border border-[var(--border)] bg-[var(--surface-1)] p-6 shadow-float">
            <p id="confirm-dialog-message" className="text-sm text-[var(--text-primary)]">
              {message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" autoFocus onClick={() => close(false)}>
                Cancelar
              </Button>
              <Button tone="critical" onClick={() => close(true)}>
                Eliminar
              </Button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}
