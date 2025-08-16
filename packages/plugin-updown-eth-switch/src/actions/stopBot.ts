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

export const stopBotAction: Action = {
    name: "STOP_UPDOWN_ETH_BOT",
    similes: [
        "STOP_ETH_SWITCHER",
        "HALT_UPDOWN_BOT",
        "STOP_SWITCHING",
        "STOP_ETH_USDC_BOT",
        "PAUSE_BOT",
    ],
    description: "Stop the ETH/USDC updown switching bot",
    suppressInitialMessage: true,
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ) => {
        try {
            const service = updownRunnerService.get();
            const currentState = service.getState();
            
            return currentState.isRunning;
        } catch (error) {
            elizaLogger.error("Error validating stop bot action:", error);
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
            
            if (!currentState.isRunning) {
                await callback({
                    text: "ℹ️ The ETH/USDC updown bot is not currently running.",
                    action: "STOP_UPDOWN_ETH_BOT",
                });
                return true;
            }

            await service.stop();
            
            await callback({
                text: `🛑 ETH/USDC updown bot stopped successfully.

📊 **Final Statistics:**
• Total Trades: ${currentState.stats.trades}
• P&L (USDC): ${currentState.stats.pnlUSDC.toFixed(4)}
• Last Mode: ${currentState.mode}
• Last High: $${currentState.lastHigh?.toFixed(2) || 'N/A'}
• Last Low: $${currentState.lastLow?.toFixed(2) || 'N/A'}

The bot has been stopped and will no longer execute trades. You can restart it anytime with the 'start bot' command.`,
                action: "STOP_UPDOWN_ETH_BOT",
            });
            
            return true;
        } catch (error) {
            elizaLogger.error("Error stopping updown bot:", error);
            
            await callback({
                text: `❌ Failed to stop the ETH/USDC updown bot: ${error.message}

Please try again or check the system status.`,
                action: "STOP_UPDOWN_ETH_BOT",
            });
            
            return true;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Stop the bot",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ETH/USDC updown bot stopped successfully. Total trades: 5, P&L: 12.34 USDC",
                    action: "STOP_UPDOWN_ETH_BOT",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Halt updown bot",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "ETH/USDC updown bot stopped successfully. The bot has been stopped and will no longer execute trades.",
                    action: "STOP_UPDOWN_ETH_BOT",
                },
            },
        ],
    ] as ActionExample[][],
};
