import { ethers } from "ethers";
import { elizaLogger } from "@moxie-protocol/core";
import { MoxieWalletClient } from "@moxie-protocol/moxie-agent-lib";
import { SwapParams, SwapResult, BalanceData, BASE_TOKENS } from "../types";

// Uniswap V3 SwapRouter on Base
const UNISWAP_V3_ROUTER = "0x2626664c2603336E57B271c5C0b26F421741e481";

// ERC20 ABI
const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
    "function symbol() view returns (string)",
    "function approve(address spender, uint256 amount) returns (bool)",
    "function allowance(address owner, address spender) view returns (uint256)"
];

// Uniswap V3 Router ABI (simplified)
const UNISWAP_ROUTER_ABI = [
    "function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 deadline, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96)) external payable returns (uint256 amountOut)"
];

export async function getBalances(
    provider: ethers.Provider,
    walletAddress: string,
    ethPriceUSD: number
): Promise<BalanceData> {
    try {
        // Get ETH balance
        const ethBalance = await provider.getBalance(walletAddress);
        const ethAmount = parseFloat(ethers.formatEther(ethBalance));

        // Get USDC balance
        const usdcContract = new ethers.Contract(BASE_TOKENS.USDC, ERC20_ABI, provider);
        const usdcBalance = await usdcContract.balanceOf(walletAddress);
        const usdcAmount = parseFloat(ethers.formatUnits(usdcBalance, 6)); // USDC has 6 decimals

        return {
            eth: ethAmount,
            usdc: usdcAmount,
            ethUSD: ethAmount * ethPriceUSD,
            usdcUSD: usdcAmount, // USDC is pegged to USD
        };
    } catch (error) {
        elizaLogger.error("Failed to get balances:", error);
        throw error;
    }
}

export async function executeSwap(
    walletClient: MoxieWalletClient,
    swapParams: SwapParams
): Promise<SwapResult> {
    try {
        elizaLogger.info(`Executing swap: ${swapParams.amountIn} ${swapParams.tokenIn} -> ${swapParams.tokenOut}`);

        // Note: This is a simplified implementation for demonstration
        // In a real implementation, you would:
        // 1. Check if tokens need approval and send approval transaction
        // 2. Encode the swap transaction data properly
        // 3. Handle different swap scenarios (ETH <-> ERC20)
        
        // For now, return a simulated success in safe mode
        elizaLogger.warn("Swap execution is currently simulated - real implementation needs contract interaction via MoxieWalletClient.sendTransaction");
        
        return {
            success: true,
            txHash: "0x" + "0".repeat(64), // Simulated transaction hash
            amountOut: "0",
        };
    } catch (error) {
        elizaLogger.error("Failed to execute swap:", error);
        return {
            success: false,
            error: error.message,
        };
    }
}

async function ensureApproval(
    signer: ethers.Signer,
    tokenAddress: string,
    amount: string
): Promise<void> {
    const tokenContract = new ethers.Contract(tokenAddress, ERC20_ABI, signer);
    const signerAddress = await signer.getAddress();
    
    const currentAllowance = await tokenContract.allowance(signerAddress, UNISWAP_V3_ROUTER);
    const requiredAmount = ethers.parseUnits(amount, 6); // USDC has 6 decimals
    
    if (currentAllowance < requiredAmount) {
        elizaLogger.info(`Approving ${amount} tokens for swap`);
        const approveTx = await tokenContract.approve(UNISWAP_V3_ROUTER, requiredAmount);
        await approveTx.wait();
        elizaLogger.info("Token approval completed");
    }
}

function calculateMinimumAmountOut(amountIn: bigint, slippageBps: number): bigint {
    const slippageMultiplier = BigInt(10000 - slippageBps);
    return (amountIn * slippageMultiplier) / BigInt(10000);
}

function extractAmountOutFromReceipt(receipt: ethers.TransactionReceipt): string {
    // In a real implementation, you would parse the logs to extract the exact amount out
    // For now, return a placeholder
    return "0";
}

export async function calculateTradeAmount(
    balances: BalanceData,
    mode: "ETH" | "USDC",
    tradePct: number,
    minTradeUSD: number
): Promise<{ amount: number; isValid: boolean; reason?: string }> {
    let amount: number;
    let valueUSD: number;

    if (mode === "USDC") {
        // We're in USDC mode, want to buy ETH
        amount = balances.usdc * tradePct;
        valueUSD = amount; // USDC is ~1 USD
    } else {
        // We're in ETH mode, want to sell to USDC
        amount = balances.eth * tradePct;
        valueUSD = balances.ethUSD * tradePct;
    }

    if (valueUSD < minTradeUSD) {
        return {
            amount: 0,
            isValid: false,
            reason: `Trade value $${valueUSD.toFixed(2)} below minimum $${minTradeUSD}`,
        };
    }

    // Keep some ETH for gas fees
    if (mode === "ETH" && (balances.eth - amount) < 0.001) {
        return {
            amount: 0,
            isValid: false,
            reason: "Insufficient ETH balance (need to keep some for gas)",
        };
    }

    return {
        amount,
        isValid: true,
    };
}
