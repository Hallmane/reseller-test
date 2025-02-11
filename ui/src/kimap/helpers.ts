import { concat, keccak256, toBytes } from "viem";
import { Hex } from "viem";

const API_PATH = "/reseller-test:reseller-test:universal.os/api";

export async function fetchNode(name: string) {
  const requestBody = {
    GetNode: namehash(name),
  };
  console.log('Sending request with namehash:', requestBody);
  
  const response = await fetch(API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });
  
  const data = await response.json();
  
  // If we got a byte array, convert it to a string and parse it
  if (Array.isArray(data)) {
    console.log('Received byte array...');
    const text = String.fromCharCode(...data);
    try {
      // Check if the response contains an error message
      if (text.includes("Remote API")) {
        console.error('Server error:', text);
        throw new Error(text);
      }
      return JSON.parse(text);
    } catch (e) {
      console.error('Failed to parse response:', e);
      throw new Error(e instanceof Error ? e.message : 'Invalid response format');
    }
  }
  
  return data;
}

export async function fetchNodeInfo(name: string) {
  const response = await fetch(API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      GetTba: name,
    }),
  });
  return await response.json();
}

export function namehash(name: string): Hex {
  let node: Hex = ("0x" + "0".repeat(64)) as Hex; // Initialize node to 32 zero bytes

  if (name && name !== "") {
    const labels = name.split(".").reverse();

    for (const label of labels) {
      const labelHash = keccak256(toBytes(label));
      node = keccak256(concat([node, labelHash]));
    }
  }

  return node;
}
