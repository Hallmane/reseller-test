import React, { useState, useEffect } from "react";
import TreeContainer from "./TreeContainer";
import { fetchNode } from "../kimap/helpers";
import config from "../config.json";

const KimapExplorer: React.FC = () => {
  const [rootNode, setRootNode] = useState(null);

  // Import our.js from the host URL
  useEffect(() => {
    const script = document.createElement("script");
    script.src = window.location.origin + "/our.js";
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    fetchRootNode();
  }, []);

  const fetchRootNode = async () => {
    try {
      console.log('Fetching root node:', config.optimism.data.root_node);
      const data = await fetchNode(config.optimism.data.root_node);
      console.log('Received root node data:', data);
      setRootNode(data);
    } catch (error) {
      console.error("Error fetching root node:", error);
    }
  };

  return (
    <div className="explorer-container">
      {rootNode && <TreeContainer node={rootNode} />}
    </div>
  );
};

export default KimapExplorer;
