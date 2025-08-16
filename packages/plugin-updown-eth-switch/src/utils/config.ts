import { BotConfig, DEFAULT_CONFIG } from "../types.js";

export function loadConfig(): BotConfig {
    return {
        CHAIN: process.env.CHAIN || DEFAULT_CONFIG.CHAIN,
        POLL_INTERVAL_MS: parseInt(process.env.POLL_INTERVAL_MS || DEFAULT_CONFIG.POLL_INTERVAL_MS.toString(), 10),
        TRADE_PCT: parseFloat(process.env.TRADE_PCT || DEFAULT_CONFIG.TRADE_PCT.toString()),
        MIN_TRADE_USD: parseFloat(process.env.MIN_TRADE_USD || DEFAULT_CONFIG.MIN_TRADE_USD.toString()),
        SLIPPAGE_BPS: parseInt(process.env.SLIPPAGE_BPS || DEFAULT_CONFIG.SLIPPAGE_BPS.toString(), 10),
        BREAK_BUFFER_BPS: parseInt(process.env.BREAK_BUFFER_BPS || DEFAULT_CONFIG.BREAK_BUFFER_BPS.toString(), 10),
        COOLDOWN_SEC: parseInt(process.env.COOLDOWN_SEC || DEFAULT_CONFIG.COOLDOWN_SEC.toString(), 10),
        SAFE_MODE: process.env.SAFE_MODE?.toLowerCase() === "true" || DEFAULT_CONFIG.SAFE_MODE,
    };
}

export function validateConfig(config: BotConfig): string[] {
    const errors: string[] = [];

    if (config.TRADE_PCT <= 0 || config.TRADE_PCT > 1) {
        errors.push("TRADE_PCT must be between 0 and 1");
    }

    if (config.MIN_TRADE_USD <= 0) {
        errors.push("MIN_TRADE_USD must be positive");
    }

    if (config.SLIPPAGE_BPS <= 0 || config.SLIPPAGE_BPS > 10000) {
        errors.push("SLIPPAGE_BPS must be between 1 and 10000");
    }

    if (config.BREAK_BUFFER_BPS < 0 || config.BREAK_BUFFER_BPS > 10000) {
        errors.push("BREAK_BUFFER_BPS must be between 0 and 10000");
    }

    if (config.COOLDOWN_SEC < 0) {
        errors.push("COOLDOWN_SEC must be non-negative");
    }

    if (config.POLL_INTERVAL_MS < 1000) {
        errors.push("POLL_INTERVAL_MS must be at least 1000ms");
    }

    return errors;
}

export function validateEnvironment(): string[] {
    const errors: string[] = [];

    if (!process.env.OPENAI_API_KEY) {
        errors.push("OPENAI_API_KEY is required");
    }

    if (!process.env.PRIVATE_KEY) {
        errors.push("PRIVATE_KEY is required");
    }

    if (!process.env.RPC_URL) {
        errors.push("RPC_URL is required");
    }

    return errors;
}
