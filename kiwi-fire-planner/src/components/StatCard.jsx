export function StatCard({ title, value, subtitle }) {
  return (
    <article className="stat-panel">
      <p>{title}</p>
      <strong>{value}</strong>
      <span>{subtitle}</span>
    </article>
  );
}
