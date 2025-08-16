import type { Plugin } from "@moxie-protocol/core";
import { startBotAction } from "./actions/startBot";
import { stopBotAction } from "./actions/stopBot";
import { statusAction } from "./actions/status";
import { setParamAction } from "./actions/setParam";
import { updownRunnerService } from "./services/updownRunner";

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
