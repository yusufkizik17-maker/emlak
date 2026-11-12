import { test, expect } from "@playwright/test";
test("Inbox, contextual Copilot, catalogue and human approval", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/inbox");
  await page.getByRole("option", { name: /Elif Demir/ }).click();
  await expect(
    page.getByRole("heading", { name: "Elif Demir", exact: true }),
  ).toBeVisible();
  if (info.project.name !== "desktop")
    await page
      .getByRole("button", { name: "AI Copilot panelini aç/kapat" })
      .click();
  await page
    .getByRole("button", { name: /Konuşmayı analiz et|Analizi yenile/ })
    .click();
  await expect(
    page.getByText("Konut satın alma", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Merkez'de asansörlü 2+1 daire")).toBeVisible();
  await expect(
    page.getByText("Taşınma veya satın alma takvimi", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("inbox-copilot-light.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "Taslağı düzenlemeye al", exact: true })
    .click();
  const draft = page.getByRole("textbox", {
    name: "Yanıt taslağı",
    exact: true,
  });
  await expect(draft).not.toHaveValue("");
  const approve = page.getByRole("button", {
    name: "Onayla ve kaydet",
    exact: true,
  });
  await expect(approve).toBeDisabled();
  await draft.fill(
    "Merhaba, tercihlerinizi not aldım. Ne zaman taşınmayı planlıyorsunuz?",
  );
  await page
    .getByRole("checkbox", { name: "Taslağı inceledim", exact: true })
    .check();
  await approve.click();
  await expect(
    page.getByText("Onaylandı · Gönderilmedi", { exact: true }),
  ).toBeVisible();
  await expect(draft).toHaveValue("");
  if (info.project.name === "mobile") {
    await page.getByRole("button", { name: "Konuşmalara dön" }).click();
    await expect(
      page.getByRole("option", { name: /Elif Demir/ }),
    ).toBeVisible();
  }
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  expect(errors).toEqual([]);
});
test("persisted light/dark/system themes and sidebar", async ({
  page,
}, info) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/settings");
  const theme = page
    .getByRole("combobox", { name: "Tema", exact: true })
    .last();
  await theme.selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await theme.selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await theme.selectOption("system");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveClass(/dark/);
  if (info.project.name !== "mobile") {
    await page
      .getByRole("button", { name: "Menüyü daralt", exact: true })
      .click();
    await expect(
      page.getByRole("button", { name: "Menüyü genişlet", exact: true }),
    ).toBeVisible();
    await page.reload();
    await expect(
      page.getByRole("button", { name: "Menüyü genişlet", exact: true }),
    ).toBeVisible();
  }
  await page.goto("/inbox");
  await expect(
    page.getByRole("heading", { name: "Inbox", exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("inbox-dark.png"),
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("conversation search, keyboard selection and assignment", async ({
  page,
}, info) => {
  await page.goto("/inbox");
  const search = page.getByRole("textbox", {
    name: "Konuşma ara",
    exact: true,
  });
  await search.fill("Mert");
  await expect(
    page
      .getByRole("listbox", { name: "Müşteri konuşmaları" })
      .getByRole("option"),
  ).toHaveCount(1);
  await page.getByRole("option", { name: /Mert Kaya/ }).click();
  await page
    .getByRole("combobox", { name: "Danışmana ata", exact: true })
    .selectOption("00000000-0000-4000-8000-000000000099");
  await expect(
    page.getByRole("combobox", { name: "Danışmana ata", exact: true }),
  ).toHaveValue("00000000-0000-4000-8000-000000000099");
  await page.reload();
  if (info.project.name === "mobile")
    await page.getByRole("option", { name: /Mert Kaya/ }).click();
  else await page.getByRole("option", { name: /Mert Kaya/ }).click();
  await expect(
    page.getByRole("combobox", { name: "Danışmana ata", exact: true }),
  ).toHaveValue("00000000-0000-4000-8000-000000000099");
  if (info.project.name === "mobile")
    await page.getByRole("button", { name: "Konuşmalara dön" }).click();
  const first = page
    .getByRole("listbox", { name: "Müşteri konuşmaları" })
    .getByRole("option")
    .first();
  await first.focus();
  await page.keyboard.press("ArrowDown");
  await expect(
    page
      .getByRole("listbox", { name: "Müşteri konuşmaları" })
      .getByRole("option")
      .nth(1),
  ).toBeFocused();
});

test("saved property creation and deactivation persist", async ({ page }) => {
  await page.goto("/properties");
  await page.getByRole("button", { name: "İlan ekle", exact: true }).click();
  await page
    .getByLabel("İlan başlığı", { exact: true })
    .fill("Test Çanakkale Dairesi");
  await page.getByLabel("Şehir", { exact: true }).fill("Çanakkale");
  await page.getByLabel("İlçe", { exact: true }).fill("Merkez");
  await page.getByLabel("Fiyat", { exact: true }).fill("2900000");
  await page.getByLabel("Oda sayısı", { exact: true }).fill("2+1");
  await page.getByLabel("Asansör mevcut", { exact: true }).check();
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  const card = page.getByRole("article").filter({
    has: page.getByRole("heading", {
      name: "Test Çanakkale Dairesi",
      exact: true,
    }),
  });
  await expect(card).toBeVisible();
  await page.reload();
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Pasife al", exact: true }).click();
  await expect(card.getByText("Pasif", { exact: true })).toBeVisible();
});

test("customer add and edit stay inside Inbox", async ({ page }) => {
  await page.goto("/inbox");
  await page.getByRole("button", { name: "Müşteri ekle", exact: true }).click();
  await page
    .getByLabel("Ad soyad", { exact: true })
    .fill("Yeni Inbox Müşterisi");
  await page
    .getByLabel("Notlar", { exact: true })
    .fill("Korunması gereken müşteri notu");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page).toHaveURL(/\/inbox$/);
  await page.getByRole("option", { name: /Yeni Inbox Müşterisi/ }).click();
  await page
    .getByRole("button", { name: "Yeni Inbox Müşterisi", exact: true })
    .click();
  await expect(
    page.getByRole("textbox", { name: "Notlar", exact: true }),
  ).toHaveValue("Korunması gereken müşteri notu");
  await page
    .getByLabel("Ad soyad", { exact: true })
    .fill("Güncellenen Inbox Müşterisi");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByRole("heading", {
      name: "Güncellenen Inbox Müşterisi",
      exact: true,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/inbox$/);
});
