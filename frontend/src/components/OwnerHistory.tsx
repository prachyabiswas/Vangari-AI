"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, PackageCheck, UploadCloud, MapPin, User, Banknote } from 'lucide-react';

type OwnerHistoryItem = {
    id: string;
    image_url: string;
    status: string;
    created_at: string;
    estimated_payout: string | number | null;
    actual_payout: string | number | null;
    probable_waste_amount: string | number | null;
    owner_address_text: string | null;
    collector_name: string | null;
};

type OwnerHistoryResponse = {
    success: boolean;
    uploaded_history: OwnerHistoryItem[];
    sold_history: OwnerHistoryItem[];
    summary: {
        total_uploaded: number;
        total_sold: number;
        sold_total_amount: number;
    };
};

function ListingCard({ item }: { item: OwnerHistoryItem }) {
    return (
        <div className="rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm p-4 hover:border-primary/50 transition-colors shadow-sm group">
            <div className="flex gap-4">
                <div className="shrink-0">
                    {item.image_url?.startsWith('data:image') ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                            src={item.image_url}
                            alt="Uploaded waste"
                            className="w-24 h-24 rounded-lg object-cover border border-border/50 group-hover:scale-105 transition-transform"
                        />
                    ) : (
                        <div className="w-24 h-24 rounded-lg border border-dashed border-border flex items-center justify-center text-xs text-muted-foreground bg-muted/30">
                            No image
                        </div>
                    )}
                </div>
                <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-semibold text-foreground">{new Date(item.created_at).toLocaleString()}</span>
                        <Badge variant={item.status === 'COLLECTED' ? 'secondary' : 'outline'} className={item.status === 'COLLECTED' ? 'bg-primary/10 text-primary border-primary/20' : ''}>
                            {item.status}
                        </Badge>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5 truncate">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            <span className="truncate">{item.owner_address_text || 'Address not provided'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 truncate">
                            <User className="w-3.5 h-3.5 text-blue-500" />
                            <span className="truncate">{item.collector_name || 'Not assigned yet'}</span>
                        </div>
                    </div>
                    <div className="flex items-center justify-between pt-1 border-t border-border/50 mt-2">
                        <div className="text-xs font-medium bg-muted/50 px-2 py-1 rounded-md">
                            Weight: {Number(item.probable_waste_amount || 0).toFixed(2)} kg
                        </div>
                        <div className="text-sm font-bold text-primary flex items-center gap-1">
                            <Banknote className="w-4 h-4" /> 
                            ৳{Number(item.actual_payout || item.estimated_payout || 0).toFixed(2)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export function OwnerHistory() {
    const { token } = useAuth();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [data, setData] = useState<OwnerHistoryResponse | null>(null);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await fetch('/api/waste/owner/history', {
                    headers: { Authorization: `Bearer ${token}` },
                });
                const payload = await res.json();
                if (!res.ok) throw new Error(payload.error || 'Failed to load owner history');
                setData(payload);
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : 'Failed to load owner history');
            } finally {
                setLoading(false);
            }
        };

        fetchHistory();
    }, [token]);

    const uploaded = useMemo(() => data?.uploaded_history || [], [data]);
    const sold = useMemo(() => data?.sold_history || [], [data]);

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="w-full rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-sm font-medium text-destructive animate-in fade-in">
                {error}
            </div>
        );
    }

    return (
        <section className="w-full space-y-6 animate-in fade-in zoom-in-95 duration-500">
            <Card className="glass-card border-primary/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>
                <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-2xl font-bold font-heading flex items-center gap-2">
                                <History className="w-6 h-6 text-primary" /> Activity History
                            </h3>
                            <p className="text-sm text-muted-foreground mt-1">Track your scrap uploads and total earnings.</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="bg-background/50 border border-border/50 rounded-xl p-3 px-5 text-center min-w-[100px]">
                                <div className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Uploaded</div>
                                <div className="text-xl font-bold text-foreground font-heading">{data?.summary.total_uploaded || 0}</div>
                            </div>
                            <div className="bg-background/50 border border-border/50 rounded-xl p-3 px-5 text-center min-w-[100px]">
                                <div className="text-xs text-muted-foreground font-medium mb-1 uppercase tracking-wider">Sold</div>
                                <div className="text-xl font-bold text-foreground font-heading">{data?.summary.total_sold || 0}</div>
                            </div>
                            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 px-5 text-center min-w-[120px]">
                                <div className="text-xs text-primary font-bold mb-1 uppercase tracking-wider">Earnings</div>
                                <div className="text-xl font-bold text-primary font-heading">৳{Number(data?.summary.sold_total_amount || 0).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card className="glass-card overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <UploadCloud className="w-5 h-5 text-sky-500" /> Pending Uploads
                        </CardTitle>
                        <CardDescription>Items awaiting collector assignment or pickup.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                        {uploaded.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                                No pending uploads.
                            </div>
                        ) : (
                            uploaded.slice(0, 10).map((item) => <ListingCard key={item.id} item={item} />)
                        )}
                    </CardContent>
                </Card>

                <Card className="glass-card overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b border-border/50 pb-4">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <PackageCheck className="w-5 h-5 text-emerald-500" /> Sold History
                        </CardTitle>
                        <CardDescription>Successfully collected and paid items.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-4 space-y-4 max-h-[600px] overflow-y-auto">
                        {sold.length === 0 ? (
                            <div className="text-center p-8 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl">
                                No sold listings yet.
                            </div>
                        ) : (
                            sold.slice(0, 10).map((item) => <ListingCard key={item.id} item={item} />)
                        )}
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
