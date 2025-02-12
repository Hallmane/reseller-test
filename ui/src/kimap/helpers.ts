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
  console.log('Received response:', data);  // Debug log
  
  if (data && typeof data === 'object') {
    if ('Node' in data) {
      return data.Node;
    } else if ('Text' in data) {
      throw new Error(data.Text);
    } else {
      // If we got a direct node object (with expected properties)
      if ('name' in data && 'parent_path' in data && 'child_names' in data) {
        return data;
      }
    }
  }
  
  throw new Error('Unexpected response format');
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

  const data = await response.json();
  console.log('Received response:', data);
  if ('Text' in data) {
    try {
      return JSON.parse(data.Text);
    } catch (e) {
      throw new Error(data.Text);
    }
  } else {
    throw new Error('Unexpected response format: ' + JSON.stringify(data));
  }
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
