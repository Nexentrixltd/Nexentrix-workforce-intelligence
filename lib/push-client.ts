const PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

export type PushState =
  | "not-configured"
  | "needs-install"
  | "unsupported"
  | "denied"
  | "off"
  | "on";

export function pushSupported() {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

function isIos() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

function isStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const output = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

async function api<T = unknown>(url: string, method: string, body?: unknown) {
  const res = await fetch(url, {
    method,
    credentials: "same-origin",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : `Request failed (${res.status})`,
    );
  }
  return data as T;
}

async function getRegistration() {
  const registration = await navigator.serviceWorker.register("/sw.js", {
    scope: "/",
  });

  await navigator.serviceWorker.ready;

  if (registration.active?.scriptURL) {
    const activeUrl = new URL(registration.active.scriptURL);

    if (activeUrl.pathname !== "/sw.js") {
      throw new Error(
        "The custom Nexentrix push service worker is not active yet.",
      );
    }
  }

  return registration;
}

async function saveSubscription(subscription: PushSubscription) {
  const json = subscription.toJSON();
  await api("/api/push/subscribe", "POST", {
    endpoint: json.endpoint,
    keys: json.keys,
  });
}

export async function getPushState(): Promise<PushState> {
  if (typeof window === "undefined") return "unsupported";
  if (!PUBLIC_KEY) {
    console.warn("Push is disabled: NEXT_PUBLIC_VAPID_PUBLIC_KEY is not set.");
    return "not-configured";
  }
  if (isIos() && !isStandalone()) return "needs-install";
  if (!pushSupported()) return "unsupported";
  if (Notification.permission === "denied") return "denied";

  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;
  return subscription && Notification.permission === "granted" ? "on" : "off";
}

export async function enablePush() {
  if (!PUBLIC_KEY)
    throw new Error("Push notifications are not available right now.");
  if (!pushSupported())
    throw new Error("This browser does not support push notifications.");

  const permission = await Notification.requestPermission();
  if (permission !== "granted")
    throw new Error("Your browser did not allow notifications.");

  const registration = await getRegistration();
  const options = {
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(PUBLIC_KEY),
  };

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    try {
      subscription = await registration.pushManager.subscribe(options);
    } catch {
      await (await registration.pushManager.getSubscription())?.unsubscribe();
      subscription = await registration.pushManager.subscribe(options);
    }
  }

  await saveSubscription(subscription);
}

export async function disablePush() {
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;
  if (!subscription) return;

  await api("/api/push/subscribe", "DELETE", {
    endpoint: subscription.endpoint,
  }).catch(() => null);
  await subscription.unsubscribe();
}

export async function syncPushSubscription() {
  if (!pushSupported() || Notification.permission !== "granted") return;
  const registration = await navigator.serviceWorker.getRegistration("/");
  const subscription = registration
    ? await registration.pushManager.getSubscription()
    : null;
  if (subscription) await saveSubscription(subscription);
}

export async function sendTestPush() {
  await api("/api/push/test", "POST");
}
