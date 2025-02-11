import { parseAbi } from "viem";

export const multicallAbi = parseAbi([
  `function aggregate(Call[] calls) external payable returns (uint256 blockNumber, bytes[] returnData)`,
  `struct Call { address target; bytes callData; }`,
]);

// old kimap abi, works in prod on optimism
export const kinomapAbi = parseAbi([
  "function mint(address, bytes calldata, bytes calldata, bytes calldata, address) external returns (address tba)",
  "function fact(bytes calldata,bytes calldata) external returns (bytes32)",
  "function note(bytes calldata,bytes calldata) external returns (bytes32)",
  "function get(bytes32 node) external view returns (address tokenBoundAccount, address tokenOwner, bytes memory note)",
]);

export const mechAbi = parseAbi([
  "function execute(address to, uint256 value, bytes calldata data, uint8 operation) returns (bytes memory returnData)",
]);
