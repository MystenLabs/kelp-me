# KELP Account Limitations & Account Abstraction Challenges on Sui

## Current State

KELP (Key-Loss Protection) provides a recovery mechanism for Sui accounts, but the current implementation faces significant limitations that prevent it from functioning as a true account abstraction solution.
These limitations stem from Sui's object-centric model where the `Kelp` object acts as a container rather than an autonomous account.

## Key Limitations

### Transaction Execution Constraints

- **Cannot self-sign transactions**: KELP accounts require an external account with the proper owner address to sign all transactions (`ctx.sender()` must match `kelp.owner`)
- **Cannot pay gas fees**: All operations require external gas sponsorship through services like Enoki, as the KELP object cannot directly consume its own SUI balance for gas
- **No direct system function access**: Cannot call native Sui functions directly; requires wrapper functions for every operation
- **Limited smart contract interaction**: Cannot pass owned objects (for example soul-bound NFTs) as references to other contracts without custom wrapper functions

### Asset Management Limitations

- **Manual claiming required**: When tokens are transferred to a KELP account, they must be explicitly claimed using `accept_payment()` or `accept_object()` functions rather than being automatically available
- **Restricted transfer capabilities**: Cannot directly transfer tokens to other addresses; requires calling specific withdrawal functions (`withdraw()`, `withdraw_all()`) with owner authentication
- **Complex object handling**: Stored objects require explicit retrieval through `get_object()` with proper ID tracking, making multi-step operations cumbersome

### Operational Restrictions

- **Owner-only operations**: All critical functions (`withdraw`, `get_object`, `add_guardian`) require `ctx.sender() == kelp.owner`, preventing delegation or programmable authorization
- **No batch operations**: Each operation requires a separate transaction, increasing gas costs and complexity for multi-step processes
- **Limited composability**: The `borrow_val`/`return_val` pattern with Promise objects adds complexity but still doesn't enable seamless interaction with external contracts

## Implications for Account Abstraction

These limitations prevent KELP from achieving true account abstraction. The account cannot operate autonomously, requires constant external coordination, and lacks the flexibility needed for complex DeFi interactions or automated operations. Addressing these issues would require fundamental changes to how Sui handles object ownership and transaction authorization.
