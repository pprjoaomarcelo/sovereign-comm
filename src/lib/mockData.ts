export const mockMessages = [
  {
    id: "1",
    from: "bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh",
    timestamp: new Date(Date.now() - 7200000),
    content: "GM! 🚀 Just wanted to say hello from the Bitcoin network. Remember: Not your keys, not your coins!",
    network: "bitcoin" as const,
    txHash: "abc123def456ghi789jkl012mno345pqr678stu901vwx234yz567890abc",
    encrypted: false,
  }
];

export type NetworkType = "bitcoin" | "unknown";

export const detectNetwork = (address: string): NetworkType => {
  // Bitcoin: starts with 1, 3, or bc1
  if (address.match(/^(1|3|bc1)/)) {
    return "bitcoin";
  }
  return "unknown";
};
