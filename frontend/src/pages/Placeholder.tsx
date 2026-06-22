interface Props { title: string }

export default function Placeholder({ title }: Props) {
  return (
    <div className="min-h-screen bg-primary flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-4">🚧</p>
        <h1 className="text-xl font-semibold text-white mb-2">{title}</h1>
        <p className="text-muted">This page is coming soon.</p>
      </div>
    </div>
  );
}
