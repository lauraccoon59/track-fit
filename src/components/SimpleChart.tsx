interface SimpleChartProps {
  points: Array<{ label: string; value: number }>
  unit?: string
}

export function SimpleChart({ points, unit = '' }: SimpleChartProps) {
  if (points.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-[var(--color-ink-muted)]">
        Pas encore de données
      </p>
    )
  }

  const values = points.map((p) => p.value)
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const width = 320
  const height = 140
  const padX = 12
  const padY = 16

  const coords = points.map((p, i) => {
    const x =
      points.length === 1
        ? width / 2
        : padX + (i / (points.length - 1)) * (width - padX * 2)
    const y = height - padY - ((p.value - min) / range) * (height - padY * 2)
    return { x, y, ...p }
  })

  const path = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ')

  return (
    <div className="overflow-hidden">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="h-36 w-full"
        role="img"
        aria-label="Graphique de progression"
      >
        <path
          d={path}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {coords.map((c, i) => (
          <g key={`${c.label}-${i}`}>
            <circle cx={c.x} cy={c.y} r="4.5" fill="var(--color-accent)" />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between gap-1 text-[10px] text-[var(--color-ink-muted)]">
        {points.map((p, i) => (
          <span key={`${p.label}-${i}`} className="truncate text-center">
            {p.label}
            <br />
            {p.value}
            {unit}
          </span>
        ))}
      </div>
    </div>
  )
}
