import { expect, test } from "@playwright/test";

test("switches landing-page copy between Indonesian, English, and Chinese", async ({ page }) => {
  await page.goto("/");

  const language = page.locator(".language-switcher select");
  await expect(page.locator("html")).toHaveAttribute("translate", "no");
  await expect(page.locator('meta[name="google"]')).toHaveAttribute("content", "notranslate");
  await expect(language).toHaveValue("id");
  await expect(page.getByText("Temukan properti Anda", { exact: true })).toBeVisible();

  await language.selectOption("en");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByText("Find your property", { exact: true })).toBeVisible();

  await language.selectOption("zh");
  await expect(page.locator("html")).toHaveAttribute("lang", "zh");
  await expect(page.getByText("寻找您的房产", { exact: true })).toBeVisible();
});

test("translates hardcoded seeker results and booking copy completely", async ({ page }) => {
  const login = await page.request.post("/api/auth/login", {
    headers: { Origin: "http://localhost:3000" },
    data: {
      email: "pencari@propora.demo",
      password: "ProporaDemo123!",
      role: "pencari",
    },
  });
  expect(login.ok()).toBe(true);

  await page.goto("/");
  await page.locator(".language-switcher select").selectOption("zh");
  await expect(page.getByText("寻找您的房产", { exact: true })).toBeVisible();

  await page.goto("/pencari");
  await expect(page.getByRole("button", { name: "继续设置预算" })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("位置考量", { exact: true })).toBeVisible();
  await expect(page.locator("body")).not.toContainText("Lanjut ke anggaran");
  await expect(page.locator("body")).not.toContainText("Pertimbangan lokasi");

  await page.goto("/pencari/results");
  await expect(page.locator(".figma-property-card").first()).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("搜索区域", { exact: true })).toBeVisible();
  await expect(page.locator('.results-search input')).toHaveAttribute("placeholder", "搜索房产名称或地址");
  await expect(page.locator("body")).not.toContainText("AREA PENCARIAN");
  await expect(page.locator("body")).not.toContainText("Cari nama atau alamat properti");

  const firstChoice = page.locator(".result-compare input").first();
  if (!(await firstChoice.isChecked())) await firstChoice.check();
  await expect(page.locator(".compare-dock")).toBeVisible();
  await expect(page.locator(".compare-dock")).not.toContainText("Analisis satu properti");
  await expect(page.locator(".compare-dock")).not.toContainText("Hapus semua");

  await page.goto("/pencari/chat?listingId=13");
  await expect(page.locator(".survey-card")).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("选择看房时间", { exact: true })).toBeVisible();
  await expect(page.getByText("访客人数", { exact: true })).toBeVisible();
  await expect(page.getByText("给房东的备注", { exact: true })).toBeVisible();
  await expect(page.getByText("提交看房日程", { exact: true })).toBeVisible();
  await expect(page.getByText("pencari@propora.demo", { exact: true })).not.toBeVisible();
  await expect(page.locator("body")).toContainText("pemilik@propora.demo");
  await expect(page.locator("body")).not.toContainText(/Pilih Waktu Kunjungan|Jumlah Pengunjung|Catatan untuk Pemilik|Ajukan Jadwal Survei|Lanjutkan Booking Sewa|Belum ada pesan/);
});
