import { loadConfig, validateConfig, validateEnvironment } from '../utils/config';
import { BotConfig, DEFAULT_CONFIG } from '../types';

describe('Configuration Utilities', () => {
    const originalEnv = process.env;

    beforeEach(() => {
        // Reset environment before each test
        process.env = { ...originalEnv };
    });

    afterAll(() => {
        // Restore original environment
        process.env = originalEnv;
    });

    describe('loadConfig', () => {
        it('should load default configuration when no env vars are set', () => {
            const config = loadConfig();
            expect(config).toEqual(DEFAULT_CONFIG);
        });

        it('should load configuration from environment variables', () => {
            process.env.CHAIN = 'ethereum';
            process.env.POLL_INTERVAL_MS = '5000';
            process.env.TRADE_PCT = '0.5';
            process.env.MIN_TRADE_USD = '100';
            process.env.SLIPPAGE_BPS = '50';
            process.env.BREAK_BUFFER_BPS = '20';
            process.env.COOLDOWN_SEC = '30';
            process.env.SAFE_MODE = 'false';

            const config = loadConfig();
            
            expect(config.CHAIN).toBe('ethereum');
            expect(config.POLL_INTERVAL_MS).toBe(5000);
            expect(config.TRADE_PCT).toBe(0.5);
            expect(config.MIN_TRADE_USD).toBe(100);
            expect(config.SLIPPAGE_BPS).toBe(50);
            expect(config.BREAK_BUFFER_BPS).toBe(20);
            expect(config.COOLDOWN_SEC).toBe(30);
            expect(config.SAFE_MODE).toBe(false);
        });

        it('should handle boolean SAFE_MODE correctly', () => {
            process.env.SAFE_MODE = 'true';
            expect(loadConfig().SAFE_MODE).toBe(true);

            process.env.SAFE_MODE = 'false';
            expect(loadConfig().SAFE_MODE).toBe(false);

            process.env.SAFE_MODE = 'True';
            expect(loadConfig().SAFE_MODE).toBe(true);

            delete process.env.SAFE_MODE;
            expect(loadConfig().SAFE_MODE).toBe(DEFAULT_CONFIG.SAFE_MODE);
        });
    });

    describe('validateConfig', () => {
        it('should validate a correct configuration', () => {
            const errors = validateConfig(DEFAULT_CONFIG);
            expect(errors).toHaveLength(0);
        });

        it('should detect invalid TRADE_PCT', () => {
            const config: BotConfig = { ...DEFAULT_CONFIG, TRADE_PCT: -0.1 };
            const errors = validateConfig(config);
            expect(errors).toContain('TRADE_PCT must be between 0 and 1');

            config.TRADE_PCT = 1.5;
            const errors2 = validateConfig(config);
            expect(errors2).toContain('TRADE_PCT must be between 0 and 1');
        });

        it('should detect invalid MIN_TRADE_USD', () => {
            const config: BotConfig = { ...DEFAULT_CONFIG, MIN_TRADE_USD: -10 };
            const errors = validateConfig(config);
            expect(errors).toContain('MIN_TRADE_USD must be positive');
        });

        it('should detect invalid SLIPPAGE_BPS', () => {
            const config: BotConfig = { ...DEFAULT_CONFIG, SLIPPAGE_BPS: 0 };
            const errors = validateConfig(config);
            expect(errors).toContain('SLIPPAGE_BPS must be between 1 and 10000');

            config.SLIPPAGE_BPS = 15000;
            const errors2 = validateConfig(config);
            expect(errors2).toContain('SLIPPAGE_BPS must be between 1 and 10000');
        });

        it('should detect invalid BREAK_BUFFER_BPS', () => {
            const config: BotConfig = { ...DEFAULT_CONFIG, BREAK_BUFFER_BPS: -5 };
            const errors = validateConfig(config);
            expect(errors).toContain('BREAK_BUFFER_BPS must be between 0 and 10000');

            config.BREAK_BUFFER_BPS = 15000;
            const errors2 = validateConfig(config);
            expect(errors2).toContain('BREAK_BUFFER_BPS must be between 0 and 10000');
        });

        it('should detect invalid COOLDOWN_SEC', () => {
            const config: BotConfig = { ...DEFAULT_CONFIG, COOLDOWN_SEC: -1 };
            const errors = validateConfig(config);
            expect(errors).toContain('COOLDOWN_SEC must be non-negative');
        });

        it('should detect invalid POLL_INTERVAL_MS', () => {
            const config: BotConfig = { ...DEFAULT_CONFIG, POLL_INTERVAL_MS: 500 };
            const errors = validateConfig(config);
            expect(errors).toContain('POLL_INTERVAL_MS must be at least 1000ms');
        });

        it('should return multiple errors for multiple invalid fields', () => {
            const config: BotConfig = {
                ...DEFAULT_CONFIG,
                TRADE_PCT: -0.1,
                MIN_TRADE_USD: -10,
                SLIPPAGE_BPS: 15000,
            };
            const errors = validateConfig(config);
            expect(errors.length).toBeGreaterThan(1);
        });
    });

    describe('validateEnvironment', () => {
        it('should pass with all required variables', () => {
            process.env.OPENAI_API_KEY = 'sk-test';
            process.env.PRIVATE_KEY = '0x123';
            process.env.RPC_URL = 'https://test.rpc';

            const errors = validateEnvironment();
            expect(errors).toHaveLength(0);
        });

        it('should detect missing OPENAI_API_KEY', () => {
            delete process.env.OPENAI_API_KEY;
            process.env.PRIVATE_KEY = '0x123';
            process.env.RPC_URL = 'https://test.rpc';

            const errors = validateEnvironment();
            expect(errors).toContain('OPENAI_API_KEY is required');
        });

        it('should detect missing PRIVATE_KEY', () => {
            process.env.OPENAI_API_KEY = 'sk-test';
            delete process.env.PRIVATE_KEY;
            process.env.RPC_URL = 'https://test.rpc';

            const errors = validateEnvironment();
            expect(errors).toContain('PRIVATE_KEY is required');
        });

        it('should detect missing RPC_URL', () => {
            process.env.OPENAI_API_KEY = 'sk-test';
            process.env.PRIVATE_KEY = '0x123';
            delete process.env.RPC_URL;

            const errors = validateEnvironment();
            expect(errors).toContain('RPC_URL is required');
        });

        it('should detect multiple missing variables', () => {
            delete process.env.OPENAI_API_KEY;
            delete process.env.PRIVATE_KEY;
            delete process.env.RPC_URL;

            const errors = validateEnvironment();
            expect(errors.length).toBe(3);
        });
    });
});
