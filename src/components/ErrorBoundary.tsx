import { Component, type ReactNode } from "react";
import { Button } from "./Button";

interface Props {
  children: ReactNode;
}

interface State {
  error: Error | null;
}

/**
 * Red de seguridad para toda la app: sin esto, un error inesperado al renderizar deja
 * la pantalla en blanco sin ningún mensaje ni forma de recuperarse salvo recargar a ciegas.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }): void {
    console.error("Error no controlado en la interfaz:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
          <h1 className="text-2xl font-extrabold text-[var(--text-primary)]">Algo ha ido mal</h1>
          <p className="max-w-sm text-sm text-[var(--text-secondary)]">
            Ha ocurrido un error inesperado al mostrar esta pantalla. Tus datos están a salvo en la base de
            datos; recargar suele arreglarlo.
          </p>
          <Button tone="ink" onClick={() => window.location.reload()}>
            Recargar
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
