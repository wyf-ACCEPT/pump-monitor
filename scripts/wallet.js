const { Keypair } = require('@solana/web3.js');
const fs = require('fs');

const BASE58_ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';

function base58Encode(buffer) {
  let num = BigInt('0x' + buffer.toString('hex'));
  let encoded = '';

  while (num > 0) {
    const remainder = num % 58n;
    encoded = BASE58_ALPHABET[Number(remainder)] + encoded;
    num = num / 58n;
  }

  for (let i = 0; i < buffer.length && buffer[i] === 0; i++) {
    encoded = BASE58_ALPHABET[0] + encoded;
  }

  return encoded;
}


function createNewWallet() {

  var wallet = { pubkey: '' }
  let counter = 0

  while (1) {
    const keypair = Keypair.generate();
    const wallet = {
      pubkey: keypair.publicKey.toString(),
      privateKey: Array.from(keypair.secretKey)
    };
    if (wallet.pubkey.toLowerCase().startsWith('pr')) {
      console.log('Wallet created:');
      console.log('Public Key:', wallet.pubkey);
      const privateKeyBase58 = base58Encode(Buffer.from(wallet.privateKey))
      console.log('Private Key (Base58):', privateKeyBase58);
      break
    }
    counter += 1
    if (counter % 1000 === 0) {
      console.log(`${counter} wallets created`)
    }
  }

}

createNewWallet();
