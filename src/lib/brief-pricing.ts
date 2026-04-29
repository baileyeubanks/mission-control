import type { IntakeData, Zip2Estimate } from "@/server/creative-brief-store";

export function generateDeterministicEstimate(intake: IntakeData): Zip2Estimate {
  let baseHours = 40;
  let baseRate = 150;
  let complexityMultiplier = 1.0;

  if (intake.expectedShootDays === "1 day") {
    baseHours += 30;
    complexityMultiplier += 0.2;
  } else if (intake.expectedShootDays === "2 days") {
    baseHours += 70;
    complexityMultiplier += 0.4;
  } else if (intake.expectedShootDays === "3+ days") {
    baseHours += 120;
    complexityMultiplier += 0.6;
  }

  if (intake.motionGraphicsLevel === "Moderate graphics") {
    baseHours += 20;
  } else if (intake.motionGraphicsLevel === "Heavy graphics" || intake.motionGraphicsLevel === "Full animation") {
    baseHours += 60;
    complexityMultiplier += 0.3;
  }

  const deliverablesStr = (intake.deliverables || []).join(" ");
  if (deliverablesStr.includes("Multiple") || deliverablesStr.includes("cutdowns")) {
    baseHours += 30;
    complexityMultiplier += 0.1;
  }

  const rawCost = baseHours * baseRate * complexityMultiplier;
  const round500 = (num: number) => Math.round(num / 500) * 500;

  const leanCost = round500(rawCost * 0.7);
  const recommendedCost = round500(rawCost);
  const premiumCost = round500(rawCost * 1.5);

  const formatPrice = (p: number) => `$${p.toLocaleString()}`;

  return {
    lean: {
      name: "Lean",
      range: `${formatPrice(leanCost - 1000)}–${formatPrice(leanCost + 1000)}`,
      includes: [
        "Core project strategy",
        "Minimal required production",
        "1 main deliverable",
        "1 round of revisions",
      ],
      bestFor: "Validating the concept or internal use.",
      timeline: "2-4 weeks",
    },
    recommended: {
      name: "Recommended",
      range: `${formatPrice(recommendedCost - 2000)}–${formatPrice(recommendedCost + 2000)}`,
      includes: [
        "Full project strategy & scripting",
        "Optimal production schedule",
        "Main deliverable + core cutdowns",
        "Motion graphics polish",
        "2 rounds of revisions",
      ],
      bestFor: "Most professional business use cases.",
      timeline: "4-6 weeks",
    },
    premium: {
      name: "Premium",
      range: `${formatPrice(premiumCost - 4000)}–${formatPrice(premiumCost + 4000)}`,
      includes: [
        "Extensive pre-production & creative direction",
        "Premium crew & cinema-grade equipment",
        "Full campaign asset package across all channels",
        "Advanced motion graphics/animation",
        "Unlimited revisions during post window",
      ],
      bestFor: "High-stakes campaigns and executive brand films.",
      timeline: "6-8+ weeks",
    },
    estimateConfidence: "Medium",
    assumptions: [
      "Travel and hard expenses billed at cost",
      "Subject to final script and scope approval",
    ],
  };
}
