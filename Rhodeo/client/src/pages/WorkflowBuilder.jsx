import { useCallback, useMemo, useState } from 'react';
import { ReactFlow, Background, Controls, MiniMap, addEdge, useEdgesState, useNodesState } from '@xyflow/react';
import '@xyflow/react/dist/style.css';

const initialNodes = [
  { id: 'prompt', position: { x: 30, y: 100 }, data: { label: 'Prompt OS\nPrepare prompt' }, style: { whiteSpace: 'pre-line', borderRadius: 12, padding: 14, width: 160 } },
  { id: 'identity', position: { x: 260, y: 20 }, data: { label: 'Identity Lock\nLoad references' }, style: { whiteSpace: 'pre-line', borderRadius: 12, padding: 14, width: 160 } },
  { id: 'generate', position: { x: 500, y: 100 }, data: { label: 'Image Generator\nComfyUI / A1111 / InvokeAI' }, style: { whiteSpace: 'pre-line', borderRadius: 12, padding: 14, width: 190 } },
  { id: 'check', position: { x: 760, y: 100 }, data: { label: 'Consistency Check\nScore and review' }, style: { whiteSpace: 'pre-line', borderRadius: 12, padding: 14, width: 170 } },
  { id: 'asset', position: { x: 1010, y: 100 }, data: { label: 'Asset Bank\nSave output' }, style: { whiteSpace: 'pre-line', borderRadius: 12, padding: 14, width: 150 } },
];
const initialEdges = [{ id: 'e1', source: 'prompt', target: 'generate', animated: true }, { id: 'e2', source: 'identity', target: 'generate', animated: true }, { id: 'e3', source: 'generate', target: 'check', animated: true }, { id: 'e4', source: 'check', target: 'asset', animated: true }];
export default function WorkflowBuilder() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes); const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges); const [name, setName] = useState('Identity-safe image pipeline');
  const onConnect = useCallback((connection) => setEdges((eds) => addEdge({ ...connection, animated: true }, eds)), [setEdges]);
  const exportJson = () => { const blob = new Blob([JSON.stringify({ name, nodes, edges }, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = 'creative-identity-workflow.json'; a.click(); URL.revokeObjectURL(url); };
  const reset = () => { setNodes(initialNodes); setEdges(initialEdges); };
  return <section className="page"><div className="page-head"><div><p className="eyebrow">VISUAL ORCHESTRATION</p><h1>Workflow Builder</h1><p className="muted">Arrange and connect pipeline steps. This editor exports a workflow design; it does not execute arbitrary nodes yet.</p></div></div><div className="workflow-toolbar"><input value={name} onChange={e => setName(e.target.value)} aria-label="Workflow name"/><button className="button" onClick={exportJson}>Export JSON</button><button className="button secondary" onClick={reset}>Reset example</button></div><div className="workflow-canvas"><ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} fitView><Background /><MiniMap /><Controls /></ReactFlow></div><p className="muted small">Tip: drag nodes, connect handles, and export the layout. Actual execution is performed by the existing generation queue and provider integrations.</p></section>;
}
