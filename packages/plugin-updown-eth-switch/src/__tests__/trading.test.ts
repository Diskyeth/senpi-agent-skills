import { calculateTradeAmount } from '../utils/trading';
import { BalanceData } from '../types';

describe('Trading Utilities', () => {
    describe('calculateTradeAmount', () => {
        const mockBalances: BalanceData = {
            eth: 1.0,
            usdc: 3500,
            ethUSD: 3500,
            usdcUSD: 3500,
        };

        it('should calculate correct trade amount for USDC mode', async () => {
            const result = await calculateTradeAmount(mockBalances, "USDC", 0.25, 25);
            
            expect(result.isValid).toBe(true);
            expect(result.amount).toBe(875); // 3500 * 0.25
        });

        it('should calculate correct trade amount for ETH mode', async () => {
            const result = await calculateTradeAmount(mockBalances, "ETH", 0.25, 25);
            
            expect(result.isValid).toBe(true);
            expect(result.amount).toBe(0.25); // 1.0 * 0.25
        });

        it('should reject trade below minimum USD value', async () => {
            const smallBalances: BalanceData = {
                eth: 0.001,
                usdc: 10,
                ethUSD: 3.5,
                usdcUSD: 10,
            };

            const result = await calculateTradeAmount(smallBalances, "USDC", 0.5, 25);
            
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('below minimum');
        });

        it('should reject ETH trade that would leave insufficient gas balance', async () => {
            const lowEthBalances: BalanceData = {
                eth: 0.0005,
                usdc: 1000,
                ethUSD: 1.75,
                usdcUSD: 1000,
            };

            const result = await calculateTradeAmount(lowEthBalances, "ETH", 1.0, 1);
            
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('Insufficient ETH balance');
        });

        it('should handle zero balances gracefully', async () => {
            const zeroBalances: BalanceData = {
                eth: 0,
                usdc: 0,
                ethUSD: 0,
                usdcUSD: 0,
            };

            const result = await calculateTradeAmount(zeroBalances, "USDC", 0.5, 25);
            
            expect(result.isValid).toBe(false);
            expect(result.reason).toContain('below minimum');
        });

        it('should handle edge case with exactly minimum trade amount', async () => {
            const exactBalances: BalanceData = {
                eth: 1.0,
                usdc: 100, // Exactly minimum when trading 25%
                ethUSD: 3500,
                usdcUSD: 100,
            };

            const result = await calculateTradeAmount(exactBalances, "USDC", 0.25, 25);
            
            expect(result.isValid).toBe(true);
            expect(result.amount).toBe(25);
        });
    });
});
