import { describe, expect, it } from "vitest";
import {
  demoCopilot,
  extractDemoRequirements,
  matchingProperties,
  upgradeDemo,
} from "./inbox";
import { demoData } from "./demo";
import { workspaceSchema } from "./domain";
const example =
  "Merhaba, Çanakkale merkezde 3 milyon TL bütçeyle 2+1 satılık daire arıyorum. Asansörlü olsun, ara kat tercih ederim.";
describe("Inbox extraction and saved catalogue", () => {
  it("extracts the founder's Turkish property enquiry", () => {
    expect(extractDemoRequirements(example)).toEqual({
      intent: "buy_property",
      city: "Çanakkale",
      district: "Merkez",
      budget_max: 3000000,
      currency: "TRY",
      rooms: "2+1",
      property_type: "apartment",
      listing_type: "sale",
      elevator_required: true,
      floor_preference: "middle_floor",
    });
  });
  it("does not ask for already supplied requirements", () => {
    const result = demoCopilot(example, "tr");
    expect(result.missing_information).toEqual([
      "Taşınma veya satın alma takvimi",
    ]);
    expect(result.reply).not.toContain("Bütçe");
    expect(result.reply).not.toContain("Konum");
    expect(result.reply).not.toContain("3 milyon TL'ye ilanımız");
  });
  it("only matches active saved listings that meet ALL known constraints", () => {
    const data = upgradeDemo(structuredClone(demoData));
    const r = extractDemoRequirements(example);
    expect(matchingProperties(r, data.properties).map((p) => p.id)).toEqual([
      data.properties[0].id,
    ]);
    expect(
      matchingProperties({ ...r, budget_max: 2000000 }, data.properties),
    ).toHaveLength(0);
    expect(
      matchingProperties(
        r,
        data.properties.map((p) => ({ ...p, active: false })),
      ),
    ).toHaveLength(0);
    expect(
      matchingProperties({ ...r, currency: "USD" }, data.properties),
    ).toHaveLength(0);
    expect(
      matchingProperties({ ...r, city: null }, data.properties),
    ).toHaveLength(0);
  });
  it("upgrades old sessions without changing CRM records or tasks", () => {
    const old = structuredClone(demoData);
    old.leads[0].notes = "User's preserved note";
    const upgraded = upgradeDemo(workspaceSchema.parse(old));
    expect(upgraded.leads).toEqual(old.leads);
    expect(upgraded.tasks).toEqual(old.tasks);
    expect(upgraded.conversations).toHaveLength(old.leads.length);
    expect(upgradeDemo(upgraded)).toEqual(upgraded);
  });
  it("respects later explicit preferences and does not re-ask a supplied timeline", () => {
    const result = demoCopilot(
      example +
        "\nBütçemi 4 milyon TL olarak güncelliyorum. Gelecek ay taşınacağım.",
      "tr",
    );
    expect(result.requirements.budget_max).toBe(4000000);
    expect(result.requirements.rooms).toBe("2+1");
    expect(result.missing_information).not.toContain(
      "Taşınma veya satın alma takvimi",
    );
  });
  it("keeps unknown requirements null and refuses invented matches", () => {
    const result = demoCopilot("Merhaba, yardımcı olur musunuz?", "tr");
    expect(result.requirements.budget_max).toBeNull();
    expect(result.requirements.city).toBeNull();
    expect(result.requirements.property_type).toBeNull();
    expect(
      matchingProperties(result.requirements, upgradeDemo(demoData).properties),
    ).toHaveLength(0);
  });
});
