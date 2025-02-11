import React, { useState, useEffect } from "react";
import { useWriteContract } from "wagmi";
import { fetchNodeInfo, namehash } from "../kimap/helpers";
import { kinomapAbi } from "../kimap/abis";
import ApiRegistryAbi from "../abi/ApiRegistry.json";
import { http, createPublicClient } from "viem";
import { Info } from "./NodeElement";
import { readContract } from "viem/actions";
import config from "../config.json";
import ResellerAbi from "../abi/Reseller.json";
import { encodePacked, stringToHex } from "viem";
import { optimism } from "viem/chains";

interface InfoContainerProps {
  name: string;
  refetchNode: () => void;
  info: Info | null;
  setInfo: (info: Info | null) => void;
  openConnectModal: (() => void) | undefined;
  addRecentTransaction: (any: any) => void;
  address: string | undefined;
}

const InfoContainer: React.FC<InfoContainerProps> = ({
  name,
  refetchNode,
  info,
  setInfo,
  openConnectModal,
  addRecentTransaction,
  address,
}) => {
  const [resellerName, setResellerName] = useState("");
  const [apiName, setApiName] = useState("~");
  const [apiSpec, setApiSpec] = useState("");

  const client = createPublicClient({
    chain: optimism,
    transport: http(import.meta.env.VITE_OPTIMISM_RPC_URL),
  }) as any;

  const {
    writeContract: registerAsReseller,
    isPending: registerAsResellerPending,
  } = useWriteContract({
    mutation: {
      onSuccess: (tx_hash) => {
        console.log("register success", tx_hash);
        addRecentTransaction({
          hash: tx_hash,
          description: `registered as reseller`,
        });
      },
      onError: (error) => {
        console.log(error);
        alert(error.message);
      },
      onSettled: () => {
        console.log("register settled");
        setTimeout(() => {
          refetchNode();
        }, 3500);
      },
    },
  });

  const handleRegisterAsReseller = async () => {
    try {
      if (!address) {
        openConnectModal?.();
        return;
      }

      console.log("address", address);
      console.log("info", info);

      if (!info?.tba) {
        console.error("No TBA address available");
        alert("Error: No TBA address available");
        return;
      }

      if (!(window as any).our?.node) {
        console.error("No node name available");
        alert("Error: No node name available");
        return;
      }

      if (!resellerName) {
        alert("Please enter a reseller name");
        return;
      }

      // Read owner using provided chain and a dummy account
      const [, owner] = await readContract(client, {
        abi: kinomapAbi,
        functionName: "get",
        address: config.optimism.contracts.kimap as `0x${string}`,
        args: [namehash((window as any).our?.node)],
      });

      if (address !== owner) {
        alert("You don't own this node");
        return;
      }

      registerAsReseller({
        chain: optimism,
        account: { address: address!, type: "json-rpc" },
        address: info.tba as `0x${string}`,
        abi: ApiRegistryAbi.abi,
        functionName: "registerAsReseller",
        args: [resellerName, (window as any).our?.node],
      });
    } catch (error) {
      console.error("Error registering as reseller:", error);
      alert(`Error registering as reseller: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const { writeContract: addApiSpec, isPending: addApiSpecPending } =
    useWriteContract({
      mutation: {
        onSuccess: (tx_hash) => {
          console.log("set api spec success", tx_hash);
          addRecentTransaction({
            hash: tx_hash,
            description: `set api spec`,
          });
        },
        onError: (error) => {
          console.log(error);
          alert(error.message);
        },
        onSettled: () => {
          console.log("set api spec settled");
          setTimeout(() => {
            refetchNode();
          }, 3500);
        },
      },
    });

  const handleAddApiSpec = async () => {
    if (!address) {
      openConnectModal?.();
      return;
    }
    // if address doesnt own our node, stop
    const [, owner] = await readContract(client, {
      abi: kinomapAbi,
      functionName: "get",
      address: config.optimism.contracts.kimap as `0x${string}`,
      args: [namehash(name)],
    });
    console.log("owner", owner);
    if (address !== owner) {
      console.error("address doesn't own our node");
      return;
    }
    // Convert apiSpecInput to bytes format required by the contract
    console.log("apiSpecInput", apiName);

    // Assert that apiSpecInput must start with a tilde
    if (!apiName.startsWith("~")) {
      alert("apiSpecInput must start with a tilde (~).");
      return;
    }

    if (!info) return;

    // Parse info if it's a byte array
    let parsedInfo = info;
    if (Array.isArray(info)) {
      const decoded = String.fromCharCode(...info);
      parsedInfo = JSON.parse(decoded);
    }

    addApiSpec({
      chain: optimism,
      account: address as `0x${string}`,
      address: parsedInfo.tba as `0x${string}`,
      abi: ResellerAbi.abi,
      functionName: "addApiSpec",
      args: [apiName, encodePacked(["bytes"], [stringToHex(apiSpec)])],
    });
  };

  useEffect(() => {
    fetchInfo();
  }, [name]);

  const fetchInfo = async () => {
    try {
      const data = await fetchNodeInfo(name);
      // If data is a byte array, decode it
      if (Array.isArray(data)) {
        const decoded = String.fromCharCode(...data);
        setInfo(JSON.parse(decoded));
      } else {
        setInfo(data);
      }
    } catch (error) {
      console.error("Error fetching node info:", error);
    }
  };

  if (!info) return null;

  const isOwner = address && info.owner && 
    info.owner.toLowerCase() === address.toLowerCase();

  return (
    <div>
      <div>
        Owner: {info.owner}
        {isOwner && <span className="owner-tag">(you)</span>}
      </div>
      <div>TBA: {info.tba}</div>
      {info.data_hex && <div>Data Hex: {info.data_hex}</div>}
      <div className="note-input-container">
        {name.split(".").length === 3 && (
          <div className="note-input-subcontainer">
            <input
              type="text"
              placeholder="value"
              value={resellerName}
              onChange={(e) => setResellerName(e.target.value)}
              className="note-input"
            />
            <button
              onClick={handleRegisterAsReseller}
              className={`add-note-button ${
                registerAsResellerPending ? "loading" : ""
              }`}
              disabled={registerAsResellerPending}
            >
              Register As
            </button>
          </div>
        )}
        {name.split(".").length === 4 && (
          <div className="note-input-subcontainer">
            <input
              type="text"
              placeholder="value"
              value={apiName}
              onChange={(e) => setApiName(e.target.value)}
              className="note-input"
            />
            <input
              type="text"
              placeholder="value"
              value={apiSpec}
              onChange={(e) => setApiSpec(e.target.value)}
              className="note-input"
            />
            <button
              onClick={handleAddApiSpec}
              className={`add-note-button ${
                addApiSpecPending ? "loading" : ""
              }`}
              disabled={addApiSpecPending}
            >
              Add Api Spec
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default InfoContainer;


//import React, { useState, useEffect } from "react";
//import { useWriteContract } from "wagmi";
//import { fetchNodeInfo } from "../kimap/helpers";
//import { kinomapAbi } from "../kimap/abis";
//import ApiRegistryAbi from "../abi/ApiRegistry.json";
//import { http, createPublicClient } from "viem";
//import { Info } from "./NodeElement";
//import { namehash } from "../kimap/helpers";
//import { readContract } from "viem/actions";
//import config from "../config.json";
//import ResellerAbi from "../abi/Reseller.json";
//import { encodePacked, stringToHex } from "viem";
//import { optimism } from "wagmi/chains";
//
//interface InfoContainerProps {
//  name: string;
//  refetchNode: () => void;
//  info: Info | null;
//  setInfo: (info: Info | null) => void;
//  openConnectModal: (() => void) | undefined;
//  addRecentTransaction: (any: any) => void;
//  address: string | undefined;
//}
//
//const InfoContainer: React.FC<InfoContainerProps> = ({
//  name,
//  refetchNode,
//  info,
//  setInfo,
//  openConnectModal,
//  addRecentTransaction,
//  address,
//}) => {
//  const [resellerName, setResellerName] = useState("");
//  const [apiName, setApiName] = useState("~");
//  const [apiSpec, setApiSpec] = useState("");
//
//  const client = createPublicClient({
//    chain: optimism,
//    transport: http(import.meta.env.VITE_OPTIMISM_RPC_URL),
//  });
//
//  const {
//    writeContract: registerAsReseller,
//    isPending: registerAsResellerPending,
//  } = useWriteContract({
//    mutation: {
//      onSuccess: (tx_hash) => {
//        console.log("register success");
//        console.log(tx_hash);
//        addRecentTransaction({
//          hash: tx_hash,
//          description: `registered as reseller`,
//        });
//      },
//      onError: (error) => {
//        console.log(error);
//        alert(error.message);
//      },
//      onSettled: () => {
//        console.log("register settled");
//        setTimeout(() => {
//          refetchNode();
//        }, 3500);
//      },
//    },
//  });
//
//  const handleRegisterAsReseller = async () => {
//    if (!address) {
//      openConnectModal?.();
//      return;
//    }
//
//    // if address doesnt own our node, stop
//    const [, owner] = await readContract(client, {
//      abi: kinomapAbi,
//      functionName: "get",
//      address: config.optimism.contracts.kimap as `0x${string}`,
//      args: [namehash((window as any).our?.node)],
//    });
//    console.log("owner", owner);
//    if (address !== owner) {
//      console.error("address doesnt own our node");
//      return;
//    }
//
//    if (!info) return;
//    registerAsReseller({
//      address: info.tba as `0x${string}`,
//      abi: ApiRegistryAbi.abi,
//      functionName: "registerAsReseller",
//      args: [resellerName, (window as any).our?.node],
//    });
//  };
//
//  const { writeContract: addApiSpec, isPending: addApiSpecPending } =
//    useWriteContract({
//      mutation: {
//        onSuccess: (tx_hash) => {
//          console.log("set api spec success");
//          console.log(tx_hash);
//          addRecentTransaction({
//            hash: tx_hash,
//            description: `set api spec`,
//          });
//        },
//        onError: (error) => {
//          console.log(error);
//          alert(error.message);
//        },
//        onSettled: () => {
//          console.log("set api spec settled");
//          setTimeout(() => {
//            refetchNode();
//          }, 3500);
//        },
//      },
//    });
//
//  const handleAddApiSpec = async () => {
//    if (!address) {
//      openConnectModal?.();
//      return;
//    }
//    // if address doesnt own our node, stop
//    const [, owner] = await readContract(client, {
//      abi: kinomapAbi,
//      functionName: "get",
//      address: config.optimism.contracts.kimap as `0x${string}`,
//      args: [namehash(name)],
//    });
//    console.log("owner", owner);
//    if (address !== owner) {
//      console.error("address doesn't own our node");
//      return;
//    }
//    // Convert apiSpecInput to bytes format required by the contract
//    console.log("apiSpecInput", apiName);
//
//    // Assert that apiSpecInput must start with a tilde
//    if (!apiName.startsWith("~")) {
//      alert("apiSpecInput must start with a tilde (~).");
//      return;
//    }
//
//    if (!info) return;
//
//    // @Hallman - here is where the api spec is inputted
//    addApiSpec({
//      address: info.tba as `0x${string}`,
//      abi: ResellerAbi.abi,
//      functionName: "addApiSpec",
//      args: [apiName, encodePacked(["bytes"], [stringToHex(apiSpec)])],
//    });
//  };
//
//  useEffect(() => {
//    fetchInfo();
//  }, [name]);
//
//  const fetchInfo = async () => {
//    try {
//      const data = await fetchNodeInfo(name);
//      setInfo(data);
//    } catch (error) {
//      console.error("Error fetching node info:", error);
//    }
//  };
//
//  if (!info) return null;
//
//  return (
//    <div>
//      <div>
//        Owner: {info.owner}
//        {info.owner.toLowerCase() === address?.toLowerCase() && (
//          <span className="owner-tag">(you)</span>
//        )}
//      </div>
//      <div>TBA: {info.tba}</div>
//      {info.data_hex && <div>Data Hex: {info.data_hex}</div>}
//      <div className="note-input-container">
//        {name.split(".").length === 3 && (
//          <div className="note-input-subcontainer">
//            <input
//              type="text"
//              placeholder="value"
//              value={resellerName}
//              onChange={(e) => setResellerName(e.target.value)}
//              className="note-input"
//            />
//            <button
//              onClick={handleRegisterAsReseller}
//              className={`add-note-button ${
//                registerAsResellerPending ? "loading" : ""
//              }`}
//              disabled={registerAsResellerPending}
//            >
//              Register As
//            </button>
//          </div>
//        )}
//        {name.split(".").length === 4 && (
//          <div className="note-input-subcontainer">
//            <input
//              type="text"
//              placeholder="value"
//              value={apiName}
//              onChange={(e) => setApiName(e.target.value)}
//              className="note-input"
//            />
//            <input
//              type="text"
//              placeholder="value"
//              value={apiSpec}
//              onChange={(e) => setApiSpec(e.target.value)}
//              className="note-input"
//            />
//            <button
//              onClick={handleAddApiSpec}
//              className={`add-note-button ${
//                addApiSpecPending ? "loading" : ""
//              }`}
//              disabled={addApiSpecPending}
//            >
//              Add Api Spec
//            </button>
//          </div>
//        )}
//      </div>
//    </div>
//  );
//};
//
//export default InfoContainer;
//