require('dotenv').config();
const base58 = require('bs58').default
const {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  TransactionInstruction
} = require("@solana/web3.js");
const { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress } = require('@solana/spl-token');

function createBuyInstructionData(amount, maxSolCost) {
  const data = Buffer.alloc(8 + 8 + 8); // 24 bytes total

  const discriminator = Buffer.from('66063d1201daebea', 'hex');
  discriminator.copy(data, 0);

  const amountBuf = Buffer.alloc(8);
  amountBuf.writeBigUInt64LE(BigInt(amount));
  amountBuf.copy(data, 8);

  const maxSolCostBuf = Buffer.alloc(8);
  maxSolCostBuf.writeBigUInt64LE(BigInt(maxSolCost));
  maxSolCostBuf.copy(data, 16);

  return data;
}

async function createBuyTransaction(mintAddress, amount, maxSolCost) {
  const connection = new Connection(process.env.SOLANA_RPC, "confirmed");
  const privateKeyBytes = Buffer.from(base58.decode(process.env.SOLANA_PRELAUNCH_KEY), 'hex');
  const senderKeypair = Keypair.fromSecretKey(privateKeyBytes);

  const mint = new PublicKey(mintAddress);
  const pumpProgramId = new PublicKey('6EF8rrecthR5Dkzon8Nwu78hRvfCKubJ14M5uBEwF6P');

  const ataAddress = await getAssociatedTokenAddress(
    mint,
    senderKeypair.publicKey
  );

  const createAtaIx = createAssociatedTokenAccountInstruction(
    senderKeypair.publicKey,    // payer
    ataAddress,                 // ata
    senderKeypair.publicKey,    // owner
    mint                        // mint
  );

  const buyAccounts = {
    global: new PublicKey('4wTV1YmiEkRvAtNtsSGPtUrqRYQMe5SKy2uB4Jjaxnjf'),
    feeRecipient: new PublicKey('CebN5WGQ4jvEPvsVU4EoHEpgzq1VV7AbicfhtW4xC9iM'),
    mint: mint,
    bondingCurve: new PublicKey('A8rkkhYPEfovmr466Jt59FuMgF44Dcrh4yVtYsrGBDsh'),
    associatedBondingCurve: new PublicKey('2vRpapDchQJ79MX5eBoB4E912yvYvPcUuC6Y22zPQtKL'),
    associatedUser: ataAddress,
    user: senderKeypair.publicKey,
    systemProgram: new PublicKey('11111111111111111111111111111111'),
    tokenProgram: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    rent: new PublicKey('SysvarRent111111111111111111111111111111111'),
    eventAuthority: new PublicKey('Ce6TQqeHC9p8KetsN6JsjHK7UTZk7nasjjnr7XxXp9F1'),
    program: pumpProgramId,
  };

  const buyData = createBuyInstructionData(amount, maxSolCost);

  const buyIx = new TransactionInstruction({
    keys: [
      { pubkey: buyAccounts.global, isSigner: false, isWritable: false },
      { pubkey: buyAccounts.feeRecipient, isSigner: false, isWritable: true },
      { pubkey: buyAccounts.mint, isSigner: false, isWritable: false },
      { pubkey: buyAccounts.bondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyAccounts.associatedBondingCurve, isSigner: false, isWritable: true },
      { pubkey: buyAccounts.associatedUser, isSigner: false, isWritable: true },
      { pubkey: buyAccounts.user, isSigner: true, isWritable: true },
      { pubkey: buyAccounts.systemProgram, isSigner: false, isWritable: false },
      { pubkey: buyAccounts.tokenProgram, isSigner: false, isWritable: false },
      { pubkey: buyAccounts.rent, isSigner: false, isWritable: false },
      { pubkey: buyAccounts.eventAuthority, isSigner: false, isWritable: false },
      { pubkey: buyAccounts.program, isSigner: false, isWritable: false },
    ],
    programId: pumpProgramId,
    data: buyData
  });

  const transaction = new Transaction().add(createAtaIx).add(buyIx);

  console.log(transaction)

  try {
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );
    console.log('Transaction completed. Signature:', signature);
    return signature;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

const mintAddress = "AdmyZDPbuDxHS2D5tEBv35RiqPe6ebRUmbWMSbzZpump";
const amount = 2_998944_845418n;  // 2,998,944.845418 tokens
const maxSolCost = 500_000000;   // 0.5 SOL

createBuyTransaction(
  mintAddress, 
  3_000000n, 
  1_000000n,
).catch(console.error);