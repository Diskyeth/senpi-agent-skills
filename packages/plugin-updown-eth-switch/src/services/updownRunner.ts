import {
    type Service,
    type IAgentRuntime,
    elizaLogger,
} from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib";
import * as cron from "node-cron";
import { ethers } from "ethers";

import {
    BotConfig,
    BotState,
    TradeResult,
    SwapParams,
    BASE_TOKENS,
    INITIAL_STATE,
} from "../types.js";
import { loadConfig, validateConfig, validateEnvironment } from "../utils/config.js";
import { getETHUSDCPrice, validatePriceStability } from "../utils/price.js";
import { getBalances, executeSwap, calculateTradeAmount } from "../utils/trading.js";

class UpdownRunnerService implements Service {
    private static instance: UpdownRunnerService;
    private runtime: IAgentRuntime | null = null;
    private config: BotConfig;
    private state: BotState = { ...INITIAL_STATE };
    private cronJob: cron.ScheduledTask | null = null;
    private lastPrice: number | null = null;
    private provider: ethers.Provider | null = null;
    private walletClient: MoxieWalletClient | null = null;

    constructor() {
        this.config = loadConfig();
    }

    static getInstance(): UpdownRunnerService {
        if (!UpdownRunnerService.instance) {
            UpdownRunnerService.instance = new UpdownRunnerService();
        }
        return UpdownRunnerService.instance;
    }

    async initialize(runtime: IAgentRuntime): Promise<void> {
        elizaLogger.info("Initializing UpdownRunnerService");
        this.runtime = runtime;

        // Validate environment
        const envErrors = validateEnvironment();
        if (envErrors.length > 0) {
            throw new Error(`Environment validation failed: ${envErrors.join(", ")}`);
        }

        // Validate configuration
        const configErrors = validateConfig(this.config);
        if (configErrors.length > 0) {
            throw new Error(`Configuration validation failed: ${configErrors.join(", ")}`);
        }

        // Initialize provider
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);

