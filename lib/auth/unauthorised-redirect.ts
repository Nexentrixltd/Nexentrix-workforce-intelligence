let installed = false;

function requestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.href;
  return input.url;
}

export function installUnauthorizedRedirect() {
  if (typeof window === "undefined" || installed) return;
  installed = true;

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input, init) => {
    const response = await originalFetch(input, init);

    if (response.status === 401) {
      const url = new URL(requestUrl(input), window.location.origin);
      const isOurApi =
        url.origin === window.location.origin &&
        url.pathname.startsWith("/api/") &&
        !url.pathname.startsWith("/api/auth/");
      const alreadyOnLogin = window.location.pathname.startsWith("/auth");

      if (isOurApi && !alreadyOnLogin) {
        const here = window.location.pathname + window.location.search;
        window.location.assign(`/auth?next=${encodeURIComponent(here)}`);
      }
    }

    return response;
  };
}