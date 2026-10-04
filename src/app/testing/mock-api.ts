/** A contract-shaped answer for the mocked API. */
export type MockReply = { status?: number; body?: unknown; headers?: Record<string, string> };
export type MockCall = { method: string; path: string; query: URLSearchParams; headers: Headers; body: unknown };
export type MockHandler = (call: MockCall) => MockReply | Promise<MockReply>;

/**
 * Replaces `fetch` with a router over `/api/...` paths, so specs exercise the real typed client
 * against the contract's shapes without a server. Handlers are keyed `"METHOD /path"` where the
 * path is relative to `/api` and may use `*` for one path segment.
 */
export function mockApi(routes: Record<string, MockHandler>): {
  calls: MockCall[];
  restore: () => void;
} {
  const calls: MockCall[] = [];
  const original = globalThis.fetch;
  const patterns = Object.entries(routes).map(([key, handler]) => {
    const [method, path] = key.split(' ') as [string, string];
    const source = path.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]+');
    return { method, regex: new RegExp(`^${source}$`), handler };
  });

  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const request = input instanceof Request ? input : new Request(input, init);
    const url = new URL(request.url);
    const path = url.pathname.replace(/^\/api/, '');
    const text = request.method === 'GET' || request.method === 'DELETE' ? '' : await request.text();
    const call: MockCall = {
      method: request.method,
      path,
      query: url.searchParams,
      headers: request.headers,
      body: text ? JSON.parse(text) : undefined,
    };
    calls.push(call);

    const route = patterns.find((entry) => entry.method === request.method && entry.regex.test(path));
    if (!route) {
      return new Response(JSON.stringify({ statusCode: 404, error: 'Not Found', message: `No mock for ${request.method} ${path}` }), {
        status: 404,
        headers: { 'content-type': 'application/json' },
      });
    }

    const reply = await route.handler(call);
    const status = reply.status ?? 200;
    return new Response(status === 204 || reply.body === undefined ? null : JSON.stringify(reply.body), {
      status,
      headers: { 'content-type': 'application/json', ...reply.headers },
    });
  }) as typeof fetch;

  return {
    calls,
    restore: () => {
      globalThis.fetch = original;
    },
  };
}
