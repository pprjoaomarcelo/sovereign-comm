# JSON Canonicalization Scheme (JCS) - Signature Process

*Version: 1.0*

To ensure that no data is tampered with and to verify the origin of critical network objects like `service_order` and `batch_manifest`, the protocol relies on digital signatures.

The validity of a digital signature depends on every node generating the exact same byte-for-byte representation of the data to be signed. Any variation, even a single extra space, will produce a different hash, causing the signature verification to fail.

To solve this, SovereignComm mandates the use of the **JSON Canonicalization Scheme (JCS)**, as defined in **RFC 8785**.

## Signature Generation Process

All signing nodes (e.g., Ingestion Gateways, Batch Miners) **must** follow these steps:

1.  **Assemble Data:** The node assembles the complete JSON object, excluding the `signature` field itself.
2.  **Canonicalize:** The object is passed through a JCS library. This process sorts all keys alphabetically (recursively) and removes all insignificant whitespace, producing a compact, deterministic string.
3.  **Hash:** The resulting canonical string is hashed using **SHA-256**. This creates a unique, 32-byte fingerprint of the data.
4.  **Sign:** The node uses its private key to sign the SHA-256 hash, producing the digital signature.
5.  **Attach:** The final signature is added to the JSON object in the `signature` field.

Any node verifying the signature will perform the same steps (1-3) and use the public key of the signer to validate the signature against the generated hash.

## Implementation Example

A practical, fully-functional example of this entire process (key generation, canonicalization, hashing, signing, and verification) can be found in the `examples/jcs-signature-example.ts` script. This script serves as a reference implementation for any developer building a node for the SovereignComm network.