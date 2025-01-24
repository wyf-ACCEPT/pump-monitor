const { AnchorProvider } = require('@coral-xyz/anchor');
const { default: NodeWallet } = require('@coral-xyz/anchor/dist/cjs/nodewallet');
const { Connection, PublicKey, Keypair, ParsedTransactionWithMeta } = require('@solana/web3.js');
const { PumpFunSDK } = require('pumpdotfun-sdk');

const base58 = require('bs58').default;
require('dotenv').config();

async function buyToken(tokenPubkey, solAmount, slippageBasePoint) {
  const privateKeyBytes = Buffer.from(base58.decode(process.env.SOLANA_PRELAUNCH_KEY), 'hex');
  const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);

  const connection = new Connection(process.env.SOLANA_RPC, "confirmed");
  const wallet = new NodeWallet(senderKeypair)
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' })

  const sdk = new PumpFunSDK(provider)

  const tx = await sdk.buy(
    senderKeypair,
    new PublicKey(tokenPubkey),
    solAmount,
    slippageBasePoint,
    { unitLimit: 100000, unitPrice: 3_000000 }
  )

  return tx
}

module.exports = {
  buyToken,
}