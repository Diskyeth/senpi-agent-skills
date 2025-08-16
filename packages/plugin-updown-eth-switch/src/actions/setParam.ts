import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type HandlerCallback,
    type State,
    type ActionExample,
    elizaLogger,
    composeContext,
    generateObjectDeprecated,
    ModelClass,
} from "@moxie-protocol/core";
import { updownRunnerService } from "../services/updownRunner.js";

interface SetParamRequest {
    parameter: string;
    value: string | number | boolean;
    success: boolean;
    error?: string;
}

const setParamTemplate = `
You are helping a user configure an ETH/USDC updown trading bot. Parse the user's request to set a parameter.

Available parameters:
- TRADE_PCT (number, 0-1): Percentage of balance to trade (e.g., 0.25 for 25%)
- BREAK_BUFFER_BPS (number, 0-10000): Basis points buffer for breakouts (e.g., 10 for 0.1%)
- COOLDOWN_SEC (number, ≥0): Cooldown time in seconds after trades
- SAFE_MODE (boolean): Whether to simulate trades only
- MIN_TRADE_USD (number, >0): Minimum trade value in USD
- SLIPPAGE_BPS (number, 1-10000): Maximum slippage in basis points
- POLL_INTERVAL_MS (number, ≥1000): Polling interval in milliseconds

User request: "{{content}}"

Parse the request and respond with:
{
  "parameter": "PARAMETER_NAME",
  "value": parsed_value,
  "success": true
}

If the request is unclear or invalid, respond with:
{
  "success": false,
  "error": "explanation of what went wrong"
}

Examples:
- "set trade percent to 0.3" → {"parameter": "TRADE_PCT", "value": 0.3, "success": true}
- "turn safe mode off" → {"parameter": "SAFE_MODE", "value": false, "success": true}
- "set break buffer to 15 bps" → {"parameter": "BREAK_BUFFER_BPS", "value": 15, "success": true}
- "cooldown 30 seconds" → {"parameter": "COOLDOWN_SEC", "value": 30, "success": true}
`;

export const setParamAction: Action = {
    name: "SET_UPDOWN_PARAM",
    similes: [
        "CONFIGURE_UPDOWN",
        "SET_SWITCH_PARAM",
        "UPDATE_CONFIG",
        "CHANGE_PARAMETER",
        "SET_TRADE_PERCENT",
        "SET_SAFE_MODE",
        "SET_COOLDOWN",
        "SET_BREAK_BUFFER",
    ],
    description: "Change runtime parameters for the ETH/USDC updown bot (trade percentage, break buffer, cooldown, safe mode, etc.)",
    suppressInitialMessage: true,
    validate: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State
    ) => true, // Always allow parameter changes
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        options: { [key: string]: unknown },
        callback: HandlerCallback
    ) => {
        try {
            // Use LLM to parse the user's request
            const context = composeContext({
                state: { ...state, content: message.content.text },
                template: setParamTemplate,
            });

            const parsedRequest = await generateObjectDeprecated({
                runtime,
                context,
                modelClass: ModelClass.SMALL,
            }) as SetParamRequest;

            if (!parsedRequest.success) {
                await callback({
                    text: `❌ Unable to parse parameter request: ${parsedRequest.error || 'Invalid format'}

**Usage examples:**
• "set trade percent to 0.3"
• "turn safe mode off"  
• "set break buffer to 15 bps"
• "cooldown 30 seconds"
• "set minimum trade to 50"

**Available parameters:**
• Trade Percentage (0-1)
• Break Buffer (0-10000 bps)
• Cooldown (seconds)
• Safe Mode (on/off)
• Min Trade USD (>0)
• Slippage (1-10000 bps)
• Poll Interval (≥1000 ms)`,
                    action: "SET_UPDOWN_PARAM",
                });
                return true;
            }

            const service = updownRunnerService.get();
            const currentConfig = service.getConfig();
            
            // Validate the parameter name
            const validParams = ['TRADE_PCT', 'BREAK_BUFFER_BPS', 'COOLDOWN_SEC', 'SAFE_MODE', 'MIN_TRADE_USD', 'SLIPPAGE_BPS', 'POLL_INTERVAL_MS'];
            if (!validParams.includes(parsedRequest.parameter)) {
                await callback({
                    text: `❌ Invalid parameter: ${parsedRequest.parameter}

Available parameters: ${validParams.join(', ')}`,
                    action: "SET_UPDOWN_PARAM",
                });
                return true;
            }

            // Update the configuration
            const newConfig = {
                [parsedRequest.parameter]: parsedRequest.value,
            };

            await service.updateConfig(newConfig);
            
            const updatedConfig = service.getConfig();
            const currentState = service.getState();
            
            // Format the value for display
            let displayValue: string;
            if (parsedRequest.parameter === 'TRADE_PCT') {
                displayValue = `${(parsedRequest.value as number * 100).toFixed(1)}%`;
            } else if (parsedRequest.parameter.endsWith('_BPS')) {
                displayValue = `${(parsedRequest.value as number / 100).toFixed(2)}%`;
            } else if (typeof parsedRequest.value === 'boolean') {
                displayValue = parsedRequest.value ? 'ON' : 'OFF';
            } else {
                displayValue = parsedRequest.value.toString();
            }

            await callback({
                text: `✅ Parameter updated successfully!

**${parsedRequest.parameter}** set to: **${displayValue}**

${currentState.isRunning 
    ? "⚠️ **Note:** The bot is currently running. Some changes may require restarting the bot to take full effect."
    : "💡 **Note:** Start the bot to apply these settings."
}

Use 'status' to see all current configuration values.`,
                action: "SET_UPDOWN_PARAM",
            });
            
            return true;
        } catch (error) {
            elizaLogger.error("Error setting updown bot parameter:", error);
            
            await callback({
                text: `❌ Failed to set parameter: ${error.message}

Please check your input format and try again.`,
                action: "SET_UPDOWN_PARAM",
            });
            
            return true;
        }
    },
    examples: [
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Set trade percent to 0.3",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "✅ Parameter updated successfully! TRADE_PCT set to: 30.0%",
                    action: "SET_UPDOWN_PARAM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Turn safe mode off",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "✅ Parameter updated successfully! SAFE_MODE set to: OFF",
                    action: "SET_UPDOWN_PARAM",
                },
            },
        ],
        [
            {
                user: "{{user1}}",
                content: {
                    text: "Set break buffer to 15 bps",
                },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "✅ Parameter updated successfully! BREAK_BUFFER_BPS set to: 0.15%",
                    action: "SET_UPDOWN_PARAM",
                },
            },
        ],
    ] as ActionExample[][],
};
