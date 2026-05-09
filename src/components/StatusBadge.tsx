export function StatusBadge({ status }: { status: string }) {
  const cls = `badge-base badge-${status || "draft"}`;
  return <span className={cls}>{status || "draft"}</span>;
}
