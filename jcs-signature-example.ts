import { canonicalize } from 'jcs';
import { createHash } from 'crypto';
import { getPublicKey, sign, verify, utils } from '@noble/secp256k1';

/**
 * This script demonstrates the complete flow of creating and verifying a digital
 * signature over a JSON object, using the JSON Canonicalization Scheme (JCS - RFC 8785).
 */

// =============================================================================
// 1. KEY GENERATION (Simulating a network participant)
// =============================================================================

// Generates a random 32-byte private key.
// In a real application, this would come from a wallet.
const privateKey = utils.randomPrivateKey();

// Derives the corresponding public key (33-byte compressed format).
const publicKey = getPublicKey(privateKey, true);

console.log('🔑 Private Key (Hex):', Buffer.from(privateKey).toString('hex'));
console.log('🔑 Public Key (Hex):', Buffer.from(publicKey).toString('hex'));
console.log('---');

// =============================================================================
// 2. DATA PREPARATION
// =============================================================================

// Original JSON object, in a non-canonical (non-alphabetical) order.
const serviceOrder = {
  gateway_pubkey: '02abcdef...',
  fee_total: 150,
  protocol_version: '0.1',
  cid: 'bafybeigdyrzt5sfp7udm7hu76uh7y26...',
  timestamp: 1760361600,
  gateway_ln_address: 'gateway@example.com',
};

console.log('📄 Original JSON Object (in memory):\n', serviceOrder);
console.log('---');

// =============================================================================
// 3. SIGNATURE PROCESS (What the Gateway would do)
// =============================================================================

async function createJcsSignature(data: object, privKey: Uint8Array): Promise<{ signature: Uint8Array; canonicalString: string }> {
  // Step 1: Canonicalize the JSON object into a deterministic string.
  const canonicalString = canonicalize(data);

  // Step 2: Generate the SHA-256 hash of the canonical string.
  const hash = createHash('sha256').update(canonicalString).digest();

  // Step 3: Sign the hash with the private key.
  // The signature is generated in DER format by default.
  const signature = await sign(hash, privKey);

  return { signature, canonicalString };
}

// =============================================================================
// 4. VERIFICATION PROCESS (What a Client or other Node would do)
// =============================================================================

async function verifyJcsSignature(
  data: object,
  signature: Uint8Array,
  pubKey: Uint8Array
): Promise<boolean> {
  // Step 1: The verifier MUST re-canonicalize the data object.
  const canonicalString = canonicalize(data);

  // Step 2: The verifier MUST generate the same SHA-256 hash.
  const hash = createHash('sha256').update(canonicalString).digest();

  // Step 3: Verify if the signature matches the hash and the public key.
  return verify(signature, hash, pubKey);
}

// =============================================================================
// 5. EXECUTION AND DEMONSTRATION
// =============================================================================

async function main() {
  // --- Success Case ---
  console.log('🖋️  Starting signature process...');
  const { signature, canonicalString } = await createJcsSignature(serviceOrder, privateKey);

  console.log('📜 Canonical String (JCS) generated for hashing:\n', canonicalString);
  console.log('✍️  DER Signature (Hex):\n', Buffer.from(signature).toString('hex'));
  console.log('---');

  console.log('🔍 Starting verification process...');
  const isSignatureValid = await verifyJcsSignature(serviceOrder, signature, publicKey);
  console.log('✅ Is the signature valid?', isSignatureValid);
  console.log('---');

  // --- Failure Case (with tampered data) ---
  console.log('💣 Testing verification with tampered data...');
  const tamperedServiceOrder = {
    ...serviceOrder,
    fee_total: 200, // Changing a value
  };

  const isTamperedSignatureValid = await verifyJcsSignature(
    tamperedServiceOrder,
    signature, // Using the original signature
    publicKey
  );
  console.log('❌ Is the signature valid for the tampered data?', isTamperedSignatureValid);
}

main().catch(console.error);