# ETH↔USDC Updown Switcher Plugin

A Senpi Eliza Skills Framework plugin that automatically trades ETH and USDC on Base using pure price breakout strategies. The bot monitors ETH/USDC price movements and executes trades when the price breaks above the last high or below the last low.

## Overview

This plugin implements an automated trading bot that:
- Monitors ETH/USDC price on Base chain using Uniswap V3
- Tracks last high and last low prices
- Buys ETH when price breaks above `last_high * (1 + buffer)`
- Sells ETH when price breaks below `last_low * (1 - buffer)`
- Implements cooldown periods and safety checks
- Supports both live trading and safe mode (simulation)

## Requirements

- **Node.js**: 23+
- **pnpm**: 9+
- **Environment Variables**: See [Setup](#setup) section

## Installation

1. Clone the repository and navigate to the plugin directory:
```bash
cd packages/plugin-updown-eth-switch
```

2. Install dependencies:
```bash
pnpm install
```

3. Build the plugin:
```bash
pnpm build
```

## Setup

1. Copy the environment example file:
```bash
cp .env.example .env
```

2. Configure required environment variables:
```env
# Required
OPENAI_API_KEY=sk-your-openai-api-key
PRIVATE_KEY=0x-your-wallet-private-key
RPC_URL=https://mainnet.base.org

# Optional (defaults shown)
CHAIN=base
POLL_INTERVAL_MS=2000
TRADE_PCT=0.25
MIN_TRADE_USD=25
SLIPPAGE_BPS=30
BREAK_BUFFER_BPS=10
COOLDOWN_SEC=15
SAFE_MODE=true
```

### Environment Variables Explained

| Variable | Description | Default | Range |
|----------|-------------|---------|-------|
| `OPENAI_API_KEY` | OpenAI API key for LLM operations | **Required** | - |
| `PRIVATE_KEY` | Wallet private key for transactions | **Required** | - |
| `RPC_URL` | Base chain RPC endpoint | **Required** | - |
| `CHAIN` | Target blockchain | `base` | - |
| `POLL_INTERVAL_MS` | Price polling interval | `2000` | ≥1000 |
| `TRADE_PCT` | Percentage of balance to trade | `0.25` | 0-1 |
| `MIN_TRADE_USD` | Minimum trade value in USD | `25` | >0 |
| `SLIPPAGE_BPS` | Maximum slippage tolerance | `30` | 1-10000 |
| `BREAK_BUFFER_BPS` | Breakout buffer in basis points | `10` | 0-10000 |
| `COOLDOWN_SEC` | Cooldown after trades (seconds) | `15` | ≥0 |
| `SAFE_MODE` | Enable simulation mode | `true` | true/false |

## Usage

The plugin provides four main actions that users can trigger through natural language:

### 1. Start Bot
**Commands:** "Start the ETH updown bot", "Begin switching on Base"
- Initializes and starts the trading bot
- Begins price monitoring and trade execution
- Shows configuration summary

### 2. Stop Bot
**Commands:** "Stop the bot", "Halt updown bot"
- Stops the trading bot
- Displays final statistics
- Preserves state for future restart

### 3. Check Status
**Commands:** "Status?", "Show last high and low"
- Shows current bot status (running/stopped)
- Displays price levels, statistics, and configuration
- Shows cooldown status

### 4. Configure Parameters
**Commands:** 
- "Set trade percent to 0.3"
- "Turn safe mode off"
- "Set break buffer to 15 bps"
- "Cooldown 30 seconds"

## Trading Logic

### Bootstrap Phase
When first started, the bot sets both `lastHigh` and `lastLow` to the current ETH/USDC price.

### Trading Conditions

#### Buy ETH (Upward Breakout)
- **Trigger**: Current price > `lastHigh * (1 + BREAK_BUFFER_BPS/10000)`
- **Condition**: Bot must be in USDC mode
- **Action**: Swap `TRADE_PCT` of USDC balance for ETH
- **Result**: Set `lastLow = currentPrice`, `mode = ETH`, start cooldown

#### Sell ETH (Downward Breakout)
- **Trigger**: Current price < `lastLow * (1 - BREAK_BUFFER_BPS/10000)`
- **Condition**: Bot must be in ETH mode
- **Action**: Swap `TRADE_PCT` of ETH balance for USDC
- **Result**: Set `lastHigh = currentPrice`, `mode = USDC`, start cooldown

### Safety Features

1. **Cooldown Period**: Prevents rapid trading after each transaction
2. **Minimum Trade Size**: Skips trades below `MIN_TRADE_USD`
3. **Gas Reserve**: Keeps ETH for transaction fees
4. **Price Stability Check**: Validates price movements aren't excessive
5. **Safe Mode**: Simulates trades without actual execution
6. **Slippage Protection**: Limits maximum acceptable slippage

## State Management

The bot maintains persistent state:

```typescript
{
  lastHigh: number | null,      // Highest price level
  lastLow: number | null,       // Lowest price level  
  mode: "ETH" | "USDC",        // Current position mode
  cooldownUntil: number | null, // Cooldown expiration timestamp
  stats: {
    trades: number,             // Total completed trades
    pnlUSDC: number            // Profit/loss in USDC
  },
  isRunning: boolean            // Bot execution status
}
```

## Testing

Run the test suite:
```bash
pnpm test
```

Run tests in watch mode:
```bash
pnpm test:watch
```

## Development

### Build
```bash
pnpm build
```

### Development mode (with auto-rebuild)
```bash
pnpm dev
```

### Lint
```bash
pnpm lint
```

## Architecture

### Core Components

- **`updownRunnerService`**: Main service handling price monitoring and trade execution
- **Actions**: User-facing commands (start, stop, status, configure)
- **Utils**: Price fetching, trading execution, configuration management
- **Types**: TypeScript interfaces and type definitions

### External Dependencies

- **Uniswap V3**: Price feeds and swap execution
- **Base Chain**: Target blockchain for operations
- **Ethers.js**: Blockchain interactions
- **Node-cron**: Scheduled price polling

## Security Considerations

1. **Private Key Protection**: Never log or expose private keys
2. **Safe Mode Default**: Always start with `SAFE_MODE=true` for testing
3. **Slippage Limits**: Configure appropriate slippage tolerance
4. **Gas Management**: Maintain ETH balance for transaction fees
5. **Price Validation**: Implement price stability checks

## Troubleshooting

### Common Issues

1. **"Environment validation failed"**
   - Check all required environment variables are set
   - Verify API keys and RPC URL are valid

2. **"Price instability detected"**
   - Large price movements trigger safety pause
   - Bot will resume when price stabilizes

3. **"Insufficient balance"**
   - Ensure wallet has ETH for gas and tokens for trading
   - Check minimum trade size settings

4. **"Swap failed"**
   - Check slippage tolerance
   - Verify token approvals
   - Ensure sufficient gas

### Debugging

Enable debug logging by setting the appropriate log level in your Senpi configuration.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

This project is licensed under the MIT License - see the main repository LICENSE file for details.

## Disclaimer

This software is for educational and experimental purposes. Trading cryptocurrencies involves substantial risk of loss. Users are responsible for their own trading decisions and should never risk more than they can afford to lose. Always test with small amounts and in safe mode before live trading.
