type RouteGeometry = {
    type?: string;
    coordinates?: number[][];
};

function normalizeCoordinates(points: number[][], width: number, height: number) {
    const lons = points.map((point) => point[0]);
    const lats = points.map((point) => point[1]);

    const minLon = Math.min(...lons);
    const maxLon = Math.max(...lons);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);

    const lonRange = maxLon - minLon || 1;
    const latRange = maxLat - minLat || 1;
    const padding = 20;

    return points.map((point) => {
        const x = padding + ((point[0] - minLon) / lonRange) * (width - padding * 2);
        const y = height - (padding + ((point[1] - minLat) / latRange) * (height - padding * 2));
        return [x, y];
    });
}

export function RouteMiniMap({
    geometry,
    className,
}: {
    geometry: RouteGeometry | null | undefined;
    className?: string;
}) {
    const coordinates = Array.isArray(geometry?.coordinates) ? geometry.coordinates : [];

    if (coordinates.length < 2) {
        return (
            <div className={`h-48 rounded-xl border-2 border-dashed border-border/50 bg-background/30 flex items-center justify-center text-sm font-medium text-muted-foreground ${className || ''}`}>
                Route map preview unavailable.
            </div>
        );
    }

    const width = 420;
    const height = 200;
    const normalized = normalizeCoordinates(coordinates, width, height);
    const path = normalized.map((point) => point.join(',')).join(' ');

    const start = normalized[0];
    const end = normalized[normalized.length - 1];

    return (
        <div className={`rounded-xl border border-border/50 bg-background/50 backdrop-blur-md p-3 relative overflow-hidden shadow-inner ${className || ''}`}>
            {/* Grid background pattern */}
            <div className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.05]" 
                 style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0)', backgroundSize: '24px 24px' }}>
            </div>
            
            <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-44 relative z-10 filter drop-shadow-sm">
                <defs>
                    <linearGradient id="routeGradient" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" />
                        <stop offset="100%" stopColor="#8b5cf6" /> {/* violet-500 */}
                    </linearGradient>
                    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>
                <polyline
                    points={path}
                    fill="none"
                    stroke="url(#routeGradient)"
                    strokeWidth="5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    filter="url(#glow)"
                    className="opacity-90"
                />
                
                {/* Start Point (Collector) */}
                <circle cx={start[0]} cy={start[1]} r="10" fill="hsl(var(--primary))" className="opacity-20 animate-pulse" />
                <circle cx={start[0]} cy={start[1]} r="6" fill="hsl(var(--primary))" stroke="var(--background)" strokeWidth="2" />
                
                {/* End Point (Owner) */}
                <circle cx={end[0]} cy={end[1]} r="10" fill="#8b5cf6" className="opacity-20 animate-pulse" />
                <circle cx={end[0]} cy={end[1]} r="6" fill="#8b5cf6" stroke="var(--background)" strokeWidth="2" />
            </svg>
            
            <div className="mt-2 flex items-center justify-between text-[11px] font-medium text-muted-foreground px-2 bg-muted/50 rounded-lg py-1.5 border border-border/50 relative z-10">
                <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-primary inline-block"></span>
                    <span>Collector Start</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span>Owner Destination</span>
                    <span className="w-2.5 h-2.5 rounded-full bg-violet-500 inline-block"></span>
                </div>
            </div>
        </div>
    );
}
