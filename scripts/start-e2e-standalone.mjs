import { cp } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";

const root = process.cwd();
const standalone = resolve(root, ".next", "standalone");

await cp(resolve(root, ".next", "static"), resolve(standalone, ".next", "static"), { recursive: true });
await cp(resolve(root, "public"), resolve(standalone, "public"), { recursive: true });
process.env.PORT = "3111";
process.env.HOSTNAME = "127.0.0.1";
await import(pathToFileURL(resolve(standalone, "server.js")).href);
