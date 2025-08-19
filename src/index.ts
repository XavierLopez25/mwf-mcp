import "dotenv/config";
import { runStdioServer } from "./server.js";


runStdioServer().catch((err) => {
    console.error("Failed to start MCP server:", err);
    process.exit(1);
});