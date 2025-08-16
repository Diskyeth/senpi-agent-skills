import type { Plugin } from "@moxie-protocol/core";
import { startBotAction } from "./actions/startBot.js";
import { stopBotAction } from "./actions/stopBot.js";
import { statusAction } from "./actions/status.js";
import { setParamAction } from "./actions/setParam.js";
import { updownRunnerService } from "./services/updownRunner.js";

const updownEthSwitchPlugin: Plugin = {
    name: "updown-eth-switch",
    description: "Flip ETH↔USDC on Base using pure price breakouts of last_high/last_low.",
    actions: [
        startBotAction,
        stopBotAction,
        statusAction,
        setParamAction,
    ],
    providers: [],
    services: [updownRunnerService],
    clients: [],
    evaluators: [],
};

export default updownEthSwitchPlugin;
