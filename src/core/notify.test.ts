import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  isPermissionGranted: vi.fn<() => Promise<boolean>>(),
  requestPermission: vi.fn<() => Promise<NotificationPermission>>(),
  sendNotification: vi.fn(),
  settings: { notifications: false },
}));

vi.mock("@/core/runtime", () => ({ isTauri: mocks.isTauri }));
vi.mock("@/core/settings", () => ({
  useSettings: { getState: () => mocks.settings },
}));
vi.mock("@tauri-apps/plugin-notification", () => ({
  isPermissionGranted: mocks.isPermissionGranted,
  requestPermission: mocks.requestPermission,
  sendNotification: mocks.sendNotification,
}));

import {
  ensureNotificationPermission,
  getNotificationPermission,
  notify,
  notifyWhenAppHidden,
} from "@/core/notify";

function setWindowPermission(permission: NotificationPermission) {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { Notification: { permission } },
  });
}

function setVisibility(visibilityState: DocumentVisibilityState) {
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: { visibilityState },
  });
}

describe("notifications locales", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isTauri.mockReturnValue(true);
    mocks.settings.notifications = false;
    mocks.isPermissionGranted.mockResolvedValue(false);
    mocks.requestPermission.mockResolvedValue("denied");
    setWindowPermission("default");
    setVisibility("hidden");
  });

  it("reste un no-op tant que l'opt-in est désactivé", async () => {
    await expect(notify("Test")).resolves.toBe("disabled");
    expect(mocks.isPermissionGranted).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("envoie quand l'opt-in et la permission OS sont actifs", async () => {
    mocks.settings.notifications = true;
    mocks.isPermissionGranted.mockResolvedValue(true);

    await expect(notify("Scan terminé", "3 résultats")).resolves.toBe("sent");
    expect(mocks.sendNotification).toHaveBeenCalledWith({
      title: "Scan terminé",
      body: "3 résultats",
    });
  });

  it("ne redemande jamais une permission pendant un envoi", async () => {
    mocks.settings.notifications = true;

    await expect(notify("Test")).resolves.toBe("permission-denied");
    expect(mocks.requestPermission).not.toHaveBeenCalled();
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });

  it("demande la permission uniquement via l'action explicite", async () => {
    mocks.requestPermission.mockResolvedValue("granted");

    await expect(ensureNotificationPermission()).resolves.toBe(true);
    expect(mocks.requestPermission).toHaveBeenCalledOnce();
  });

  it("lit l'état réel exposé par le système", async () => {
    setWindowPermission("denied");
    await expect(getNotificationPermission()).resolves.toBe("denied");
    expect(mocks.isPermissionGranted).not.toHaveBeenCalled();
  });

  it("évite de doubler le résultat quand l'app est visible", async () => {
    mocks.settings.notifications = true;
    mocks.isPermissionGranted.mockResolvedValue(true);
    setVisibility("visible");

    await expect(notifyWhenAppHidden("Terminé")).resolves.toBe("suppressed");
    expect(mocks.sendNotification).not.toHaveBeenCalled();
  });
});
