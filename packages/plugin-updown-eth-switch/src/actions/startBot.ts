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

export const startBotAction: Action = {
    name: "START_UPDOWN_ETH_BOT",
    similes: [
        "START_ETH_SWITCHER",
        "RUN_UPDOWN_BOT",
        "BEGIN_SWITCHING",
        "START_ETH_USDC_BOT",
    ],
    description: "Start the ETH/USDC updown switching bot that automatically trades based on price breakouts",
    suppressInitialMessage: true,
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ) => {
        try {
            const service = updownRunnerService.get();
            const currentState = service.getState();
            
            if (currentState.isRunning) {
                return false;
            }
            
            return true;
        } catch (error) {
            elizaLogger.error("Error validating start bot action:", error);
            return false;
        }
    },
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
            
            if (currentState.isRunning) {
                await callback({
                    text: "❌ The ETH/USDC updown bot is already running. Use 'stop bot' to stop it first.",
                    action: "START_UPDOWN_ETH_BOT",
                });
                return true;
            }

            await service.start();
            const config = service.getConfig();
            
            await callback({
                text: `✅ ETH/USDC updown bot started successfully!

📊 **Configuration:**
• Poll Interval: ${config.POLL_INTERVAL_MS}ms
• Trade Percentage: ${(config.TRADE_PCT * 100).toFixed(1)}%
• Min Trade: $${config.MIN_TRADE_USD}
• Slippage: ${(config.SLIPPAGE_BPS / 100).toFixed(2)}%
• Break Buffer: ${(config.BREAK_BUFFER_BPS / 100).toFixed(2)}%
• Cooldown: ${config.COOLDOWN_SEC}s
• Safe Mode: ${config.SAFE_MODE ? "ON" : "OFF"}

The bot will now monitor ETH/USDC price movements and execute trades when price breaks above the last high or below the last low.

${config.SAFE_MODE ? "⚠️ **Safe Mode is ON** - trades will be simulated only." : "⚡ **Live Mode** - real trades will be executed."}`,
                action: "START_UPDOWN_ETH_BOT",
            });
            
            return true;
        } catch (error) {
            elizaLogger.error("Error starting updown bot:", error);
            
            await callback({
                text: `❌ Failed to start the ETH/USDC updown bot: ${error.message}

Please check your configuration and try again.`,
                action: "START_UPDOWN_ETH_BOT",
            });
            
            return true;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Start the ETH updown bot",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ETH/USDC updown bot started successfully! The bot will now monitor price movements and execute trades based on breakouts.",
                    action: "START_UPDOWN_ETH_BOT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Begin switching on Base",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ETH/USDC updown bot started successfully! Poll interval: 2000ms, Trade %: 25%, Safe Mode: ON",
                    action: "START_UPDOWN_ETH_BOT",
                },
            },
        ],
    ] as ActionExample[][],
};
