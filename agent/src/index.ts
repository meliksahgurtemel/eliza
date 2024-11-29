import { PostgresDatabaseAdapter } from "@ai16z/adapter-postgres";
import { SqliteDatabaseAdapter } from "@ai16z/adapter-sqlite";
import { AutoClientInterface } from "@ai16z/client-auto";
import { DirectClientInterface } from "@ai16z/client-direct";
import { DiscordClientInterface } from "@ai16z/client-discord";
import { TelegramClientInterface } from "@ai16z/client-telegram";
import { TwitterClientInterface } from "@ai16z/client-twitter";
import {
    AgentRuntime,
    CacheManager,
    Character,
    DbCacheAdapter,
    FsCacheAdapter,
    IAgentRuntime,
    ICacheManager,
    IDatabaseAdapter,
    IDatabaseCacheAdapter,
    ModelProviderName,
    defaultCharacter,
    elizaLogger,
    settings,
    stringToUuid,
    validateCharacterConfig,
} from "@ai16z/eliza";
import { zgPlugin } from "@ai16z/plugin-0g";
import { bootstrapPlugin } from "@ai16z/plugin-bootstrap";
// import { buttplugPlugin } from "@ai16z/plugin-buttplug";
import {
    coinbaseCommercePlugin,
    coinbaseMassPaymentsPlugin,
    tradePlugin,
} from "@ai16z/plugin-coinbase";
import { confluxPlugin } from "@ai16z/plugin-conflux";
import { imageGenerationPlugin } from "@ai16z/plugin-image-generation";
import { evmPlugin } from "@ai16z/plugin-evm";
import { createNodePlugin } from "@ai16z/plugin-node";
import { solanaPlugin } from "@ai16z/plugin-solana";

import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import readline from "readline";
import { fileURLToPath } from "url";
import yargs from "yargs";

const __filename = fileURLToPath(import.meta.url); // get the resolved path to the file
const __dirname = path.dirname(__filename); // get the name of the directory

export const wait = (minTime: number = 1000, maxTime: number = 3000) => {
    const waitTime =
        Math.floor(Math.random() * (maxTime - minTime + 1)) + minTime;
    return new Promise((resolve) => setTimeout(resolve, waitTime));
};

export function parseArguments(): {
    character?: string;
    characters?: string;
} {
    try {
        return yargs(process.argv.slice(3))
            .option("character", {
                type: "string",
                description: "Path to the character JSON file",
            })
            .option("characters", {
                type: "string",
                description:
                    "Comma separated list of paths to character JSON files",
            })
            .parseSync();
    } catch (error) {
        elizaLogger.error("Error parsing arguments:", error);
        return {};
    }
}

function tryLoadFile(filePath: string): string | null {
    try {
        return fs.readFileSync(filePath, "utf8");
    } catch (e) {
        return null;
    }
}

export async function loadCharacters(
    charactersArg: string
): Promise<Character[]> {
    let characterPaths = charactersArg
        ?.split(",")
        .map((filePath) => filePath.trim());
    const loadedCharacters = [];

    if (characterPaths?.length > 0) {
        for (const characterPath of characterPaths) {
            let content = null;
            let resolvedPath = "";

            // Try different path resolutions in order
            const pathsToTry = [
                characterPath, // exact path as specified
                path.resolve(process.cwd(), characterPath), // relative to cwd
                path.resolve(__dirname, characterPath), // relative to current script
                path.resolve(
                    __dirname,
                    "../characters",
                    path.basename(characterPath)
                ), // relative to characters dir from agent
                path.resolve(
                    __dirname,
                    "../../characters",
                    path.basename(characterPath)
                ), // relative to project root characters dir
            ];

            for (const tryPath of pathsToTry) {
                content = tryLoadFile(tryPath);
                if (content !== null) {
                    resolvedPath = tryPath;
                    break;
                }
            }

            if (content === null) {
                elizaLogger.error(
                    `Error loading character from ${characterPath}: File not found in any of the expected locations`
                );
                elizaLogger.error("Tried the following paths:");
                pathsToTry.forEach((p) => elizaLogger.error(` - ${p}`));
                process.exit(1);
            }

            try {
                const character = JSON.parse(content);
                validateCharacterConfig(character);

                // Handle plugins
                if (character.plugins) {
                    elizaLogger.info("Plugins are: ", character.plugins);
                    const importedPlugins = await Promise.all(
                        character.plugins.map(async (plugin) => {
                            const importedPlugin = await import(plugin);
                            return importedPlugin;
                        })
                    );
                    character.plugins = importedPlugins;
                }

                loadedCharacters.push(character);
                elizaLogger.info(
                    `Successfully loaded character from: ${resolvedPath}`
                );
            } catch (e) {
                elizaLogger.error(
                    `Error parsing character from ${resolvedPath}: ${e}`
                );
                process.exit(1);
            }
        }
    }

    if (loadedCharacters.length === 0) {
        elizaLogger.info("No characters found, using default character");
        loadedCharacters.push(defaultCharacter);
    }

    return loadedCharacters;
}

