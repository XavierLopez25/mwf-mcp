import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { toolDefs, handlerMap } from "./tools/index.js";


export async function runStdioServer() {
    const server = new Server({ name: "mcp-warframe-market", version: "0.1.0" }, { capabilities: { tools: {} } });


    server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: toolDefs }));


    server.setRequestHandler(CallToolRequestSchema, async (req) => {
        const { name, arguments: args } = req.params;
        if (!name || typeof name !== "string") throw new Error("Invalid tool call: missing name");
        const handler = handlerMap[name];
        if (!handler) throw new Error(`Unknown tool: ${name}`);
        const result = await handler(args);
        return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
    });


    const transport = new StdioServerTransport();
    await server.connect(transport);
}