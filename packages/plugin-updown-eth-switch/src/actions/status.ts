import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
    elizaLogger,
} from "@moxie-protocol/core";
import { updownRunnerService } from "../services/updownRunner.js";

export const statusAction: Action = {
    name: "STATUS_UPDOWN_ETH_BOT",
    similes: [
        "SHOW_STATUS",
        "BOT_STATUS",
        "CHECK_STATUS",
        "STATUS",
        "UPDOWN_STATUS",
        "ETH_BOT_STATUS",
    ],
    description: "Show the current status of the ETH/USDC updown switching bot including configuration, state, and statistics",
    suppressInitialMessage: true,
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ) => true, // Always allow status check
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            const service = updownRunnerService.get();
            const currentState = service.getState();
            const config = service.getConfig();
            
            const statusIcon = currentState.isRunning ? "🟢" : "🔴";
            const statusText = currentState.isRunning ? "RUNNING" : "STOPPED";
            
            // Calculate time until cooldown ends
            let cooldownText = "None";
            if (currentState.cooldownUntil && currentState.cooldownUntil > Date.now()) {
                const remainingMs = currentState.cooldownUntil - Date.now();
                const remainingSec = Math.ceil(remainingMs / 1000);
                cooldownText = `${remainingSec}s remaining`;
            }
            
            await callback({
                text: `${statusIcon} **ETH/USDC Updown Bot Status: ${statusText}**

📊 **Current State:**
• Mode: ${currentState.mode}
• Last High: $${currentState.lastHigh?.toFixed(2) || 'Not set'}
• Last Low: $${currentState.lastLow?.toFixed(2) || 'Not set'}
• Cooldown: ${cooldownText}

📈 **Statistics:**
• Total Trades: ${currentState.stats.trades}
• P&L (USDC): ${currentState.stats.pnlUSDC > 0 ? '+' : ''}${currentState.stats.pnlUSDC.toFixed(4)}

⚙️ **Configuration:**
• Chain: ${config.CHAIN.toUpperCase()}
• Poll Interval: ${config.POLL_INTERVAL_MS}ms
• Trade Percentage: ${(config.TRADE_PCT * 100).toFixed(1)}%
• Min Trade: $${config.MIN_TRADE_USD}
• Slippage: ${(config.SLIPPAGE_BPS / 100).toFixed(2)}%
• Break Buffer: ${(config.BREAK_BUFFER_BPS / 100).toFixed(2)}%
• Cooldown: ${config.COOLDOWN_SEC}s
• Safe Mode: ${config.SAFE_MODE ? "ON ⚠️" : "OFF ⚡"}

${currentState.isRunning 
    ? "The bot is actively monitoring price movements and will execute trades on breakouts."
    : "The bot is stopped. Use 'start bot' to begin trading."
}`,
                action: "STATUS_UPDOWN_ETH_BOT",
            });
            
            return true;
        } catch (error) {
            elizaLogger.error("Error getting updown bot status:", error);
            
            await callback({
                text: `❌ Failed to get ETH/USDC updown bot status: ${error.message}

The service may not be initialized properly.`,
                action: "STATUS_UPDOWN_ETH_BOT",
            });
            
            return true;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Status?",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "🟢 ETH/USDC Updown Bot Status: RUNNING. Mode: USDC, Last High: $3500.00, Last Low: $3450.00, Total Trades: 3",
                    action: "STATUS_UPDOWN_ETH_BOT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Show last high and low",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "🔴 ETH/USDC Updown Bot Status: STOPPED. Last High: $3520.00, Last Low: $3480.00, Safe Mode: ON",
                    action: "STATUS_UPDOWN_ETH_BOT",
                },
            },
        ],
    ] as ActionExample[][],
};
