import { describe, test, expect } from "bun:test";
import { screen } from "@testing-library/react";
import { Wallet } from "lucide-react";
import { StatsCard } from "../z-StatsCard";
import { render } from "~/lib/render";

describe("StatsCard", () => {
  test("renders label, value, and description", () => {
    render(
      <StatsCard
        label="Pendapatan Hari Ini"
        value="Rp 150.000"
        description="+5% dari kemarin"
        icon={Wallet}
        color="text-green-500"
      />,
    );
    expect(screen.getByText("Pendapatan Hari Ini")).toBeInTheDocument();
    expect(screen.getByText("Rp 150.000")).toBeInTheDocument();
    expect(screen.getByText("+5% dari kemarin")).toBeInTheDocument();
  });

  test("renders empty description without error", () => {
    render(
      <StatsCard
        label="Total"
        value="0"
        description=""
        icon={Wallet}
      />,
    );
    expect(screen.getByText("Total")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  test("applies custom className", () => {
    const { container } = render(
      <StatsCard
        label="Test"
        value="X"
        description=""
        icon={Wallet}
        className="custom-class"
      />,
    );
    expect(container.querySelector(".custom-class")).toBeInTheDocument();
  });
});
