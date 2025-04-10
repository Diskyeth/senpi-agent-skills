import {
    Action,
    HandlerCallback,
    IAgentRuntime,
    Memory,
} from "@moxie-protocol/core";

export const explainAiDustingAction: Action = {
    name: "EXPLAIN_AI_DUSTING",
    similes: [
        "EXPLAIN_WALLET_DUSTING",
        "WHAT_IS_WALLET_DUSTING",
        "HOW_DOES_WALLET_DUSTING_WORK",
        "WHAT_DOES_THE_WALLET_DUSTING_SKILL_DO",
        "EXPLAIN_WALLET_DUSTING",
        "WHAT_IS_WALLET_DUSTING",
    ],
    description:
        "Explains and tell the user how the Wallet Dusting skill works to check for dust or low-value tokens in the agent wallet and dust them to ETH on Base.",
    validate: async () => true,
    suppressInitialMessage: true,
    examples: [
        [
            {
                user: "{{user1}}",
                content: { text: "How does Wallet Dusting work?" },
            },
            {
                user: "{{user2}}",
                content: {
                    text: "Wallet Dusting automatically scans your wallet for low-value tokens — often called 'dust' — and converts them into ETH...",
                },
            },
        ],
    ],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state,
        _options,
        callback?: HandlerCallback
    ) => {
        await callback?.({
            text: `AI Dusting automatically scans your wallet for low-value tokens — often called "dust" — and converts them into ETH.

By default, it looks for any tokens worth less than $5 (you can change this). Once it finds them, it uses the 0x API to safely swap those tokens into ETH using your embedded Moxie agent wallet.`,
        });
    },
};
