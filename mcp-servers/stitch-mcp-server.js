#!/usr/bin/env node

/**
 * Local Stitch MCP server authenticated via a GCP service-account key instead
 * of the gcloud CLI. Published stitch-mcp packages (stitch-mcp,
 * @_davideast/stitch-mcp) shell out to `gcloud auth application-default
 * print-access-token`, which ignores GOOGLE_APPLICATION_CREDENTIALS and
 * requires gcloud CLI + interactive user login. google-auth-library mints
 * the same OAuth2 bearer token straight from the service-account JSON.
 */

const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { ListToolsRequestSchema, CallToolRequestSchema } = require("@modelcontextprotocol/sdk/types.js");
const { GoogleAuth } = require("google-auth-library");
const path = require("path");

if (process.env.HTTPS_PROXY || process.env.https_proxy) {
  const { ProxyAgent, setGlobalDispatcher } = require("undici");
  setGlobalDispatcher(new ProxyAgent(process.env.HTTPS_PROXY || process.env.https_proxy));
}

const STITCH_URL = "https://stitch.googleapis.com/mcp";
const TIMEOUT_MS = 180000;

const log = {
  info: (msg) => console.error(`[stitch-mcp] ℹ️  ${msg}`),
  success: (msg) => console.error(`[stitch-mcp] ✅ ${msg}`),
  error: (msg) => console.error(`[stitch-mcp] ❌ ${msg}`),
};

const keyFile = path.isAbsolute(process.env.GOOGLE_APPLICATION_CREDENTIALS || "")
  ? process.env.GOOGLE_APPLICATION_CREDENTIALS
  : path.join(__dirname, "..", process.env.GOOGLE_APPLICATION_CREDENTIALS || "service-account.json");

const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!projectId) {
  log.error("GOOGLE_CLOUD_PROJECT env var not set");
  process.exit(1);
}

const auth = new GoogleAuth({
  keyFile,
  scopes: ["https://www.googleapis.com/auth/cloud-platform"],
});

async function getAccessToken() {
  const client = await auth.getClient();
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("Failed to obtain access token from service account");
  return token;
}

function sanitizeSchema(obj) {
  if (!obj || typeof obj !== "object") return obj;
  if (Array.isArray(obj)) return obj.map(sanitizeSchema);
  const cleaned = {};
  for (const key of Object.keys(obj)) {
    if (key.startsWith("x-")) continue;
    cleaned[key] = sanitizeSchema(obj[key]);
  }
  return cleaned;
}

async function callStitchAPI(method, params) {
  const token = await getAccessToken();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(STITCH_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "X-Goog-User-Project": projectId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ jsonrpc: "2.0", method, params, id: Date.now() }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`HTTP ${response.status}: ${text}`);
    }
    return await response.json();
  } finally {
    clearTimeout(timeout);
  }
}

async function main() {
  log.info("Starting Stitch MCP server (service-account auth)");
  log.info(`Project: ${projectId}, key: ${keyFile}`);

  await getAccessToken();
  log.success("Auth verified");

  const server = new Server({ name: "stitch", version: "1.0.0" }, { capabilities: { tools: {} } });

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    try {
      const result = await callStitchAPI("tools/list", {});
      const rawTools = result.result ? result.result.tools : [];
      const tools = rawTools.map((tool) => ({
        ...tool,
        inputSchema: tool.inputSchema ? sanitizeSchema(tool.inputSchema) : tool.inputSchema,
      }));
      return { tools };
    } catch (error) {
      log.error(`Tools list failed: ${error.message}`);
      return { tools: [] };
    }
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await callStitchAPI("tools/call", { name, arguments: args || {} });

      if (result.result) {
        if (result.result.content && Array.isArray(result.result.content)) {
          return result.result;
        }
        return { content: [{ type: "text", text: JSON.stringify(result.result, null, 2) }] };
      }
      if (result.error) {
        return { content: [{ type: "text", text: `API Error: ${result.error.message}` }], isError: true };
      }
      return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    } catch (error) {
      log.error(`Tool ${name} failed: ${error.message}`);
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
  });

  server.onerror = (err) => log.error(`Server error: ${err}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  log.success("Server ready and listening on stdio");
}

main().catch((error) => {
  log.error(`Fatal startup error: ${error.message}`);
  process.exit(1);
});
