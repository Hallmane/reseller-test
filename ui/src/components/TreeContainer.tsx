import React from "react";
import NodeElement from "./NodeElement";
import { Node } from "./NodeElement";

interface TreeContainerProps {
  node: Node;
}

const TreeContainer: React.FC<TreeContainerProps> = ({ node }) => {
  console.log('TreeContainer received node:', node); // Debug log
  
  if (!node || !node.child_names) {
    console.error('Invalid node data:', node);
    return <div>Error: Invalid node data</div>;
  }

  return (
    <div className="tree-container">
      {node.child_names.map((childName: string) => (
        <NodeElement
          key={childName}
          name={childName}
          resellerData={null}
          parentTba={null}
        />
      ))}
    </div>
  );
};

export default TreeContainer;