export function getTokenForProvider(
    provider: ModelProviderName,
    character: Character
) {
    switch (provider) {
        case ModelProviderName.OPENAI:
            return (
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.ETERNALAI:
            return (
                character.settings?.secrets?.ETERNALAI_API_KEY ||
                settings.ETERNALAI_API_KEY
            );
        case ModelProviderName.LLAMACLOUD:
            return (
                character.settings?.secrets?.LLAMACLOUD_API_KEY ||
                settings.LLAMACLOUD_API_KEY ||
                character.settings?.secrets?.TOGETHER_API_KEY ||
                settings.TOGETHER_API_KEY ||
                character.settings?.secrets?.XAI_API_KEY ||
                settings.XAI_API_KEY ||
                character.settings?.secrets?.OPENAI_API_KEY ||
                settings.OPENAI_API_KEY
            );
        case ModelProviderName.ANTHROPIC:
            return (
                character.settings?.secrets?.ANTHROPIC_API_KEY ||
                character.settings?.secrets?.CLAUDE_API_KEY ||
                settings.ANTHROPIC_API_KEY ||
                settings.CLAUDE_API_KEY
            );
        case ModelProviderName.REDPILL:
            return (
                character.settings?.secrets?.REDPILL_API_KEY ||
                settings.REDPILL_API_KEY
            );
        case ModelProviderName.OPENROUTER:
            return (
                character.settings?.secrets?.OPENROUTER ||
                settings.OPENROUTER_API_KEY
            );
        case ModelProviderName.GROK:
            return (
                character.settings?.secrets?.GROK_API_KEY ||
                settings.GROK_API_KEY
            );
        case ModelProviderName.HEURIST:
            return (
                character.settings?.secrets?.HEURIST_API_KEY ||
                settings.HEURIST_API_KEY
            );
        case ModelProviderName.GROQ:
            return (
                character.settings?.secrets?.GROQ_API_KEY ||
                settings.GROQ_API_KEY
            );
        case ModelProviderName.GALADRIEL:
            return (
                character.settings?.secrets?.GALADRIEL_API_KEY ||
                settings.GALADRIEL_API_KEY
            );
        case ModelProviderName.FAL:
            return (
                character.settings?.secrets?.FAL_API_KEY ||
                settings.FAL_API_KEY
            );
    }
}

function initializeDatabase(dataDir: string) {
    if (process.env.POSTGRES_URL) {
        const db = new PostgresDatabaseAdapter({
            connectionString: process.env.POSTGRES_URL,
            parseInputs: true,
        });
        return db;
    } else {
        const filePath =
            process.env.SQLITE_FILE ?? path.resolve(dataDir, "db.sqlite");
        // ":memory:";
        const db = new SqliteDatabaseAdapter(new Database(filePath));
        return db;
    }
}

export async function initializeClients(
    character: Character,
    runtime: IAgentRuntime
) {
    const clients = [];
    const clientTypes =
        character.clients?.map((str) => str.toLowerCase()) || [];

    if (clientTypes.includes("auto")) {
        const autoClient = await AutoClientInterface.start(runtime);
        if (autoClient) clients.push(autoClient);
    }

    if (clientTypes.includes("discord")) {
        clients.push(await DiscordClientInterface.start(runtime));
    }

    if (clientTypes.includes("telegram")) {
        const telegramClient = await TelegramClientInterface.start(runtime);
        if (telegramClient) clients.push(telegramClient);
    }

    if (clientTypes.includes("twitter")) {
        const twitterClients = await TwitterClientInterface.start(runtime);
        clients.push(twitterClients);
    }

    if (character.plugins?.length > 0) {
        for (const plugin of character.plugins) {
            if (plugin.clients) {
                for (const client of plugin.clients) {
                    clients.push(await client.start(runtime));
                }
            }
        }
    }

    return clients;
}

function getSecret(character: Character, secret: string) {
    return character.settings.secrets?.[secret] || process.env[secret];
}

let nodePlugin: any | undefined;

export function createAgent(
    character: Character,
    db: IDatabaseAdapter,
    cache: ICacheManager,
    token: string
) {
    elizaLogger.success(
        elizaLogger.successesTitle,
        "Creating runtime for character",
        character.name
    );

    nodePlugin ??= createNodePlugin();

    return new AgentRuntime({
        databaseAdapter: db,
        token,
        modelProvider: character.modelProvider,
        evaluators: [],
        character,
        plugins: [
            bootstrapPlugin,
            getSecret(character, "CONFLUX_CORE_PRIVATE_KEY")
                ? confluxPlugin
                : null,
            nodePlugin,
            getSecret(character, "SOLANA_PUBLIC_KEY") ||
            (getSecret(character, "WALLET_PUBLIC_KEY") &&
                !getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
                ? solanaPlugin
                : null,
            getSecret(character, "EVM_PUBLIC_KEY") ||
            (getSecret(character, "WALLET_PUBLIC_KEY") &&
                !getSecret(character, "WALLET_PUBLIC_KEY")?.startsWith("0x"))
                ? evmPlugin
                : null,
            getSecret(character, "ZEROG_PRIVATE_KEY") ? zgPlugin : null,
            getSecret(character, "COINBASE_COMMERCE_KEY")
                ? coinbaseCommercePlugin
                : null,
            getSecret(character, "FAL_API_KEY") ||
                getSecret(character, "OPENAI_API_KEY") ||
                getSecret(character, "HEURIST_API_KEY")
                ? imageGenerationPlugin
                : null,
            ...(getSecret(character, "COINBASE_API_KEY") &&
            getSecret(character, "COINBASE_PRIVATE_KEY")
                ? [coinbaseMassPaymentsPlugin, tradePlugin]
                : []),
        ].filter(Boolean),
        providers: [],
        actions: [],
        services: [],
        managers: [],
        cacheManager: cache,
    });
}

function intializeFsCache(baseDir: string, character: Character) {
    const cacheDir = path.resolve(baseDir, character.id, "cache");

    const cache = new CacheManager(new FsCacheAdapter(cacheDir));
    return cache;
}

function intializeDbCache(character: Character, db: IDatabaseCacheAdapter) {
    const cache = new CacheManager(new DbCacheAdapter(db, character.id));
    return cache;
}

// Create a global database reference
let globalDb: IDatabaseAdapter & IDatabaseCacheAdapter;

async function startAgent(character: Character, directClient) {
    try {
        character.id ??= stringToUuid(character.name);
        character.username ??= character.name;

        const token = getTokenForProvider(character.modelProvider, character);
        const dataDir = path.join(__dirname, "../data");

        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir, { recursive: true });
        }

        // Use the global database instance if it exists, otherwise create new one
        if (!globalDb) {
            globalDb = initializeDatabase(dataDir) as IDatabaseAdapter & IDatabaseCacheAdapter;
            await globalDb.init();
        }

        const cache = intializeDbCache(character, globalDb);
        const runtime = createAgent(character, globalDb, cache, token);

        await runtime.initialize();
        const clients = await initializeClients(character, runtime);
        directClient.registerAgent(runtime);

        return clients;
    } catch (error) {
        elizaLogger.error(
            `Error starting agent for character ${character.name}:`,
            error
        );
        await cleanupDatabase(); // Use the shared cleanup function
        throw error;
    }
}