        // Initialize wallet client (this should be available from the runtime context)
        // In a real implementation, this would come from the runtime state
        try {
            const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, this.provider);
            this.walletClient = new MoxieWalletClient(wallet, this.provider);
        } catch (error) {
            elizaLogger.error("Failed to initialize wallet client:", error);
            throw error;
        }

        // Load persisted state (in a real implementation, this would come from a database)
        await this.loadState();

        elizaLogger.info("UpdownRunnerService initialized successfully");
    }

    async start(): Promise<void> {
        if (this.state.isRunning) {
            elizaLogger.warn("UpdownRunnerService is already running");
            return;
        }

        if (!this.runtime || !this.provider || !this.walletClient) {
            throw new Error("Service not properly initialized");
        }

        elizaLogger.info(`Starting UpdownRunnerService with ${this.config.POLL_INTERVAL_MS}ms interval`);
        
        // Convert milliseconds to cron format
        const intervalSeconds = Math.max(1, Math.floor(this.config.POLL_INTERVAL_MS / 1000));
        const cronPattern = `*/${intervalSeconds} * * * * *`;

        this.cronJob = cron.schedule(cronPattern, async () => {
            await this.tick();
        }, { scheduled: false });

        this.cronJob.start();
        this.state.isRunning = true;
        await this.saveState();
    }

    async stop(): Promise<void> {
        elizaLogger.info("Stopping UpdownRunnerService");
        
        if (this.cronJob) {
            this.cronJob.destroy();
            this.cronJob = null;
        }

        this.state.isRunning = false;
        await this.saveState();
    }

    getState(): BotState {
        return { ...this.state };
    }

    getConfig(): BotConfig {
        return { ...this.config };
    }

    async updateConfig(newConfig: Partial<BotConfig>): Promise<void> {
        this.config = { ...this.config, ...newConfig };
        
        const configErrors = validateConfig(this.config);
        if (configErrors.length > 0) {
            throw new Error(`Configuration validation failed: ${configErrors.join(", ")}`);
        }

        await this.saveState();
        elizaLogger.info("Configuration updated");
    }

    private async tick(): Promise<void> {
        try {
            // Check if we're in cooldown
            if (this.state.cooldownUntil && Date.now() < this.state.cooldownUntil) {
                return;
            }

            // Get current price
            const priceData = await getETHUSDCPrice(this.provider!);
            
            // Validate price stability if we have a previous price
            if (this.lastPrice !== null) {
                const isStable = await validatePriceStability(priceData.price, this.lastPrice);
                if (!isStable) {
                    elizaLogger.warn("Price instability detected, skipping tick");
                    return;
                }
            }

            // Bootstrap: set initial high/low if null
            if (this.state.lastHigh === null || this.state.lastLow === null) {
                this.state.lastHigh = priceData.price;
                this.state.lastLow = priceData.price;
                await this.saveState();
                elizaLogger.info(`Bootstrap: set initial high/low to ${priceData.price}`);
                this.lastPrice = priceData.price;
                return;
            }

            // Check for breakouts
            const tradeResult = await this.checkAndExecuteTrade(priceData.price);
            
            if (tradeResult.action !== "SKIP") {
                elizaLogger.info("Trade result:", tradeResult);
            }

            this.lastPrice = priceData.price;

        } catch (error) {
            elizaLogger.error("Error in tick:", error);
        }
    }

    private async checkAndExecuteTrade(currentPrice: number): Promise<TradeResult> {
        const bufferMultiplier = 1 + (this.config.BREAK_BUFFER_BPS / 10000);
        const upBreakout = currentPrice > this.state.lastHigh! * bufferMultiplier;
        const downBreakout = currentPrice < this.state.lastLow! * (2 - bufferMultiplier);

        let tradeResult: TradeResult = {
            success: false,
            action: "SKIP",
            price: currentPrice,
            lastHigh: this.state.lastHigh,
            lastLow: this.state.lastLow,
            timestamp: Date.now(),
        };

        if (upBreakout && this.state.mode === "USDC") {
            // Price broke above last high, buy ETH with USDC
            tradeResult = await this.executeTrade("BUY_ETH", currentPrice);
            if (tradeResult.success) {
                this.state.lastLow = currentPrice;
                this.state.mode = "ETH";
                this.state.cooldownUntil = Date.now() + (this.config.COOLDOWN_SEC * 1000);
                tradeResult.lastLow = currentPrice;
            }
        } else if (downBreakout && this.state.mode === "ETH") {
            // Price broke below last low, sell ETH for USDC
            tradeResult = await this.executeTrade("SELL_ETH", currentPrice);
            if (tradeResult.success) {
                this.state.lastHigh = currentPrice;
                this.state.mode = "USDC";
                this.state.cooldownUntil = Date.now() + (this.config.COOLDOWN_SEC * 1000);
                tradeResult.lastHigh = currentPrice;
            }
        }

        if (tradeResult.success) {
            this.state.stats.trades += 1;
            await this.saveState();
        }

        return tradeResult;
    }

    private async executeTrade(action: "BUY_ETH" | "SELL_ETH", currentPrice: number): Promise<TradeResult> {
        if (this.config.SAFE_MODE) {
            elizaLogger.info(`SAFE_MODE: Would execute ${action} at price ${currentPrice}`);
            return {
                success: true,
                action,
                reason: "Safe mode - trade simulated",
                price: currentPrice,
                quantity: 0,
                lastHigh: this.state.lastHigh,
                lastLow: this.state.lastLow,
                timestamp: Date.now(),
            };
        }

        try {
            const walletAddress = await this.walletClient!.getSigner().getAddress();
            const balances = await getBalances(this.provider!, walletAddress, currentPrice);

            // Calculate trade amount
            const tradeCalc = await calculateTradeAmount(
                balances,
                this.state.mode,
                this.config.TRADE_PCT,
                this.config.MIN_TRADE_USD
            );

            if (!tradeCalc.isValid) {
                return {
                    success: false,
                    action,
                    reason: tradeCalc.reason,
                    price: currentPrice,
                    lastHigh: this.state.lastHigh,
                    lastLow: this.state.lastLow,
                    timestamp: Date.now(),
                };
            }

            // Prepare swap parameters
            const swapParams: SwapParams = {
                tokenIn: action === "BUY_ETH" ? BASE_TOKENS.USDC : BASE_TOKENS.ETH,
                tokenOut: action === "BUY_ETH" ? BASE_TOKENS.ETH : BASE_TOKENS.USDC,
                amountIn: tradeCalc.amount.toString(),
                slippageBps: this.config.SLIPPAGE_BPS,
                recipient: walletAddress,
            };

            // Execute the swap
            const swapResult = await executeSwap(this.walletClient!, swapParams);

            if (swapResult.success) {
                elizaLogger.info(`${action} executed: ${swapResult.txHash}`);
                
                return {
                    success: true,
                    action,
                    price: currentPrice,
                    quantity: tradeCalc.amount,
                    txHash: swapResult.txHash,
                    lastHigh: this.state.lastHigh,
                    lastLow: this.state.lastLow,
                    timestamp: Date.now(),
                };
            } else {
                elizaLogger.error(`${action} failed: ${swapResult.error}`);
                return {
                    success: false,
                    action,
                    reason: swapResult.error,
                    price: currentPrice,
                    lastHigh: this.state.lastHigh,
                    lastLow: this.state.lastLow,
                    timestamp: Date.now(),
                };
            }

        } catch (error) {
            elizaLogger.error(`Error executing ${action}:`, error);
            return {
                success: false,
                action,
                reason: error.message,
                price: currentPrice,
                lastHigh: this.state.lastHigh,
                lastLow: this.state.lastLow,
                timestamp: Date.now(),
            };
        }
    }

    private async loadState(): Promise<void> {
        // In a real implementation, this would load from a database
        // For now, we'll use the initial state
        elizaLogger.info("Loading bot state (using initial state for now)");
        this.state = { ...INITIAL_STATE };
    }

    private async saveState(): Promise<void> {
        // In a real implementation, this would save to a database
        elizaLogger.debug("Saving bot state (no-op for now)");
    }
}

export const updownRunnerService: Service = {
    initialize: async (runtime: IAgentRuntime) => {
        const service = UpdownRunnerService.getInstance();
        await service.initialize(runtime);
    },
    get: () => UpdownRunnerService.getInstance(),
};
