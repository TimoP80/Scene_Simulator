/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { 
  SocialNode, 
  SocialEdge, 
  SocialEdgeType, 
  SocialNodeType 
} from "@packages/types";
import { 
  Users, 
  Share2, 
  Compass, 
  Zap, 
  Trophy, 
  Activity, 
  Award, 
  Wrench, 
  Search, 
  MessageSquare, 
  AlertCircle,
  Hash,
  Sparkles,
  RefreshCw,
  Sliders,
  HelpCircle
} from "lucide-react";

interface SocialGraphTabProps {
  nodes: SocialNode[];
  edges: SocialEdge[];
  storyLogs: string[];
  characters: any;
  playerHandle: string;
  playerGroupName: string;
  onInjectRumor: (sourceId: string, targetId: string, sentiment: "positive" | "negative") => void;
  onProposeJointCollab: (npcId: string) => void;
  onTriggerReputationDiffusion: () => void;
}

export default function SocialGraphTab({
  nodes,
  edges,
  storyLogs,
  characters,
  playerHandle,
  playerGroupName,
  onInjectRumor,
  onProposeJointCollab,
  onTriggerReputationDiffusion
}: SocialGraphTabProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>("player_group");
  const [nodeTypeFilter, setNodeTypeFilter] = useState<string>("all");
  const [edgeTypeFilter, setEdgeTypeFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [layoutMode, setLayoutMode] = useState<"schematic" | "concentric">("schematic");
  const [rumorSentiment, setRumorSentiment] = useState<"positive" | "negative">("negative");
  const [rumorTargetId, setRumorTargetId] = useState<string>("");
  const [actionsError, setActionsError] = useState<string | null>(null);
  const [actionsSuccess, setActionsSuccess] = useState<string | null>(null);

  // Filter nodes based on user query and categories
  const filteredNodes = nodes.filter((node) => {
    const matchesSearch = node.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (node.details && node.details.toLowerCase().includes(searchQuery.toLowerCase()));
    
    if (nodeTypeFilter === "all") return matchesSearch;
    return node.type === nodeTypeFilter && matchesSearch;
  });

  // Filter edges based on type filters and active nodes
  const filteredEdges = edges.filter((edge) => {
    const matchesType = edgeTypeFilter === "all" || edge.type === edgeTypeFilter;
    
    // Ensure both source and target exist in nodes
    const sourceExists = nodes.some(n => n.id === edge.source);
    const targetExists = nodes.some(n => n.id === edge.target);
    
    return matchesType && sourceExists && targetExists;
  });

  // Calculate coordinates for nodes dynamically to display them beautifully inside the SVG canvas
  // We provide two layout presets: "Schematic Grid" and "Concentric Orbits"
  const getNodeCoordinates = (node: SocialNode): { x: number; y: number } => {
    if (layoutMode === "schematic") {
      // Columns: Groups (left), NPCs (mid-left), Tools (middle), Demos (mid-right), Events (right)
      const columnSpacing = 160;
      const startX = 60;
      const startY = 50;
      
      let colIdx = 0;
      if (node.type === "group") colIdx = 0;
      else if (node.type === "npc") colIdx = 1;
      else if (node.type === "tool") colIdx = 2;
      else if (node.type === "demo") colIdx = 3;
      else if (node.type === "event") colIdx = 4;

      // Group nodes within columns
      const columnNodes = nodes.filter(n => n.type === node.type);
      const rowIdx = columnNodes.findIndex(n => n.id === node.id);
      const totalInCol = columnNodes.length;
      
      const x = startX + colIdx * columnSpacing;
      // Stagger vertical distribution based on total count to fill the height beautifully
      const gapY = totalInCol > 1 ? 380 / (totalInCol) : 190;
      const y = startY + rowIdx * gapY + (colIdx % 2 === 0 ? 15 : 0);
      
      return { x, y };
    } else {
      // Concentric Orbit Layout:
      // Center (Events) -> Inner orbit (Groups & Tools) -> Outer orbit (NPCs & Demos)
      const centerX = 380;
      const centerY = 240;
      
      if (node.id === "player_group" || node.id === "player") {
        return { x: centerX, y: centerY };
      }

      let radius = 220;
      let angleOffset = 0;
      
      if (node.type === "event") {
        radius = 70;
        angleOffset = 0.2;
      } else if (node.type === "group" || node.type === "tool") {
        radius = 150;
        angleOffset = 1.1;
      } else {
        radius = 240;
        angleOffset = 2.3;
      }

      const categoryNodes = nodes.filter(n => n.type === node.type && n.id !== "player_group" && n.id !== "player");
      const idx = categoryNodes.findIndex(n => n.id === node.id);
      const total = categoryNodes.length || 1;
      
      const angle = angleOffset + (idx / total) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      return { x, y };
    }
  };

  const selectedNodeObj = nodes.find(n => n.id === selectedNodeId);

  // Get active relationships for the selected node
  const nodeRelationships = edges.filter(
    e => e.source === selectedNodeId || e.target === selectedNodeId
  );

  // Custom action triggers with feedback timers
  const triggerRumor = () => {
    if (!selectedNodeId || !rumorTargetId) {
      setActionsError("You must select a source node and a target relationship to infect with gossip!");
      return;
    }
    onInjectRumor(selectedNodeId, rumorTargetId, rumorSentiment);
    setActionsSuccess(`Rumor system activated! Propagated ${rumorSentiment} gossip from ${selectedNodeId} targeting ${rumorTargetId}. Graph weights altered.`);
    setActionsError(null);
    setTimeout(() => setActionsSuccess(null), 5000);
  };

  const triggerCollab = () => {
    if (!selectedNodeId) return;
    const isNpc = nodes.some(n => n.id === selectedNodeId && n.type === "npc");
    if (!isNpc) {
      setActionsError("You can only propose professional co-releases and collaborations to NPCs directly.");
      return;
    }
    
    // Check if they are friendly enough
    const collabEdge = edges.find(
      e => (e.source === selectedNodeId && e.target === "player") || 
           (e.source === "player" && e.target === selectedNodeId) ||
           (e.source === selectedNodeId && e.target === "player_group") ||
           (e.source === "player_group" && e.target === selectedNodeId)
    );

    const friendlyEnough = collabEdge ? collabEdge.weight >= 50 : false;
    
    if (!friendlyEnough) {
      setActionsError(`Proposal rejected! Relationship weight is too low (${collabEdge ? collabEdge.weight : 0}%). Need at least 50% alliance friendship to form joint demos.`);
      return;
    }

    onProposeJointCollab(selectedNodeId);
    setActionsSuccess(`Collaboration signed! Established dynamic scene synergy contract with ${selectedNodeId}.`);
    setActionsError(null);
    setTimeout(() => setActionsSuccess(null), 5000);
  };

  const activeNodeCoords = nodes.map(node => ({
    id: node.id,
    type: node.type,
    label: node.label,
    ...getNodeCoordinates(node)
  }));

  // Get color for different node categories
  const getNodeColor = (type: SocialNodeType, isSelected: boolean) => {
    if (isSelected) return "fill-purple-500 stroke-purple-300";
    switch (type) {
      case "npc": return "fill-amber-600/90 stroke-amber-400";
      case "group": return "fill-cyan-600/90 stroke-cyan-400";
      case "tool": return "fill-emerald-600/90 stroke-emerald-400";
      case "demo": return "fill-indigo-600/90 stroke-indigo-400";
      case "event": return "fill-rose-600/90 stroke-rose-400";
      default: return "fill-zinc-650 stroke-zinc-500";
    }
  };

  const getEdgeStrokeColor = (type: SocialEdgeType) => {
    switch (type) {
      case "friendship": return "stroke-emerald-500/70";
      case "rivalry": return "stroke-rose-500/70";
      case "collaboration": return "stroke-cyan-500/70";
      case "influence": return "stroke-amber-400/60";
      case "inspiration": return "stroke-fuchsia-500/60";
      case "technical_dependency": return "stroke-indigo-400/60";
      default: return "stroke-slate-500/50";
    }
  };

  return (
    <div id="social-graph-dash" className="space-y-6 font-mono select-none">
      
      {/* High tech banner summary */}
      <div className="bg-gradient-to-r from-purple-950/40 via-zinc-900 to-indigo-950/40 border border-purple-900/60 rounded p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-md">
        <div className="space-y-1">
          <h2 className="text-yellow-400 text-sm font-black tracking-widest flex items-center gap-2">
            <Share2 className="w-4 h-4 text-purple-400 animate-spin" />
            <span>{"⊏ DEMOSCENE REAL-TIME SOCIAL GRAPH NETWORK ⊐"}</span>
          </h2>
          <p className="text-zinc-400 text-[11px] leading-relaxed max-w-[580px]">
            The dynamic scene runs on a continuous weighted relationship graph. Every BBS reply, demo compilation, rumor, and party outcome dynamically diffuses reputation, triggers group splits, and alters alliance variables.
          </p>
        </div>
        
        <div className="flex gap-2 shrink-0">
          <button
            onClick={onTriggerReputationDiffusion}
            className="bg-purple-950/80 border border-purple-500 text-purple-300 text-[10px] px-3 py-1.5 rounded font-bold hover:bg-purple-900 active:scale-95 transition cursor-pointer flex items-center gap-1 shadow-[0_0_8px_rgba(168,85,247,0.3)]"
          >
            <RefreshCw className="w-3 h-3 animate-spin" />
            <span>DIFFUSE GRAPH REP</span>
          </button>
        </div>
      </div>

      {/* Grid Controls Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Type selector */}
        <div className="bg-[#18181b] border border-zinc-800 p-2.5 rounded flex flex-col gap-1.5">
          <span className="text-amber-500 text-[9px] font-bold uppercase tracking-wider block border-b border-zinc-800 pb-0.5">NODE CATEGORY</span>
          <select
            value={nodeTypeFilter}
            onChange={(e) => setNodeTypeFilter(e.target.value)}
            className="bg-[#121214] border border-zinc-700 text-zinc-300 text-xs p-1.5 rounded focus:outline-none focus:border-amber-500 w-full"
          >
            <option value="all">[-] ALL CATEGORIES</option>
            <option value="npc">Sceners (NPCs)</option>
            <option value="group">Scene Groups</option>
            <option value="tool">Technical Tools</option>
            <option value="demo">Scene Demos</option>
            <option value="event">Parties & Incidents</option>
          </select>
        </div>

        {/* Edge Selector */}
        <div className="bg-[#18181b] border border-zinc-800 p-2.5 rounded flex flex-col gap-1.5">
          <span className="text-cyan-400 text-[9px] font-bold uppercase tracking-wider block border-b border-zinc-800 pb-0.5">RELATIONSHIP TYPE</span>
          <select
            value={edgeTypeFilter}
            onChange={(e) => setEdgeTypeFilter(e.target.value)}
            className="bg-[#121214] border border-zinc-700 text-zinc-300 text-xs p-1.5 rounded focus:outline-none focus:border-cyan-500 w-full"
          >
            <option value="all">[-] ALL RELATIONSHIPS</option>
            <option value="friendship">Friendships (Emerald)</option>
            <option value="rivalry">Rivalries (Rose)</option>
            <option value="collaboration">Collaborations (Cyan)</option>
            <option value="influence">Influences (Amber)</option>
            <option value="inspiration">Inspirations (Fuchsia)</option>
            <option value="technical_dependency">Dependencies (Indigo)</option>
          </select>
        </div>

        {/* Dynamic query search */}
        <div className="bg-[#18181b] border border-zinc-800 p-2.5 rounded flex flex-col gap-1.5">
          <span className="text-yellow-400 text-[9px] font-bold uppercase tracking-wider block border-b border-zinc-800 pb-0.5">SEARCH STRING</span>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Future Crew, assembler..."
              className="bg-[#121214] border border-zinc-700 text-zinc-300 text-xs p-1.5 pl-6 rounded focus:outline-none focus:border-yellow-500 w-full"
            />
            <Search className="w-3 h-3 text-zinc-500 absolute left-2 top-2.5" />
          </div>
        </div>

        {/* Console Presets selector */}
        <div className="bg-[#18181b] border border-zinc-800 p-2.5 rounded flex flex-col gap-1.5">
          <span className="text-purple-400 text-[9px] font-bold uppercase tracking-wider block border-b border-zinc-800 pb-0.5">SCHEMATIC PRESETS</span>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={() => setLayoutMode("schematic")}
              className={`p-1.5 text-[10px] font-bold rounded border uppercase ${
                layoutMode === "schematic"
                  ? "bg-purple-950/60 border-purple-500 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.2)]"
                  : "bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Grid View
            </button>
            <button
              onClick={() => setLayoutMode("concentric")}
              className={`p-1.5 text-[10px] font-bold rounded border uppercase ${
                layoutMode === "concentric"
                  ? "bg-purple-950/60 border-purple-500 text-purple-300 shadow-[0_0_6px_rgba(168,85,247,0.2)]"
                  : "bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              Orbit View
            </button>
          </div>
        </div>
      </div>

      {/* Main Graph Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Graph Console Map (Left) */}
        <div className="lg:col-span-8 bg-[#0e0a14] border border-[#a855f7]/20 rounded-lg p-3 relative shadow-inner overflow-hidden flex flex-col justify-between">
          
          <div className="absolute top-2 left-2 flex items-center gap-1.5 z-10">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
            <span className="text-[9px] text-[#a855f7] tracking-widest font-extrabold uppercase">SCHEMATIC MATRIX OVERVIEW</span>
          </div>

          <div className="absolute top-2 right-2 text-[8px] text-zinc-500">
            CLICK NODES TO TRACE PATHS | {filteredNodes.length} OF {nodes.length} SHOWN
          </div>

          {/* SVG canvas workspace */}
          <div className="w-full h-[410px] bg-[#0c0812]/90 rounded border border-zinc-900 flex items-center justify-center relative select-none">
            
            {/* Legend guide right inside map */}
            <div className="absolute bottom-2 left-2 flex flex-wrap gap-x-3 gap-y-1 bg-[#120e21] p-1.5 rounded border border-purple-950/60 text-[8px] max-w-[400px]">
              <div className="flex items-center gap-1 text-amber-400">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                <span>NPC</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400">
                <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full" />
                <span>CREW</span>
              </div>
              <div className="flex items-center gap-1 text-emerald-400">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                <span>TOOL</span>
              </div>
              <div className="flex items-center gap-1 text-indigo-400">
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                <span>DEMO</span>
              </div>
              <div className="flex items-center gap-1 text-rose-400">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full" />
                <span>EVENT</span>
              </div>
            </div>

            <svg className="w-full h-full" viewBox="0 0 760 410">
              
              {/* Draw concentric helper circles if orbit view selected */}
              {layoutMode === "concentric" && (
                <>
                  <circle cx="380" cy="240" r="70" className="fill-none stroke-purple-950/20 stroke-1 stroke-dasharray-[3_3]" />
                  <circle cx="380" cy="240" r="150" className="fill-none stroke-purple-950/30 stroke-1 stroke-dasharray-[4_4]" />
                  <circle cx="380" cy="240" r="240" className="fill-none stroke-purple-950/40 stroke-1 stroke-dasharray-[5_5]" />
                </>
              )}

              {/* Draw Edges */}
              {filteredEdges.map((edge) => {
                const sourceNode = activeNodeCoords.find(n => n.id === edge.source);
                const targetNode = activeNodeCoords.find(n => n.id === edge.target);
                
                if (!sourceNode || !targetNode) return null;

                const isTrace = sourceNode.id === selectedNodeId || targetNode.id === selectedNodeId;
                const isSelectedEdge = edge.source === selectedNodeId && edge.target === selectedNodeId;
                
                // Add animated dashes in paths of high weights
                const speed = 100 - edge.weight;
                const strokeWidth = isTrace ? 2 : 0.8;
                const isRival = edge.type === "rivalry";
                
                return (
                  <g key={edge.id}>
                    <line
                      x1={sourceNode.x}
                      y1={sourceNode.y}
                      x2={targetNode.x}
                      y2={targetNode.y}
                      className={`${getEdgeStrokeColor(edge.type)} transition-all duration-300`}
                      strokeWidth={strokeWidth}
                      strokeDasharray={isRival ? "3,3" : isTrace ? "5,2" : undefined}
                      opacity={isTrace ? 1.0 : 0.2}
                    />
                    {/* Tiny animated connection particle along the line */}
                    {isTrace && edge.weight > 40 && (
                      <circle r="2.2" className="fill-purple-400">
                        <animateMotion
                          path={`M ${sourceNode.x} ${sourceNode.y} L ${targetNode.x} ${targetNode.y}`}
                          dur={`${2 + (speed / 15)}s`}
                          repeatCount="indefinite"
                        />
                      </circle>
                    )}
                  </g>
                );
              })}

              {/* Draw Nodes */}
              {activeNodeCoords.map((coord) => {
                const isSelected = coord.id === selectedNodeId;
                const nodeOnScreen = filteredNodes.some(n => n.id === coord.id);
                if (!nodeOnScreen) return null;

                const rating = coord.type === "group" ? 14 : 9.5;
                const isPlayerNode = coord.id === "player" || coord.id === "player_group";

                return (
                  <g
                    key={coord.id}
                    transform={`translate(${coord.x}, ${coord.y})`}
                    className="cursor-pointer select-none"
                    onClick={() => {
                      setSelectedNodeId(coord.id);
                      // Clear forms targets
                      const neighbors = edges.filter(e => e.source === coord.id || e.target === coord.id);
                      if (neighbors.length > 0) {
                        const target = neighbors[0].source === coord.id ? neighbors[0].target : neighbors[0].source;
                        setRumorTargetId(target);
                      }
                    }}
                  >
                    {/* Outer glowing shield rings */}
                    <circle
                      r={rating + 4}
                      className={`fill-none transition-all duration-300 ${
                        isSelected 
                          ? "stroke-purple-500 opacity-80 stroke-[1.5px] animate-pulse" 
                          : "stroke-transparent"
                      }`}
                    />
                    
                    {/* Solid Node circle */}
                    <circle
                      r={rating}
                      className={`${getNodeColor(coord.type, isSelected)} transition-all duration-300 stroke-2`}
                    />

                    {/* Labeled handles */}
                    <text
                      y={rating + 11}
                      textAnchor="middle"
                      className={`font-mono text-[8.5px] tracking-tight font-black select-none ${
                        isSelected 
                          ? "fill-purple-300" 
                          : isPlayerNode
                            ? "fill-yellow-400"
                            : "fill-zinc-300"
                      }`}
                    >
                      {coord.label.toUpperCase()}
                    </text>
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Emergent Event Ticker feed underneath layout */}
          <div className="mt-4 bg-[#110c1a] border border-purple-950 rounded p-2.5">
            <span className="text-[#a855f7] text-[9.5px] font-black uppercase tracking-wider block border-b border-purple-950/60 pb-1 mb-2 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-purple-400 animate-pulse" />
              <span>DYNAMIC SCENE INCIDENTS CHRONICLER</span>
            </span>

            <div className="space-y-1 max-h-[110px] overflow-y-auto font-mono text-[9.5px] text-zinc-300 leading-normal pr-1 select-none">
              {storyLogs.length === 0 ? (
                <p className="text-zinc-600 italic">Reading graph channels...</p>
              ) : (
                storyLogs.map((log, index) => {
                  const isSplit = log.includes("[Group Splitting]");
                  const isAssoc = log.includes("[Group Association]");
                  const isCollab = log.includes("[Collaboration Synergy]");
                  const isDiff = log.includes("[Reputation Diffusion]");
                  const isTension = log.includes("[Competitive Tension]");
                  
                  let txtColor = "text-zinc-300";
                  if (isSplit) txtColor = "text-red-400 font-extrabold";
                  else if (isAssoc) txtColor = "text-emerald-400";
                  else if (isCollab) txtColor = "text-cyan-400";
                  else if (isDiff) txtColor = "text-amber-400";
                  else if (isTension) txtColor = "text-rose-400";

                  return (
                    <div key={index} className={`py-1 border-b border-purple-950/30 flex items-start gap-1 ${txtColor}`}>
                      <span className="text-purple-500 font-bold">●</span>
                      <p className="italic">{log}</p>
                    </div>
                  );
                })
              )}
            </div>
          </div>

        </div>

        {/* Selected Node Inspector panel (Right) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Node specifics */}
          <div className="bg-[#120e1a] border border-[#a855f7]/30 rounded-lg p-4 shadow-xl">
            {selectedNodeObj ? (
              <div className="space-y-4">
                
                {/* Node Label Header */}
                <div className="border-b border-[#a855f7]/20 pb-3">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 text-[8px] uppercase tracking-widest font-black block">SYS_NODE_METADATA</span>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-[#1d1430] text-purple-300 uppercase">
                      {selectedNodeObj.type}
                    </span>
                  </div>
                  <h3 className="text-[#facc15] font-black text-sm tracking-widest mt-1 block uppercase">
                    {selectedNodeObj.label}
                  </h3>
                  {selectedNodeObj.groupName && (
                    <span className="text-zinc-400 text-[9px] mt-0.5 block italic selection:bg-purple-900">
                      ASSOCIATION: {selectedNodeObj.groupName.toUpperCase()}
                    </span>
                  )}
                </div>

                {/* Node Details Description block */}
                <div className="bg-[#0b0712] p-2.5 rounded border border-purple-950/50 text-[10.5px] leading-relaxed text-zinc-300 select-text">
                  <span className="text-purple-400 font-bold block mb-1 text-[8.5px] uppercase">Node Description</span>
                  <p className="italic">"{selectedNodeObj.details || "No structural definition registered..."}"</p>
                </div>

                {/* Weighted active Edges list */}
                <div>
                  <span className="text-[#a855f7] font-bold text-[8.5px] tracking-wider uppercase block border-b border-purple-950 mb-1.5 pb-0.5">
                    NEIGHBOR CONNECTIONS ({nodeRelationships.length})
                  </span>

                  {nodeRelationships.length === 0 ? (
                    <p className="text-zinc-600 text-[9.5px] italic pl-1">Isolated node. No active edges mapped.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                      {nodeRelationships.map((edge) => {
                        const otherId = edge.source === selectedNodeId ? edge.target : edge.source;
                        const otherNode = nodes.find(n => n.id === otherId);
                        const label = otherNode ? otherNode.label : otherId;
                        const labelType = otherNode ? otherNode.type : "node";

                        return (
                          <div
                            key={edge.id}
                            onClick={() => setSelectedNodeId(otherId)}
                            className="bg-[#191226] border border-purple-950/40 p-2 rounded hover:border-purple-800 transition cursor-pointer text-[10px] flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-1">
                                <span className="font-extrabold text-zinc-200 uppercase">{label.toUpperCase()}</span>
                                <span className="text-[7.5px] text-zinc-500 uppercase">({labelType})</span>
                              </div>
                              <span className="text-purple-400 text-[8.5px] block capitalize italic mt-0.5 mt-1 block select-none">
                                {edge.type.replace("_", " ")}
                              </span>
                            </div>
                            <span className={`font-black text-xs px-1.5 py-0.5 rounded ${
                              edge.weight > 70 
                                ? "text-emerald-400 bg-emerald-950/40 border border-emerald-900/60" 
                                : edge.weight < 40 
                                  ? "text-rose-400 bg-rose-950/40 border border-rose-900/60" 
                                  : "text-cyan-400 bg-cyan-950/40 border border-cyan-900/60"
                            }`}>
                              {edge.weight}%
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Real-time Interaction Sandbox Form */}
                <div className="border-t border-[#a855f7]/20 pt-4 space-y-4">
                  <span className="text-yellow-400 font-extrabold text-[8.5px] tracking-wider uppercase block">
                    NEURAL GRID DIRECTIVES
                  </span>

                  {/* Feedback messages */}
                  {actionsError && (
                    <div className="bg-rose-950/40 border border-rose-700/60 text-rose-300 p-2 rounded text-[10px] leading-snug">
                      {actionsError}
                    </div>
                  )}
                  {actionsSuccess && (
                    <div className="bg-emerald-950/40 border border-emerald-700/60 text-emerald-300 p-2 rounded text-[10px] leading-snug">
                      {actionsSuccess}
                    </div>
                  )}

                  {/* Dynamic Action Controls */}
                  <div className="space-y-3 font-mono text-[10px]">
                    
                    {/* Action 1: Inject Gossip / Rumors */}
                    <div className="bg-[#0b0712] p-2.5 rounded border border-purple-950/50 space-y-2">
                      <span className="text-yellow-400 font-bold block text-[8px] uppercase">1. INJECT FORUM RUMORS / GOSSIP</span>
                      
                      <div className="space-y-1.5">
                        <label className="text-zinc-500 text-[8px] block">TARGET NEIGHBOR NODE:</label>
                        <select
                          value={rumorTargetId}
                          onChange={(e) => setRumorTargetId(e.target.value)}
                          className="bg-[#121214] border border-zinc-700 text-zinc-300 text-[10px] p-1 rounded focus:outline-none focus:border-yellow-500 w-full"
                        >
                          <option value="">[-] Select relationship target</option>
                          {nodeRelationships.map((e) => {
                            const otherId = e.source === selectedNodeId ? e.target : e.source;
                            return (
                              <option key={otherId} value={otherId}>
                                {otherId.replace("_", " ").toUpperCase()}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          onClick={() => {
                            setRumorSentiment("positive");
                            triggerRumor();
                          }}
                          className="bg-emerald-950 border border-emerald-600 text-emerald-300 hover:bg-emerald-900 active:scale-95 text-[9px] py-1 rounded font-bold uppercase transition"
                        >
                          Hype/Love (+Edge)
                        </button>
                        <button
                          onClick={() => {
                            setRumorSentiment("negative");
                            triggerRumor();
                          }}
                          className="bg-rose-950 border border-rose-600 text-rose-300 hover:bg-rose-900 active:scale-95 text-[9px] py-1 rounded font-bold uppercase transition"
                        >
                          Sabotage (-Edge)
                        </button>
                      </div>
                    </div>

                    {/* Action 2: Propose Joint Release */}
                    <div className="bg-[#0b0712] p-2.5 rounded border border-purple-950/50 space-y-2">
                      <span className="text-[#a855f7] font-bold block text-[8px] uppercase">2. PROPOSE JOINT RELEASE / ALLIANCE</span>
                      <p className="text-zinc-500 text-[9px] leading-relaxed select-none">
                        Attempt to sign a joint mega-demo release with the selected NPC. Requires at least 50% target friendship edge!
                      </p>
                      
                      <button
                        onClick={triggerCollab}
                        className="bg-purple-950/80 border border-purple-500 text-purple-300 hover:bg-purple-900 active:scale-95 font-bold uppercase text-[9.5px] py-1.5 w-full rounded transition flex justify-center items-center gap-1.5"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                        <span>PROPOSE SCE_JOINT JOIN COMPILATION</span>
                      </button>
                    </div>

                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-10 space-y-2 text-zinc-500">
                <AlertCircle className="w-7 h-7 text-zinc-600 mx-auto" />
                <p className="text-[10px] italic">No active node selected inside matrix analyzer...</p>
              </div>
            )}
          </div>

          {/* Quick FAQ / Mechanics guide */}
          <div className="bg-[#131316] border border-zinc-800 rounded-lg p-4 space-y-2 text-[10px] leading-relaxed text-zinc-400 select-text">
            <h4 className="text-amber-500 font-extrabold text-[9.5px] uppercase flex items-center gap-1 tracking-wider border-b border-zinc-800 pb-1 mb-2">
              <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>COGNITIVE SOCIAL LAWS INDEX</span>
            </h4>
            <ul className="space-y-1 text-[9.5px] list-disc list-inside">
              <li>Reputation spreads automatically across high weights.</li>
              <li>Growing rivalry/scandals splinters groups, ejecting members to freelance spaces.</li>
              <li>BBS reply choices directly update player's personal network weights.</li>
            </ul>
          </div>

        </div>
      </div>

    </div>
  );
}
