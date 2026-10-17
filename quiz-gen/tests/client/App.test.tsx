import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { App } from "../../src/App";

describe("App", () => {
  it("shows host and player entry points on the landing screen", () => {
    render(
      <MemoryRouter initialEntries={["/"]}>
        <App />
      </MemoryRouter>,
    );

    expect(screen.getByText(/host a lobby/i)).toBeInTheDocument();
    expect(screen.getByText(/join a lobby/i)).toBeInTheDocument();
  });
});
