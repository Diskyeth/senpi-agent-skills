import { ethers } from "ethers";
import { PriceData, BASE_TOKENS } from "../types.js";
import { elizaLogger } from "@moxie-protocol/core";

// Uniswap V3 Factory on Base
const UNISWAP_V3_FACTORY = "0x33128a8fC17869897dcE68Ed026d694621f6FDfD";
const UNISWAP_V3_QUOTER = "0x3d4e44Eb1374240CE5F1B871ab261CD16335B76a";

// Pool fee tiers (0.05%, 0.3%, 1%)
const FEE_TIERS = [500, 3000, 10000];

interface UniswapV3Pool {
    address: string;
    fee: number;
    liquidity: bigint;
}

export async function getETHUSDCPrice(provider: ethers.Provider): Promise<PriceData> {
    try {
        // First, try to get price from Uniswap V3
        const price = await getUniswapV3Price(provider);
        
        return {
            price,
            timestamp: Date.now(),
            source: "uniswap_v3"
        };
    } catch (error) {
        elizaLogger.error("Failed to fetch price from Uniswap V3:", error);
        
        // Fallback to a simple oracle or hardcoded price for testing
        elizaLogger.warn("Using fallback price - this should only be used for testing");
        return {
            price: 3500, // Fallback price
            timestamp: Date.now(),
            source: "fallback"
        };
    }
}

async function getUniswapV3Price(provider: ethers.Provider): Promise<number> {
    // ABI for Uniswap V3 Pool
    const poolAbi = [
        "function slot0() view returns (uint160 sqrtPriceX96, int24 tick, uint16 observationIndex, uint16 observationCardinality, uint16 observationCardinalityNext, uint8 feeProtocol, bool unlocked)",
        "function token0() view returns (address)",
        "function token1() view returns (address)"
    ];

    // ABI for Uniswap V3 Factory
    const factoryAbi = [
        "function getPool(address tokenA, address tokenB, uint24 fee) view returns (address pool)"
    ];

    const factory = new ethers.Contract(UNISWAP_V3_FACTORY, factoryAbi, provider);
    
    // Find the pool with the most liquidity
    let bestPool: UniswapV3Pool | null = null;
    
    for (const fee of FEE_TIERS) {
        try {
            const poolAddress = await factory.getPool(BASE_TOKENS.WETH, BASE_TOKENS.USDC, fee);
            
            if (poolAddress === ethers.ZeroAddress) continue;
            
            const pool = new ethers.Contract(poolAddress, poolAbi, provider);
            const [slot0] = await pool.slot0();
            const token0 = await pool.token0();
            const token1 = await pool.token1();
            
            if (slot0.sqrtPriceX96 > 0) {
                // Calculate price from sqrtPriceX96
                const sqrtPriceX96 = slot0.sqrtPriceX96;
                const price = calculatePriceFromSqrtPriceX96(
                    sqrtPriceX96,
                    token0.toLowerCase() === BASE_TOKENS.WETH.toLowerCase()
                );
                
                // For simplicity, use the first available pool
                // In production, you'd want to check liquidity and use the most liquid pool
                return price;
            }
        } catch (error) {
            elizaLogger.debug(`Failed to get pool for fee tier ${fee}:`, error);
            continue;
        }
    }
    
    throw new Error("No valid Uniswap V3 pool found for ETH/USDC");
}

function calculatePriceFromSqrtPriceX96(sqrtPriceX96: bigint, token0IsETH: boolean): number {
    // Convert sqrtPriceX96 to actual price
    const Q96 = 2n ** 96n;
    const price = (sqrtPriceX96 * sqrtPriceX96) / (Q96 * Q96);
    
    // USDC has 6 decimals, ETH has 18 decimals
    const decimalsRatio = 10n ** 12n; // 18 - 6 = 12
    
    let finalPrice: number;
    
    if (token0IsETH) {
        // token0 is ETH, token1 is USDC
        // Price is USDC per ETH
        finalPrice = Number(price * decimalsRatio) / Number(Q96);
    } else {
        // token0 is USDC, token1 is ETH  
        // Price is ETH per USDC, need to invert
        finalPrice = Number(Q96) / Number(price * decimalsRatio);
    }
    
    return finalPrice;
}

export async function validatePriceStability(
    currentPrice: number,
    previousPrice: number,
    maxDeviationPercent: number = 1
): Promise<boolean> {
    const deviation = Math.abs((currentPrice - previousPrice) / previousPrice) * 100;
    
    if (deviation > maxDeviationPercent) {
        elizaLogger.warn(`Price deviation too high: ${deviation.toFixed(2)}%`);
        return false;
    }
    
    return true;
}
