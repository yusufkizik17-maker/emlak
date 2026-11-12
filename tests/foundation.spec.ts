import { expect, test } from "@playwright/test";
test("landing theme and responsive layout", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Her müşteri talebi",
  );
  await page
    .getByRole("combobox", { name: "Tema", exact: true })
    .selectOption("dark");
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page
    .getByRole("combobox", { name: "Tema", exact: true })
    .selectOption("light");
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("combobox", { name: "Dil" }).selectOption("en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Every enquiry",
  );
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Every enquiry",
  );
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toContainText(
    "Welcome back",
  );
});
test("demo CRM, task and AI approval flow", async ({ page }) => {
  await page.goto("/leads");
  await page.getByRole("button", { name: "Müşteri ekle", exact: true }).click();
  await page.getByLabel("Ad soyad", { exact: true }).fill("Test Müşteri");
  await page.getByLabel("E-posta", { exact: true }).fill("test@example.com");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Test Müşteri", exact: true }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Test Müşteri", exact: true }).click();
  await page.getByRole("button", { name: "Düzenle", exact: true }).click();
  await page.getByLabel("Konum", { exact: true }).fill("İstanbul");
  await page.getByRole("button", { name: "Kaydet", exact: true }).click();
  await expect(page.getByText("İstanbul", { exact: true })).toBeVisible();
  await page
    .getByRole("link", { name: "AI Asistan", exact: true })
    .last()
    .click();
  await expect(page).toHaveURL(/\/inbox\?lead=/);
  // Keep validating the preserved legacy analysis flow alongside the new Inbox tests.
  await page.goto("/ai-assistant");
  await page
    .getByLabel("Müşteri mesajı", { exact: true })
    .fill("Kadıköy'de ev arıyorum, yardımcı olur musunuz?");
  await page.getByRole("button", { name: "Mesajı analiz et" }).click();
  await page
    .getByLabel("Düzenlenebilir yanıt taslağı")
    .fill(
      "Merhaba, tercihleriniz hakkında daha fazla bilgi paylaşabilir misiniz?",
    );
  await page.getByRole("button", { name: "Taslağı onayla" }).click();
  await expect(page.getByText("Onaylandı · Mesaj gönderilmedi")).toBeVisible();
  await page.goto("/tasks");
  const task = page.getByRole("checkbox", { name: /Müşterinin bütçe/ });
  await expect(task).toBeVisible();
  await task.click();
  await expect(task).toHaveCount(0);
  await page.getByRole("button", { name: "Tamamlandı", exact: true }).click();
  await expect(
    page.getByRole("checkbox", { name: /Müşterinin bütçe/ }),
  ).toBeChecked();
  await page.goto("/leads");
  await page
    .getByRole("textbox", { name: "Müşteriler: Müşteri ara…", exact: true })
    .fill("Test Müşteri");
  await expect(page.locator("tbody tr")).toHaveCount(1);
});

test("workspace navigation, preferences and route layouts", async ({
  page,
}, info) => {
  const failures: string[] = [];
  page.on("pageerror", (e) => failures.push(e.message));
  await page.goto("/dashboard");
  await expect(
    page.getByText("Bugün gelen mesajlar", { exact: true }),
  ).toBeVisible();
  await page.screenshot({
    path: info.outputPath("dashboard.png"),
    fullPage: true,
  });
  if (info.project.name === "mobile") {
    const menu = page.getByRole("button", { name: "Menüyü aç" });
    await menu.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(menu).toBeFocused();
    await menu.click();
    await page.getByRole("link", { name: "Ayarlar", exact: true }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  } else await page.getByRole("link", { name: "Ayarlar", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Profil", exact: true }),
  ).toBeVisible();
  await page.getByLabel("Ad soyad", { exact: true }).fill("Demo Tester");
  await page
    .getByRole("button", { name: "Kaydet", exact: true })
    .first()
    .click();
  await expect(page.getByText("Kaydedildi", { exact: true })).toBeVisible();
  await page
    .getByRole("combobox", { name: "Dil", exact: true })
    .first()
    .selectOption("en");
  await expect(
    page.getByRole("heading", { level: 1, name: "Settings", exact: true }),
  ).toBeVisible();
  for (const route of [
    "/inbox",
    "/properties",
    "/analytics",
    "/dashboard",
    "/leads",
    "/tasks",
    "/ai-assistant",
    "/settings",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ]) {
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      route,
    ).toBe(true);
  }
  expect(failures).toEqual([]);
});

test("demo mode keeps authentication local and blocks remote persistence", async ({
  page,
  request,
}) => {
  await page.goto("/login");
  await expect(page.getByText(/Demo modunda hesap oluşturulmaz/)).toBeVisible();
  await expect(page.getByRole("textbox")).toHaveCount(0);
  await page.getByRole("link", { name: "Demoya devam et" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Inbox");
  expect((await request.get("/api/workspace")).status()).toBe(409);
  expect(
    (await request.post("/api/auth", { data: { action: "logout" } })).status(),
  ).toBe(409);
});
