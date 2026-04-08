import { ShieldCheck } from 'lucide-react';

const LEVELS: Record<string, { label: string; color: string }> = {
  BRONZE: { label: 'Bronze', color: '#cd7f32' },
  SILVER: { label: 'Prata', color: '#9ca3af' },
  GOLD: { label: 'Ouro', color: '#f59e0b' },
  DIAMOND: { label: 'Diamante', color: '#60a5fa' },
};

export function VerificationBadge({ level }: { level: string }) {
  const info = LEVELS[level];
  if (!info) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full"
      style={{ color: info.color, background: `${info.color}22` }}
    >
      <ShieldCheck size={12} />
      {info.label}
    </span>
  );
}
