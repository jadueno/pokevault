import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import App from "./App";
import { clearStoredToken } from "./data/auth";

const { getAuthConfig, login } = vi.hoisted(() => ({
  getAuthConfig: vi.fn(),
  login: vi.fn(),
}));

vi.mock("./data/api", () => ({
  getAuthConfig,
  login,
  logout: vi.fn(),
  searchCards: vi.fn().mockResolvedValue([]),
}));

// Datos vacíos y sin fetches reales para las 5 fuentes de datos de la app — este test
// solo verifica la puerta de login delante de todo lo demás, no el contenido de cada
// pantalla (ya cubierto por sus propios tests).
vi.mock("./data/useCollectionData", () => ({
  useCollectionData: () => ({
    items: [],
    summary: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    addItem: vi.fn(),
    addItems: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    removeItems: vi.fn(),
    overrideValue: vi.fn(),
  }),
}));
vi.mock("./data/useWishlistData", () => ({
  useWishlistData: () => ({
    items: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    moveToCollection: vi.fn(),
  }),
}));
vi.mock("./data/useSealedData", () => ({
  useSealedData: () => ({
    items: [],
    loading: false,
    error: null,
    reload: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    overrideValue: vi.fn(),
  }),
}));
vi.mock("./data/usePlanData", () => ({
  usePlanData: () => ({
    items: [],
    settings: null,
    loading: false,
    error: null,
    reload: vi.fn(),
    addItem: vi.fn(),
    updateItem: vi.fn(),
    removeItem: vi.fn(),
    toggleDone: vi.fn(),
    updateSettings: vi.fn(),
  }),
}));
vi.mock("./data/useSetChecklistData", () => ({
  useSetChecklistData: () => ({
    checklists: [],
    cardsByChecklist: {},
    loading: false,
    error: null,
    reload: vi.fn(),
    search: vi.fn().mockResolvedValue([]),
    sync: vi.fn(),
    createBinder: vi.fn(),
    resync: vi.fn(),
  }),
}));

describe("App — puerta de login", () => {
  beforeEach(() => {
    clearStoredToken();
    vi.clearAllMocks();
  });

  it("si el backend no exige login, se salta el login y se ve la app directamente", async () => {
    getAuthConfig.mockResolvedValue({ loginRequired: false });
    render(<App />);

    expect(await screen.findByRole("button", { name: "+ Set" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Entrar" })).not.toBeInTheDocument();
  });

  it("si el backend exige login y no hay sesión guardada, muestra la pantalla de login", async () => {
    getAuthConfig.mockResolvedValue({ loginRequired: true });
    render(<App />);

    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Set" })).not.toBeInTheDocument();
  });

  it("iniciar sesión correctamente da paso a la app", async () => {
    const user = userEvent.setup();
    getAuthConfig.mockResolvedValue({ loginRequired: true });
    login.mockResolvedValue(undefined);
    render(<App />);

    await user.type(await screen.findByLabelText("Usuario"), "jadueno");
    await user.type(screen.getByLabelText("Contraseña"), "correcta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(login).toHaveBeenCalledWith("jadueno", "correcta");
    expect(await screen.findByRole("button", { name: "+ Set" })).toBeInTheDocument();
  });

  it("con contraseña incorrecta, muestra el error y no entra", async () => {
    const user = userEvent.setup();
    getAuthConfig.mockResolvedValue({ loginRequired: true });
    login.mockRejectedValue(new Error("Usuario o contraseña incorrectos"));
    render(<App />);

    await user.type(await screen.findByLabelText("Usuario"), "jadueno");
    await user.type(screen.getByLabelText("Contraseña"), "mal");
    await user.click(screen.getByRole("button", { name: "Entrar" }));

    expect(await screen.findByText("Usuario o contraseña incorrectos")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "+ Set" })).not.toBeInTheDocument();
  });

  it("el botón de cerrar sesión vuelve a mostrar el login", async () => {
    const user = userEvent.setup();
    getAuthConfig.mockResolvedValue({ loginRequired: true });
    login.mockResolvedValue(undefined);
    render(<App />);

    await user.type(await screen.findByLabelText("Usuario"), "jadueno");
    await user.type(screen.getByLabelText("Contraseña"), "correcta");
    await user.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByRole("button", { name: "+ Set" })).toBeInTheDocument();

    // Hay dos botones de "Cerrar sesión" en el DOM (barra lateral de escritorio + barra
    // inferior de móvil, ambas siempre presentes — la que se ve según el tamaño de
    // pantalla la decide el CSS, que estos tests no aplican): cualquiera de los dos cierra
    // la sesión igual.
    const [logoutButton] = screen.getAllByRole("button", { name: "Cerrar sesión" });
    await user.click(logoutButton);
    expect(await screen.findByRole("button", { name: "Entrar" })).toBeInTheDocument();
  });
});
