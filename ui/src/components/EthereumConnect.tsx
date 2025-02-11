const EthereumConnect = () => {
  return (
    <div>
      {window.ethereum ? (
        <>
          <div>Connected Address: {window.ethereum.selectedAddress}</div>

          {window.ethereum.chainId !== "0xa" && (
            <div>Please connect to Optimism.</div>
          )}

          <div>
            Current chain:{" "}
            {window.ethereum.chainId === "0x1"
              ? "Mainnet"
              : window.ethereum.chainId === "0x5"
              ? "Goerli"
              : window.ethereum.chainId === "0xaa36a7"
              ? "Sepolia"
              : window.ethereum.chainId === "0xa"
              ? "Optimism"
              : window.ethereum.chainId === "0x45"
              ? "Optimism Goerli"
              : window.ethereum.chainId}
          </div>
        </>
      ) : (
        <div>Metamask not connected.</div>
      )}
    </div>
  );
};

export default EthereumConnect;
