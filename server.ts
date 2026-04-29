import { startHttpServer } from "./src/server/app";
import { loadRuntimeEnv } from "./src/server/load-env";

loadRuntimeEnv();
void startHttpServer();
