export interface BotConfig {
    CHAIN: string;
    POLL_INTERVAL_MS: number;
    TRADE_PCT: number;
    MIN_TRADE_USD: number;
    SLIPPAGE_BPS: number;
    BREAK_BUFFER_BPS: number;
    COOLDOWN_SEC: number;
    SAFE_MODE: boolean;
}

export interface BotState {
    lastHigh: number | null;
    lastLow: number | null;
    mode: "ETH" | "USDC";
    cooldownUntil: number | null;
    stats: {
        trades: number;
        pnlUSDC: number;
    };
    isRunning: boolean;
}

export interface TradeResult {
    success: boolean;
    action: "BUY_ETH" | "SELL_ETH" | "SKIP";
    reason?: string;
    price: number;
    quantity?: number;
    txHash?: string;
    lastHigh: number | null;
    lastLow: number | null;
    timestamp: number;
    pnlUSDC?: number;
}

export interface PriceData {
    price: number;
    timestamp: number;
    source: string;
}

export interface BalanceData {
    eth: number;
    usdc: number;
    ethUSD: number;
    usdcUSD: number;
}

export interface SwapParams {
    tokenIn: string;
    tokenOut: string;
    amountIn: string;
    slippageBps: number;
    recipient: string;
}

export interface SwapResult {
    success: boolean;
    txHash?: string;
    amountOut?: string;
    error?: string;
}

export const DEFAULT_CONFIG: BotConfig = {
    CHAIN: "base",
    POLL_INTERVAL_MS: 2000,
    TRADE_PCT: 0.25,
    MIN_TRADE_USD: 25,
    SLIPPAGE_BPS: 30,
    BREAK_BUFFER_BPS: 10,
    COOLDOWN_SEC: 15,
    SAFE_MODE: true,
};

export const INITIAL_STATE: BotState = {
    lastHigh: null,
    lastLow: null,
    mode: "USDC",
    cooldownUntil: null,
    stats: {
        trades: 0,
        pnlUSDC: 0,
    },
    isRunning: false,
};

// Token addresses on Base
export const BASE_TOKENS = {
    ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE", // Native ETH
    USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", // USDC on Base
    WETH: "0x4200000000000000000000000000000000000006", // Wrapped ETH on Base
} as const;
