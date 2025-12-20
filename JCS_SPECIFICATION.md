# JSON Canonicalization Scheme (JCS) Specification

*Version:* 0.1

## 1. Overview

This document defines the mandatory standard for serializing JSON objects before they are submitted to a hash function for the creation of digital signatures. Consistency in serialization is *critical* for signature verification, as any variation in the output text (even a single whitespace) will result in a different hash and, consequently, a failure in signature verification.

The SovereignComm Project adopts the *JSON Canonicalization Scheme (JCS)* standard, as defined in **RFC 8785**.

## 2. Core Rules (Summary of RFC 8785)

All nodes that create or verify signatures *must* follow these rules when converting a JSON payload object into a byte string:

1.  **Text Encoding:** The JSON must be encoded in **UTF-8**.
2.  **Key Ordering:** Keys (property names) within a JSON object must be sorted lexicographically (in alphabetical order, by Unicode code point value). This sorting must be applied recursively for all nested objects.
3.  **Whitespace:** No "insignificant" whitespace is permitted. This means there should be no spaces or line breaks between JSON tokens (keys, values, commas, brackets, braces).
4.  **Number Representation:** Numbers must be represented in the most compact format possible (no leading zeros, no `.0` decimal part for integers). Very large or very small numbers must use exponential notation (e.g., `1.23e45`).
5.  **String Representation:** Special characters within strings must be escaped according to the JSON standard (e.g., `\"`, `\\`, `\n`). Unicode characters outside the basic ASCII set must be represented directly in UTF-8, not with `\uXXXX` escape sequences.

## 3. Practical Example

The following is an example of how a `service_order` payload is canonicalized.

### Original JSON Object (in memory)

Consider the following payload object in a non-ordered representation:

```json
{
  "gateway_pubkey": "02abcdef...",
  "fee_total": 150,
  "protocol_version": "0.1",
  "cid": "bafybeigdyrzt5sfp7udm7hu76uh7y26...",
  "gateway_ln_address": "gateway@example.com"
}
```

### Canonically Serialized String (JCS Output)

After applying the JCS rules, the resulting UTF-8 byte string, over which the SHA256 hash will be calculated, is:

```text
{"cid":"bafybeigdyrzt5sfp7udm7hu76uh7y26...","fee_total":150,"gateway_ln_address":"gateway@example.com","gateway_pubkey":"02abcdef...","protocol_version":"0.1"}
```

Note how the keys are now in alphabetical order (`cid`, `fee_total`, `gateway_ln_address`, `gateway_pubkey`, `protocol_version`) and all unnecessary whitespace has been removed.

## 4. Implementation

It is recommended to use existing and tested libraries that implement RFC 8785 to avoid subtle errors in manual implementation. The choice of library will depend on the programming language used for each node.