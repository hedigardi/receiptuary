export async function calculateFileHash(file: File): Promise<`0x${string}`> {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return `0x${hashHex}`;
}

export function truncateHash(hash: string, size = 8): string {
  if (hash.length <= size * 2) {
    return hash;
  }

  return `${hash.slice(0, size + 2)}...${hash.slice(-size)}`;
}
