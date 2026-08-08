import { Handle, Position } from '@xyflow/react';

const GROUP_COLORS = {
  person: 'bg-accent-from',
  topic: 'bg-blue-500',
  decision: 'bg-green-400',
  task: 'bg-yellow-400',
  risk: 'bg-red-400',
  feature: 'bg-cyan-400',
  timeline: 'bg-orange-400',
  resource: 'bg-violet-400',
  organization: 'bg-pink-400',
  default: 'bg-[#9b8aa8]',
};

export default function EntityNode({ data }) {
  const group = data.group?.toLowerCase();
  const bgColorClass = GROUP_COLORS[group] || GROUP_COLORS.default;

  return (
    <div className="relative group flex flex-col items-center justify-center cursor-pointer">
      {/* Invisible Handles so edges can connect properly anywhere */}
      <Handle type="target" position={Position.Top} className="opacity-0" />
      
      {/* Node Circle */}
      <div 
        className={`w-10 h-10 rounded-full border-2 border-panel shadow-md transition-shadow group-hover:shadow-[0_0_15px_rgba(255,255,255,0.3)] ${bgColorClass}`}
      />
      
      {/* Node Label */}
      <div className="mt-1.5 text-center font-sans text-[11px] font-medium text-text-primary whitespace-nowrap bg-panel/80 px-1.5 py-0.5 rounded-md">
        {data.label || data.id}
      </div>

      <Handle type="source" position={Position.Bottom} className="opacity-0" />
      
      {/* Tooltip on hover */}
      {data.description && (
        <div className="absolute top-10 w-48 bg-card border border-border-subtle p-2 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 animate-fade-in">
          <div className="text-[10px] text-accent-from font-semibold uppercase tracking-wider mb-1">
            {data.group || 'Entity'}
          </div>
          <div className="text-xs text-text-muted">
            {data.description}
          </div>
        </div>
      )}
    </div>
  );
}
