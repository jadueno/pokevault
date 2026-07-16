import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PhotoField } from "./PhotoField";

vi.mock("../data/imageCapture", () => ({
  compressImage: vi.fn().mockResolvedValue("data:image/jpeg;base64,AAAA"),
}));

describe("PhotoField", () => {
  it("sin foto, muestra 'Añadir foto' y no hay miniatura clicable", () => {
    render(<PhotoField photo={null} onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Añadir foto" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver foto en grande" })).not.toBeInTheDocument();
  });

  it("con foto, subir un archivo llama a onChange con la data URL comprimida", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoField photo={null} onChange={onChange} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = new File(["foto"], "carta.jpg", { type: "image/jpeg" });
    await user.upload(input, file);

    expect(onChange).toHaveBeenCalledWith("data:image/jpeg;base64,AAAA");
  });

  it("quitar foto llama a onChange con null", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<PhotoField photo="data:image/jpeg;base64,AAAA" onChange={onChange} />);

    await user.click(screen.getByRole("button", { name: "Quitar foto" }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("clic en la miniatura abre la foto en grande, y se puede cerrar", async () => {
    const user = userEvent.setup();
    render(<PhotoField photo="data:image/jpeg;base64,AAAA" onChange={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Ver foto en grande" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("clic en la foto ampliada alterna el zoom", async () => {
    const user = userEvent.setup();
    render(<PhotoField photo="data:image/jpeg;base64,AAAA" onChange={vi.fn()} />);
    await user.click(screen.getByRole("button", { name: "Ver foto en grande" }));

    const zoomedImg = within(screen.getByRole("dialog")).getByRole("img");
    expect(zoomedImg.className).toContain("cursor-zoom-in");

    await user.click(zoomedImg);
    expect(zoomedImg.className).toContain("cursor-zoom-out");
  });
});
