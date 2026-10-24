import { useId } from 'react';

export function CarArt({
  category = 'Sedan',
  color = '#648d85',
  className = '',
}: {
  category?: string;
  color?: string;
  className?: string;
}) {
  const id = useId().replace(/:/g, '');
  const tall = category === 'SUV';
  const compact = category === 'Hatchback' || category === 'Electric';
  return (
    <svg viewBox="0 0 400 190" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`paint-${id}`} x1="0" y1="0" x2="0.2" y2="1">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity=".76" />
        </linearGradient>
        <linearGradient id={`glass-${id}`} x1="0" y1="0" x2="0.8" y2="1">
          <stop stopColor="#c7dedc" />
          <stop offset="1" stopColor="#64817f" />
        </linearGradient>
      </defs>
      <ellipse cx="204" cy="157" rx="157" ry="10" fill="#1c302a" opacity=".09" />
      <path
        d={
          tall
            ? 'M47 113 70 103 101 60Q107 53 123 53H261Q275 54 287 74L309 103 352 114 360 141H42Z'
            : compact
              ? 'M46 117 73 108 105 68Q114 58 130 58H237Q250 58 260 71L290 105 344 119 352 143H43Z'
              : 'M43 118 80 105 126 66Q134 60 149 60H239Q253 60 268 76L300 105 349 116 359 141H40Z'
        }
        fill={`url(#paint-${id})`}
        stroke="#233f39"
        strokeOpacity=".3"
        strokeWidth="2"
      />
      <path
        d={
          tall
            ? 'M87 101 114 65H174V101ZM184 65H256Q268 66 276 79L291 101H184Z'
            : compact
              ? 'M90 103 120 71H174V103ZM184 71H235L266 103H184Z'
              : 'M100 103 140 71H184V103ZM194 71H238L277 103H194Z'
        }
        fill={`url(#glass-${id})`}
        stroke="#36534d"
        strokeWidth="3"
      />
      <path
        d="M60 113H340M174 108V139M284 110V139"
        stroke="#233f39"
        strokeOpacity=".23"
        strokeWidth="1.5"
      />
      <path d="M46 123H65L71 128H45M327 119H348L351 127H328" fill="#f7ecd0" />
      <path d="M46 141H356" stroke="#233f39" strokeWidth="6" strokeLinecap="round" />
      <path d="M191 114H205M128 114H140" stroke="#29433c" strokeWidth="3" strokeLinecap="round" />
      <path d="M282 103H293L297 109H281Z" fill={color} stroke="#29433c" />
      {[104, 297].map((x) => (
        <g key={x}>
          <circle cx={x} cy="141" r="26" fill="#263330" />
          <circle cx={x} cy="141" r="16" fill="#c8cfcb" />
          <circle cx={x} cy="141" r="10" fill="#788c84" />
          {[0, 60, 120].map((angle) => (
            <path
              key={angle}
              d={`M${x - 13} 141H${x + 13}`}
              stroke="#d8dfdb"
              strokeWidth="3"
              transform={`rotate(${angle} ${x} 141)`}
            />
          ))}
          <circle cx={x} cy="141" r="4" fill="#c8cfcb" />
        </g>
      ))}
    </svg>
  );
}
