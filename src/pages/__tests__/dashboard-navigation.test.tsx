// @vitest-environment jsdom

import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const getMissionControlBootstrapMock = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mission-control-client", () => ({
  getMissionControlBootstrap: getMissionControlBootstrapMock,
}));

import { Dashboard } from "../Dashboard";

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="current route">{location.pathname}{location.search}</output>;
}

function renderDashboard(initialRoute = "/admin") {
  render(
    <MemoryRouter initialEntries={[initialRoute]}>
      <Dashboard />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("Dashboard navigation", () => {
  afterEach(() => {
    cleanup();
  });

  beforeEach(() => {
    getMissionControlBootstrapMock.mockReset();
    getMissionControlBootstrapMock.mockResolvedValue({
      accounts: [
        {
          id: "astro-cleaning-services",
          label: "Astro Cleaning Services",
          shortLabel: "ACS",
          domain: "astrocleanings.com",
          status: "canonical-account",
          sourceOfTruth: "acs",
          moduleIds: ["acs-ops"],
          purpose: "ACS ops",
        },
        {
          id: "content-co-op",
          label: "Content Co-op",
          shortLabel: "CCO",
          domain: "contentco-op.com",
          status: "canonical-account",
          sourceOfTruth: "cco",
          moduleIds: ["co-produce", "co-deliver"],
          purpose: "CCO ops",
        },
      ],
      modules: [
        {
          id: "acs-ops",
          accountId: "astro-cleaning-services",
          label: "ACS Operations",
          category: "operations",
          status: "extracting",
          authority: "business-model-donor",
          launchPath: "/admin?account=astro-cleaning-services",
          runtimeId: "acs-module-demo",
          description: "ACS module",
          dependencies: [],
        },
        {
          id: "co-produce",
          accountId: "content-co-op",
          label: "Co-Produce",
          category: "intelligence",
          status: "extracting",
          authority: "module-demo-donor",
          launchPath: "/admin/files",
          runtimeId: "co-produce",
          description: "Production module",
          dependencies: [],
        },
        {
          id: "co-deliver",
          accountId: "content-co-op",
          label: "Co-Deliver",
          category: "delivery",
          status: "external-authority",
          authority: "specialized-app-authority",
          launchPath: "/admin/approvals",
          runtimeId: "co-deliver",
          description: "Delivery module",
          dependencies: [],
        },
        {
          id: "runtime-fleet",
          accountId: null,
          label: "Runtime Fleet",
          category: "system",
          status: "active",
          authority: "canonical-shell",
          launchPath: "/admin/runtime",
          runtimeId: "mission-control-shell",
          description: "Runtime module",
          dependencies: [],
        },
      ],
      tasks: [],
      approvals: [],
      events: [],
      runtimes: [],
      services: {
        supabase: "missing_config",
        gemini: "missing_config",
        hermes: "optional",
      },
    });
  });

  it("toggles company scope and keeps the selected account in the URL", async () => {
    const user = userEvent.setup();
    renderDashboard();

    expect(await screen.findByText("ACS Operations")).toBeTruthy();
    expect(screen.queryByText("Co-Produce")).toBeNull();

    await user.click(screen.getByRole("button", { name: "CCO" }));

    expect(await screen.findByText("Co-Produce")).toBeTruthy();
    expect(screen.getByLabelText("current route").textContent).toBe("/admin?account=content-co-op");
  });

  it("honors an account query parameter on first render", async () => {
    renderDashboard("/admin?account=content-co-op");

    expect(await screen.findByText("Co-Produce")).toBeTruthy();
    expect(screen.queryByText("ACS Operations")).toBeNull();
  });

  it("launches modules through router navigation", async () => {
    const user = userEvent.setup();
    renderDashboard("/admin?account=content-co-op");

    await screen.findByText("Co-Deliver");
    await user.click(screen.getByTitle("Open Co-Deliver"));

    await waitFor(() => {
      expect(screen.getByLabelText("current route").textContent).toBe("/admin/approvals");
    });
  });
});
