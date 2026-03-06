export interface Env {
  CF_ACCOUNT_ID: string;
  GATEWAY_NAME: string;
  AUTH_TOKEN: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const authHeader = request.headers.get('Authorization') || request.headers.get('x-api-key');
    const bearerToken = `Bearer ${env.AUTH_TOKEN}`;

    if (!authHeader || (authHeader !== bearerToken && authHeader !== env.AUTH_TOKEN)) {
      return new Response('Unauthorized', { status: 401 });
    }

    if (!env.CF_ACCOUNT_ID) {
      return new Response('Missing CF_ACCOUNT_ID', { status: 500 });
    }

    let targetProvider = '';
    let targetPath = '';

    if (url.pathname.startsWith('/anthropic/')) {
      targetProvider = 'anthropic';
      targetPath = url.pathname.replace('/anthropic', '');
    } else if (url.pathname.startsWith('/vertex/')) {
      targetProvider = 'google-vertex-ai';
      targetPath = url.pathname.replace('/vertex', '');
    } else if (url.pathname.startsWith('/google-vertex-ai/')) {
      targetProvider = 'google-vertex-ai';
      targetPath = url.pathname.replace('/google-vertex-ai', '');
    } else {
      return new Response('Not Found', { status: 404 });
    }

    const gatewayUrl = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.GATEWAY_NAME}/${targetProvider}${targetPath}${url.search}`;

    const headers = new Headers(request.headers);
    // Optional: strip the incoming auth so it doesn't get rejected by upstream if it's not the provider's token
    // headers.delete('Authorization');

    const newRequest = new Request(gatewayUrl, {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow',
    });

    return fetch(newRequest);
  },
};