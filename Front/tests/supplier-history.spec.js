import { test, expect } from "@playwright/test";

async function signIn(page, role = "admin") {
  const id = role === "supplier" ? 3 : role === "employee" ? 2 : 1;
  await page.addInitScript(({ role, id }) => {
    localStorage.setItem("fx_auth_token", `test-${id}`);
    localStorage.setItem("fx_auth_user", JSON.stringify({ id, role, email: `user${id}@example.test` }));
  }, { role, id });
}

test("staff can search the grid, open a supplier and filter the history", async ({ page }) => {
  await signIn(page);
  await page.goto("/supplier-history");
  await expect(page.getByRole("heading", { name: "Histórico de fornecedores", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Fornecedor 1", exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/fx-supplier-history-list.png" });
  await page.getByRole("searchbox", { name: "Buscar fornecedor" }).fill("Fornecedor 1");
  await expect(page.getByRole("link", { name: "Fornecedor 2", exact: true })).toHaveCount(0);
  await page.getByRole("link", { name: "Fornecedor 1", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Fornecedor 1", exact: true })).toBeVisible();
  await expect(page.getByText("R$ 1.050,30", { exact: true }).first()).toBeVisible();
  await page.getByLabel("Data de início").fill("2026-11-04");
  await page.getByLabel("Data de fim").fill("2026-11-04");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByText("R$ 900,30", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("R$ 200,00", { exact: true }).first()).toBeVisible();
  await expect(page.getByRole("button", { name: /Compra #3/ })).toHaveCount(0);
  await page.getByRole("button", { name: /Compra #1/ }).click();
  await expect(page.getByText("Ferro", { exact: true }).first()).toBeVisible();
  const popup = page.waitForEvent("popup");
  await page.getByRole("button", { name: "comprovante-teste.txt", exact: true }).click();
  const receipt = await popup;
  await expect(receipt).toHaveURL(/^blob:/);
  await expect(receipt.locator("body")).toContainText("Comprovante de teste");
  await receipt.close();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await page.getByLabel("Tipo de movimentação").selectOption("advance");
  await page.getByLabel("Situação dos adiantamentos").selectOption("pendente");
  await expect(page.getByLabel("Tipo de movimentação")).toHaveValue("advance");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page).toHaveURL(/type=advance/);
  await expect(page.getByRole("button", { name: /Adiantamento #1/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Compra #/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Adiantamento #2/ })).toHaveCount(0);
  await page.reload();
  await expect(page.getByLabel("Tipo de movimentação")).toHaveValue("advance");
  await page.getByRole("link", { name: "Voltar aos fornecedores" }).click();
  await expect(page.getByRole("searchbox", { name: "Buscar fornecedor" })).toHaveValue("Fornecedor 1");
});

test("clear filters resets unapplied changes and validation on an unfiltered URL", async ({ page }) => {
  await signIn(page);
  await page.goto("/supplier-history/1");
  await expect(page.getByRole("heading", { name: "Fornecedor 1", exact: true })).toBeVisible();
  await page.getByLabel("Data de início").fill("2026-11-05");
  await page.getByLabel("Data de fim").fill("2026-11-04");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Limpar filtros" }).click();
  await expect(page.getByLabel("Data de início")).toHaveValue("");
  await expect(page.getByLabel("Data de fim")).toHaveValue("");
  await expect(page.getByRole("alert")).toHaveCount(0);
});

test("each sale and advance has a point with its own hover details", async ({ page }) => {
  await signIn(page);
  await page.goto("/supplier-history/1");
  const chart = page.getByRole("region", { name: "Vendas do fornecedor", exact: true });
  await expect(chart).toBeVisible();
  const plot = chart.getByRole("group", { name: "Gráfico de vendas" });
  await expect(plot.locator("circle[data-record-id]")).toHaveCount(3);
  await plot.locator('circle[data-record-id="1"]').hover();
  await expect(chart.getByRole("tooltip")).toContainText("Venda #1");
  await expect(chart.getByRole("tooltip")).toContainText("300,10");
  await expect(chart.getByRole("tooltip")).toContainText("3,00/kg");
  await plot.locator('circle[data-record-id="2"]').hover();
  await expect(chart.getByRole("tooltip")).toContainText("Venda #2");
  await expect(chart.getByRole("tooltip")).toContainText("600,20");
  await plot.focus();
  await page.keyboard.press("Home");
  await expect(chart.getByRole("tooltip")).toContainText("Venda #1");
  await page.keyboard.press("End");
  await expect(chart.getByRole("tooltip")).toContainText("150,00");
  await chart.getByText("Ver valores do gráfico", { exact: true }).click();
  await expect(chart.getByRole("table")).toContainText("300,10");
  const advances = page.getByRole("region", { name: "Adiantamentos registrados", exact: true });
  await expect(advances.locator("circle[data-record-id]")).toHaveCount(2);
  await advances.locator('circle[data-record-id="1"]').hover();
  await expect(advances.getByRole("tooltip")).toContainText("Adiantamento #1");
  await expect(advances.getByRole("tooltip")).toContainText("1.000,00");
  await expect(advances.getByRole("tooltip")).not.toContainText("/kg");
  const position = await chart.boundingBox();
  const advancePosition = await advances.boundingBox();
  expect(Math.abs(position.y - advancePosition.y)).toBeLessThan(2);
  await page.setViewportSize({ width: 390, height: 844 });
  await chart.screenshot({ path: "/tmp/fx-sales-line-mobile.png", animations: "disabled" });
  expect(await plot.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
});

test("employee can read an empty supplier and invalid periods stay actionable", async ({ page }) => {
  await signIn(page, "employee");
  await page.goto("/supplier-history/3");
  await expect(page.getByText("Nenhuma movimentação encontrada.")).toBeVisible();
  await page.getByLabel("Data de início").fill("2026-11-05");
  await page.getByLabel("Data de fim").fill("2026-11-04");
  await page.getByRole("button", { name: "Aplicar filtros" }).click();
  await expect(page.getByRole("alert")).toContainText("A data inicial não pode ser posterior");
});

test("suppliers and visitors cannot open the internal module", async ({ page }) => {
  await page.goto("/supplier-history/1");
  await expect(page).toHaveURL("http://127.0.0.1:5174/");
  await signIn(page, "supplier");
  await page.goto("/supplier-history/1");
  await expect(page).toHaveURL(/\/supplier-portal$/);
  await expect(page.getByRole("heading", { name: "Histórico de fornecedores", exact: true })).toHaveCount(0);
});

test("mobile layout fits the viewport and keyboard can open supplier details", async ({ page }) => {
  await signIn(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/supplier-history");
  const link = page.getByRole("link", { name: "Fornecedor 1", exact: true });
  await link.focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Fornecedor 1", exact: true })).toBeVisible();
  const widths = await page.evaluate(() => ({ viewport: innerWidth, content: document.documentElement.scrollWidth }));
  expect(widths.content).toBeLessThanOrEqual(widths.viewport);
  await page.screenshot({ path: "/tmp/fx-supplier-history-mobile.png", fullPage: true });
  await page.getByRole("heading", { name: "Histórico de movimentações", exact: true }).scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/fx-supplier-history-mobile-movements.png" });
  await page.goto("/supplier-history/2");
  await expect(page.getByRole("heading", { name: /^Fornecedor 2/ })).toBeVisible();
  const mainWidths = await page.locator("main").evaluate(element => ({ visible: element.clientWidth, content: element.scrollWidth }));
  expect(mainWidths.content).toBeLessThanOrEqual(mainWidths.visible);
});

test("failed requests show a retry action and stale data is not presented", async ({ page }) => {
  await signIn(page);
  await page.route("**/api/suppliers/1/history*", route => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ message: "Serviço indisponível" }) }));
  await page.goto("/supplier-history/1");
  await expect(page.getByRole("alert")).toContainText("Serviço indisponível");
  await page.unroute("**/api/suppliers/1/history*");
  await page.getByRole("button", { name: "Tentar novamente" }).click();
  await expect(page.getByRole("heading", { name: "Fornecedor 1", exact: true })).toBeVisible();
  await page.screenshot({ path: "/tmp/fx-supplier-history-desktop.png", fullPage: true });
});
