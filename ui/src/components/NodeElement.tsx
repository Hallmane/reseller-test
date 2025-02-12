import React, { useState, useEffect } from "react";
import InfoContainer from "./InfoContainer";
import { fetchNode } from "../kimap/helpers";
import { useConnectModal } from "@rainbow-me/rainbowkit";
import { useAddRecentTransaction } from "@rainbow-me/rainbowkit";
import { DataKeyElement, DataKey } from "./DataKeyElement";
import { useAccount } from "wagmi";

interface NodeElementProps {
  name: string;
  resellerData: ResellerData | null;
  parentTba: `0x${string}` | null;
}

export interface Node {
  name: string;
  parent_path: string;
  child_names: string[];
  data_keys: Record<string, DataKey>;
}

export interface Info {
  owner: string;
  tba: string;
  data_hex: string;
}

export interface ResellerData {
  tba: string;
  node_name: string;
}

export const NodeElement: React.FC<NodeElementProps> = ({
  name,
  resellerData,
  parentTba,
}) => {
  const [info, setInfo] = useState<Info | null>(null);
  const [node, setNode] = useState<Node | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [infoVisible, setInfoVisible] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const isApiRegistry = name.split(".").length === 3;
  const [resellerList, setResellerList] = useState<string[] | null>(null);
  const [resellerDataMapping, setResellerDataMapping] = useState<Map<
    string,
    ResellerData
  > | null>(null);

  const { openConnectModal } = useConnectModal();
  const addRecentTransaction = useAddRecentTransaction();
  const { address } = useAccount();

  useEffect(() => {
    fetchNodeData();
  }, [name]);

  // NOTE: the commented code that follows is likely useful boilerplate for the future

  // useEffect(() => {
  //   if (domainList === null && info?.tba && isContest) {
  //     getDomainList();
  //   }
  // }, [info]);

  // const getDomainData = async () => {
  //   readContract(config, {
  //     address: info?.tba as `0x${string}`,
  //     abi: ContestAbi.abi,
  //     functionName: "getDomains",
  //     args: [domainList],
  //   }).then((output: any) => {
  //     const mapping = new Map<string, DomainData>();
  //     output.forEach((domainData: DomainData) => {
  //       const domain =
  //         domainData.encodedDomain + "." + node?.name + node?.parent_path;
  //       mapping.set(domain, domainData);
  //     });
  //     setDomainDataMapping(mapping);
  //   });
  // };

  // useEffect(() => {
  //   if (domainList) {
  //     getDomainData();
  //   }
  // }, [domainList]);

  // const getDomainList = async () => {
  //   if (domainList === null && info?.tba && isContest) {
  //     readContract(config, {
  //       address: info.tba as `0x${string}`,
  //       abi: ContestAbi.abi,
  //       functionName: "getDomainList",
  //     }).then((output: any) => {
  //       setDomainList(output);
  //     });
  //   }
  // };

  const fetchNodeData = async () => {
    try {
      const data = await fetchNode(name);
      setNode(data);
    } catch (error) {
      console.error("Error fetching node:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = () => setExpanded(!expanded);
  const toggleInfo = () => setInfoVisible(!infoVisible);

  // Show a minimal placeholder while loading
  if (loading && !node) {
    return (
      <div className="node" data-name={name}>
        <div className="node-header">
          <span className="node-name">Loading...</span>
        </div>
      </div>
    );
  }

  // After loading, if no node was found
  if (!node) return null;

  const hasChildren = node && (
    (node.child_names?.length > 0 || Object.keys(node?.data_keys || {}).length > 0)
  );

  return (
    <div className="node" data-name={name}>
      <div
        className="node-header"
        onClick={() => {
          toggleInfo();
          toggleExpanded();
        }}
      >
        {hasChildren ? (
          <span className={`arrow ${expanded ? "expanded" : ""}`}></span>
        ) : (
          <span className="arrow-hidden"></span>
        )}
        <span className="node-name">{node.name + node.parent_path}</span>
        <span className="node-info">
          ({node.child_names.length}{" "}
          {node.child_names.length === 1 ? "child" : "children"})
        </span>
        <button
          className="info-button"
          onClick={(e) => {
            e.stopPropagation();
            toggleInfo();
            toggleExpanded();
          }}
        >
          ℹ️
        </button>
      </div>
      {infoVisible && (
        <div className="info-container">
          <InfoContainer
            name={name}
            refetchNode={fetchNodeData}
            info={info}
            setInfo={setInfo}
            openConnectModal={openConnectModal}
            addRecentTransaction={addRecentTransaction}
            address={address}
          />
        </div>
      )}
      {expanded && hasChildren && (
        <div className="content">
          <div className="child-nodes">
            {node.child_names
              .slice(page * 50, (page + 1) * 50)
              .map((childName: string) => (
                <NodeElement
                  key={childName}
                  name={childName}
                  resellerData={resellerDataMapping?.get(childName) || null}
                  parentTba={info?.tba as `0x${string}`}
                />
              ))}
            {node.child_names.length > 50 && (
              <div className="pagination">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  Previous
                </button>
                <span style={{ padding: "0 10px" }}>
                  Page {page + 1} of {Math.ceil(node.child_names.length / 50)}
                </span>
                <button
                  onClick={() =>
                    setPage((p) =>
                      Math.min(
                        Math.ceil(node.child_names.length / 50) - 1,
                        p + 1
                      )
                    )
                  }
                  disabled={page >= Math.ceil(node.child_names.length / 50) - 1}
                >
                  Next
                </button>
              </div>
            )}
          </div>
          <div className="data-keys">
            {Object.entries(node.data_keys).map(([label, data_key]) => (
              <DataKeyElement
                key={label}
                dataKey={label}
                dataValue={data_key}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default NodeElement;
