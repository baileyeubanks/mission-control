import { describe, expect, it } from "vitest";
import { PACKET_REGISTRY } from "../packet-registry";

describe("PACKET_REGISTRY", () => {
  it("validates and normalizes intake extraction packets", () => {
    const definition = PACKET_REGISTRY.intake_extract;
    const validation = definition.validateInput({ text: "Jane needs a deep clean at 123 Main St.", channel: "sms" });

    expect(validation.ok).toBe(true);
    expect(
      definition.normalizeOutput({
        name: "Jane Doe",
        businessScope: "Astro Cleanings",
        projectScope: "Deep clean for kitchen and bathrooms",
        suggestedItems: [{ description: "Deep clean", rate: 240 }],
      }),
    ).toEqual({
      name: "Jane Doe",
      email: undefined,
      phone: undefined,
      address: undefined,
      projectScope: "Deep clean for kitchen and bathrooms",
      businessScope: "Astro Cleanings",
      suggestedItems: [{ description: "Deep clean", rate: 240 }],
    });
  });

  it("validates and normalizes draft job updates", () => {
    const definition = PACKET_REGISTRY.draft_job_update;
    const validation = definition.validateInput({ jobDetails: { id: "job-1", state: "scheduled" }, notes: "Crew arriving soon." });

    expect(validation.ok).toBe(true);
    expect(definition.normalizeOutput("Crew is on track for the scheduled arrival window.")).toEqual({
      text: "Crew is on track for the scheduled arrival window.",
    });
  });

  it("validates and normalizes schedule optimization packets", () => {
    const definition = PACKET_REGISTRY.schedule_optimize;
    const validation = definition.validateInput({
      jobs: [{ id: "job-1", title: "Move-out clean" }],
      crews: [{ id: "crew-1", name: "North Team" }],
    });

    expect(validation.ok).toBe(true);
    expect(
      definition.normalizeOutput({
        assignments: [{ crewId: "crew-1", jobIds: ["job-1"], reasoning: "Closest crew with capacity." }],
      }),
    ).toEqual({
      assignments: [{ crewId: "crew-1", jobIds: ["job-1"], reasoning: "Closest crew with capacity." }],
    });
  });

  it("validates and normalizes thread summaries", () => {
    const definition = PACKET_REGISTRY.thread_summarize;
    const validation = definition.validateInput({
      messages: [{ sender: "Customer", content: "Can you move my booking to Friday?" }],
    });

    expect(validation.ok).toBe(true);
    expect(definition.normalizeOutput("Customer wants to move the booking to Friday.")).toEqual({
      summary: "Customer wants to move the booking to Friday.",
    });
  });

  it("validates and normalizes thread reply drafts", () => {
    const definition = PACKET_REGISTRY.thread_reply_draft;
    const validation = definition.validateInput({
      messages: [{ sender: "Customer", content: "Do you have availability tomorrow?" }],
      tone: "Professional",
    });

    expect(validation.ok).toBe(true);
    expect(definition.normalizeOutput("We do have a few openings tomorrow afternoon.")).toEqual({
      text: "We do have a few openings tomorrow afternoon.",
    });
  });
});
