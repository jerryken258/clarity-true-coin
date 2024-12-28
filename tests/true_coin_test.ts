import {
  Clarinet,
  Tx,
  Chain,
  Account,
  types,
} from 'https://deno.land/x/clarinet@v1.0.0/index.ts';
import { assertEquals } from 'https://deno.land/std@0.90.0/testing/asserts.ts';

Clarinet.test({
  name: "Ensure basic token properties are set correctly",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('true-coin', 'get-name', [], deployer.address),
      Tx.contractCall('true-coin', 'get-symbol', [], deployer.address),
      Tx.contractCall('true-coin', 'get-decimals', [], deployer.address),
    ]);
    
    assertEquals(block.receipts[0].result.expectOk(), "TrueCoin");
    assertEquals(block.receipts[1].result.expectOk(), "TRUE");
    assertEquals(block.receipts[2].result.expectOk(), types.uint(8));
  },
});

Clarinet.test({
  name: "Test collateral deposit and minting",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Deposit collateral
    let block = chain.mineBlock([
      Tx.contractCall('true-coin', 'deposit-collateral', [], wallet1.address)
    ]);
    block.receipts[0].result.expectOk();
    
    // Mint tokens
    block = chain.mineBlock([
      Tx.contractCall('true-coin', 'mint', [types.uint(1000000000)], wallet1.address)
    ]);
    block.receipts[0].result.expectOk();
    
    // Check balance
    block = chain.mineBlock([
      Tx.contractCall('true-coin', 'get-balance', [types.principal(wallet1.address)], wallet1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(1000000000));
  },
});

Clarinet.test({
  name: "Test burning and collateral withdrawal",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    const wallet1 = accounts.get('wallet_1')!;
    
    // Setup: deposit and mint
    let block = chain.mineBlock([
      Tx.contractCall('true-coin', 'deposit-collateral', [], wallet1.address),
      Tx.contractCall('true-coin', 'mint', [types.uint(1000000000)], wallet1.address)
    ]);
    
    // Burn tokens
    block = chain.mineBlock([
      Tx.contractCall('true-coin', 'burn', [types.uint(500000000)], wallet1.address)
    ]);
    block.receipts[0].result.expectOk();
    
    // Check reduced balance
    block = chain.mineBlock([
      Tx.contractCall('true-coin', 'get-balance', [types.principal(wallet1.address)], wallet1.address)
    ]);
    assertEquals(block.receipts[0].result.expectOk(), types.uint(500000000));
  },
});

Clarinet.test({
  name: "Test oracle price updates",
  async fn(chain: Chain, accounts: Map<string, Account>) {
    const deployer = accounts.get('deployer')!;
    
    let block = chain.mineBlock([
      Tx.contractCall('true-coin', 'update-price', [types.uint(110000000)], deployer.address)
    ]);
    block.receipts[0].result.expectOk();
  },
});