// Shared cleanup function
async function cleanupDatabase() {
    if (globalDb) {
        try {
            await globalDb.close();
            globalDb = undefined; // Clear the reference after closing
            elizaLogger.info("Database connection closed successfully");
        } catch (closeError) {
            elizaLogger.error("Error closing database connection:", closeError);
        }
    }
}

// Update cleanup handler
const cleanup = async (signal?: string) => {
    elizaLogger.info(`Cleaning up... ${signal ? `Signal: ${signal}` : ''}`);
    await cleanupDatabase();
    process.exit(0);
};

// Update process handlers
process.on('SIGTERM', () => cleanup('SIGTERM'));
process.on('SIGINT', () => cleanup('SIGINT'));
process.on('SIGUSR2', () => cleanup('SIGUSR2')); // Handle nodemon restarts
process.on('beforeExit', () => cleanup('beforeExit'));
process.on('exit', () => cleanup('exit'));

// Update graceful exit
async function gracefulExit() {
    elizaLogger.log("Terminating and cleaning up resources...");
    await cleanupDatabase();
    rl.close();
    process.exit(0);
}

// Update error handler in startAgents
const startAgents = async () => {
    try {
        const directClient = await DirectClientInterface.start();
        const args = parseArguments();
        let charactersArg = args.characters || args.character;
        let characters = charactersArg ? await loadCharacters(charactersArg) : [defaultCharacter];

        for (const character of characters) {
            await startAgent(character, directClient);
        }

        function chat() {
            const agentId = characters[0].name ?? "Agent";
            rl.question("You: ", async (input) => {
                await handleUserInput(input, agentId);
                if (input.toLowerCase() !== "exit") {
                    chat();
                }
            });
        }

        elizaLogger.log("Chat started. Type 'exit' to quit.");
        chat();
    } catch (error) {
        elizaLogger.error("Error starting agents:", error);
        await cleanupDatabase();
        process.exit(1);
    }
};

// Update the main error handler
startAgents().catch(async (error) => {
    elizaLogger.error("Unhandled error in startAgents:", error);
    await cleanupDatabase();
    process.exit(1);
});

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

async function handleUserInput(input, agentId) {
    if (input.toLowerCase() === "exit") {
        gracefulExit();
    }

    try {
        const serverPort = parseInt(settings.SERVER_PORT || "3000");

        const response = await fetch(
            `http://localhost:${serverPort}/${agentId}/message`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    text: input,
                    userId: "user",
                    userName: "User",
                }),
            }
        );

        const data = await response.json();
        data.forEach((message) => elizaLogger.log(`${"Agent"}: ${message.text}`));
    } catch (error) {
        console.error("Error fetching response:", error);
    }
}
