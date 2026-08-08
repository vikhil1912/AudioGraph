import { useEffect, useState, useMemo } from 'react';
import { 
  ReactFlow, 
  Background, 
  Controls, 
  MiniMap,
  useNodesState,
  useEdgesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { forceSimulation, forceLink, forceManyBody, forceCenter, forceCollide, forceX, forceY } from 'd3-force';
import EntityNode from './EntityNode';

const nodeTypes = {
  entity: EntityNode,
};

export default function GraphVisualization({ graphData, chatId }) {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isCalculated, setIsCalculated] = useState(false);

  useEffect(() => {
    if (!graphData || !graphData.nodes || !graphData.links) return;

    // Create d3 nodes from data
    const d3Nodes = graphData.nodes.map(n => ({
      ...n,
      x: 0,
      y: 0,
    }));

    // Create d3 links
    const d3Links = graphData.links.map(l => ({ ...l }));

    // Setup simulation with tighter constraints to keep the graph compact
    const simulation = forceSimulation(d3Nodes)
      .force("link", forceLink(d3Links).id(d => d.id).distance(80))
      .force("charge", forceManyBody().strength(-150))
      .force("center", forceCenter(0, 0))
      .force("x", forceX(0).strength(0.08))
      .force("y", forceY(0).strength(0.08))
      .force("collide", forceCollide().radius(35));

    // Fast-forward simulation to get static positions
    simulation.tick(300);
    simulation.stop();

    // Load saved positions
    const savedStr = localStorage.getItem(`graph-positions-${chatId}`);
    let savedPositions = {};
    if (savedStr) {
      try { savedPositions = JSON.parse(savedStr); } catch(e) {}
    }

    // Map d3 nodes to React Flow nodes
    const initialNodes = d3Nodes.map(n => ({
      id: n.id,
      type: 'entity',
      position: savedPositions[n.id] || { x: n.x, y: n.y },
      data: { 
        label: n.label, 
        group: n.group, 
        description: n.description, 
        id: n.id 
      },
    }));

    // Map links to React Flow edges
    const initialEdges = graphData.links.map((l, idx) => ({
      id: `e-${idx}`,
      source: l.source,
      target: l.target,
      label: l.label,
      animated: true,
      style: { stroke: 'rgba(155, 138, 168, 0.5)', strokeWidth: 1.5 },
      labelStyle: { fill: '#ececec', fontWeight: 500 },
      labelBgStyle: { fill: '#212121', fillOpacity: 0.9, stroke: '#303030', strokeWidth: 1 },
      labelBgPadding: [4, 4],
      labelBgBorderRadius: 4,
    }));

    setNodes(initialNodes);
    setEdges(initialEdges);
    setIsCalculated(true);
  }, [graphData, setNodes, setEdges]);

  if (!isCalculated) {
    return (
      <div className="w-full h-full min-h-[500px] bg-base rounded-xl flex items-center justify-center text-text-muted">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-accent-from/30 border-t-accent-from rounded-full animate-spin" />
          <p>Calculating graph layout...</p>
        </div>
      </div>
    );
  }

  const handleNodeDragStop = (event, node) => {
    const savedStr = localStorage.getItem(`graph-positions-${chatId}`);
    let saved = {};
    if (savedStr) {
      try { saved = JSON.parse(savedStr); } catch(e) {}
    }
    saved[node.id] = node.position;
    localStorage.setItem(`graph-positions-${chatId}`, JSON.stringify(saved));
  };

  return (
    <div className="w-full h-full min-h-[500px] bg-base rounded-xl relative overflow-hidden border border-border-subtle">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={4}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#303030" gap={16} size={1} />
        <Controls 
          className="bg-card border-border-subtle fill-text-primary"
          showInteractive={false}
        />
        <MiniMap 
          nodeColor={(n) => '#a855f7'}
          maskColor="rgba(0, 0, 0, 0.7)"
          className="bg-card border border-border-subtle rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
