import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:5174",
    browserName: "chromium",
    channel: "chrome",
    viewport: { width: 1440, height: 1000 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "PYTHONPATH=. ../venv/bin/python tests/serve_history_fixture.py",
      cwd: "../Back",
      url: "http://127.0.0.1:5001/api/health",
      reuseExistingServer: false,
    },
    {
      command: "npm run dev -- --host 127.0.0.1 --port 5174 --strictPort",
      env: { VITE_API_BASE_URL: "http://127.0.0.1:5001/api" },
      url: "http://127.0.0.1:5174",
      reuseExistingServer: false,
    },
  ],
});
