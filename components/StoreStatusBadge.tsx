export function StoreStatusBadge({ isOpen }: { isOpen: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
        isOpen
          ? 'bg-[var(--status-success-bg)] text-[var(--status-success-text)]'
          : 'bg-[var(--status-error-bg)] text-[var(--status-error-text)]'
      }`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${isOpen ? 'bg-green-500' : 'bg-red-500'}`}
      />
      {isOpen ? 'Aberto' : 'Fechado'}
    </span>
  );
}
