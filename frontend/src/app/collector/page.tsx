"use client";

import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { RouteMiniMap } from '@/components/RouteMiniMap';
import { Map, Truck, Loader2, Navigation, MapPin, CheckCircle, PackageCheck, AlertCircle } from 'lucide-react';

type Breakdown = {
    iron_kg: number;
    plastic_kg: number;
    electronics_kg: number;
};

function defaultBreakdown(): Breakdown {
    return {
        iron_kg: 0,
        plastic_kg: 0,
        electronics_kg: 0,
    };
}

export default function CollectorPage() {
    const { user, token } = useAuth();
    const router = useRouter();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [jobs, setJobs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [form, setForm] = useState<Breakdown>(defaultBreakdown());
    const [notes, setNotes] = useState('');
    const [message, setMessage] = useState('');
    const [messageType, setMessageType] = useState<'success' | 'error' | 'info'>('info');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!user) return;
        if (user.role !== 'COLLECTOR') {
            router.push('/');
            return;
        }

        const fetchJobs = async () => {
            try {
                const res = await fetch('/api/waste/collector/jobs', {
                    headers: { 'Authorization': `Bearer ${token}` },
                });
                const data = await res.json();
                if (data.success) {
                    setJobs(data.jobs || []);
                }
            } catch (error) {
                console.error('Failed to fetch collector jobs', error);
            } finally {
                setLoading(false);
            }
        };

        fetchJobs();
    }, [router, token, user]);

    const selectedJob = useMemo(
        () => jobs.find((job) => job.id === selectedId) || null,
        [jobs, selectedId]
    );

    const showMessage = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
        setMessage(msg);
        setMessageType(type);
        setTimeout(() => setMessage(''), 5000);
    };

    const submitSingleUpdate = async (markCollected: boolean) => {
        if (!selectedId) {
            showMessage('Select one assigned house first.', 'error');
            return;
        }

        setSubmitting(true);
        try {
            const res = await fetch(`/api/waste/collector/listings/${selectedId}/actual`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    actual_collected_breakdown: form,
                    collection_notes: notes,
                    mark_collected: markCollected,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Update failed');

            showMessage(`Saved. Collector payout for this job: BDT ${Number(data.payout_model?.finalPayout || 0).toFixed(2)}.`, 'success');

            setJobs((prev) =>
                prev.map((job) =>
                    job.id === selectedId
                        ? {
                            ...job,
                            status: data.listing.status,
                            actual_collected_breakdown: data.listing.actual_collected_breakdown,
                            actual_total_kg: data.listing.actual_total_kg,
                            actual_payout: data.listing.actual_payout,
                            collector_payout: data.listing.collector_payout,
                        }
                        : job
                )
            );
            if (markCollected) setSelectedId(null);
        } catch (error) {
            showMessage(error instanceof Error ? error.message : 'Failed to update', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const submitBatch = async () => {
        setSubmitting(true);
        try {
            const payload = jobs
                .filter((job) => job.status === 'ASSIGNED')
                .map((job) => ({
                    listing_id: job.id,
                    actual_collected_breakdown: {
                        iron_kg: Number(job.probable_waste_amount || 0) * 0.4,
                        plastic_kg: Number(job.probable_waste_amount || 0) * 0.4,
                        electronics_kg: Number(job.probable_waste_amount || 0) * 0.2,
                    },
                    collection_notes: 'Batch reconciled by collector at route end.',
                }));

            if (payload.length === 0) {
                showMessage('No ASSIGNED jobs available for batch reconciliation.', 'info');
                setSubmitting(false);
                return;
            }

            const res = await fetch('/api/waste/collector/listings/batch-actual', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ updates: payload }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Batch update failed');

            const successfulCount = Array.isArray(data.results)
                ? data.results.filter((r: { success?: boolean }) => Boolean(r.success)).length
                : 0;
            showMessage(`Batch reconcile finished. Updated ${successfulCount} listings.`, 'success');
            
            // Optimistically update local state for batch
            setJobs(prev => prev.map(job => job.status === 'ASSIGNED' ? { ...job, status: 'COLLECTED' } : job));
        } catch (error) {
            showMessage(error instanceof Error ? error.message : 'Batch update failed', 'error');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground font-medium animate-pulse">Loading Route Board...</p>
            </div>
        </div>
    );

    return (
        <main className="flex-1 p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full relative overflow-hidden">
            <div className="absolute top-0 -left-20 w-[600px] h-[600px] bg-sky-500/10 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center gap-4">
                    <div className="bg-sky-500/10 p-3 rounded-2xl">
                        <Truck className="w-8 h-8 text-sky-500" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-sky-500 to-blue-600 font-heading">Collector Route Board</h1>
                        <p className="text-muted-foreground text-lg">Follow directions, collect waste, and update actual amounts.</p>
                    </div>
                </div>
                <Button variant="outline" onClick={submitBatch} disabled={submitting} className="border-sky-200 hover:bg-sky-50 hover:text-sky-700 dark:border-sky-900/50 dark:hover:bg-sky-900/30">
                    <PackageCheck className="w-4 h-4 mr-2" />
                    Batch Reconcile Remaining
                </Button>
            </div>

            {message && (
                <div className={`p-4 rounded-xl text-sm font-medium border animate-in slide-in-from-top-2 flex items-center gap-2 ${
                    messageType === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50 dark:text-emerald-400' :
                    messageType === 'error' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                    'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:border-sky-800/50 dark:text-sky-400'
                }`}>
                    {messageType === 'success' && <CheckCircle className="w-5 h-5" />}
                    {messageType === 'error' && <AlertCircle className="w-5 h-5" />}
                    {message}
                </div>
            )}

            <div className="grid lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Map className="w-5 h-5 text-sky-500"/> Assigned Houses</CardTitle>
                            <CardDescription>Click on a row to view route and update collection details.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Owner</TableHead>
                                        <TableHead>Expected</TableHead>
                                        <TableHead>Route</TableHead>
                                        <TableHead className="text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {jobs.map((job) => (
                                        <TableRow
                                            key={job.id}
                                            className={`cursor-pointer transition-colors ${selectedId === job.id ? 'bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/30' : 'hover:bg-muted/50'}`}
                                            onClick={() => {
                                                setSelectedId(job.id);
                                                setForm(job.actual_collected_breakdown || defaultBreakdown());
                                                setNotes(job.collection_notes || '');
                                            }}
                                        >
                                            <TableCell>
                                                <div className="font-semibold text-sm">{job.owner_name}</div>
                                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">{job.owner_address_text || 'No address'}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-sm">{Number(job.probable_waste_amount || 0).toFixed(2)} kg</div>
                                                <div className="text-xs font-semibold text-sky-600">৳{Number(job.estimated_payout || 0).toFixed(2)}</div>
                                            </TableCell>
                                            <TableCell className="text-sm">
                                                <div>{Number(job.route_distance_km || 0).toFixed(1)} km</div>
                                                <div className="text-xs text-muted-foreground">{Number(job.route_duration_minutes || 0).toFixed(0)} min</div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Badge variant={job.status === 'COLLECTED' ? 'secondary' : 'default'} className={job.status === 'COLLECTED' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-sky-500 hover:bg-sky-600 shadow-none'}>
                                                    {job.status}
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {jobs.length === 0 && (
                                        <TableRow><TableCell colSpan={4} className="h-32 text-center text-muted-foreground">No assigned listings found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>

                <div className="lg:col-span-1">
                    {selectedJob ? (
                        <Card className="glass-card sticky top-24 shadow-xl border-sky-200 dark:border-sky-900/50 animate-in slide-in-from-right-4">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-sky-400 to-blue-600"></div>
                            <CardHeader>
                                <CardTitle className="text-xl">Update Collection</CardTitle>
                                <CardDescription>Enter actual weighed amounts for {selectedJob.owner_name}.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="iron">Iron / Metal (kg)</Label>
                                        <Input id="iron" type="number" step="0.1" value={form.iron_kg} onChange={(e) => setForm((f) => ({ ...f, iron_kg: Number(e.target.value) }))} className="bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="plastic">Plastic / PET (kg)</Label>
                                        <Input id="plastic" type="number" step="0.1" value={form.plastic_kg} onChange={(e) => setForm((f) => ({ ...f, plastic_kg: Number(e.target.value) }))} className="bg-background/50" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="electronics">Electronics (kg)</Label>
                                        <Input id="electronics" type="number" step="0.1" value={form.electronics_kg} onChange={(e) => setForm((f) => ({ ...f, electronics_kg: Number(e.target.value) }))} className="bg-background/50" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="notes">Collection Notes (Optional)</Label>
                                    <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="E.g. Address was hard to find" className="bg-background/50" />
                                </div>
                                
                                <div className="p-4 rounded-xl border border-border/50 bg-background/50 backdrop-blur-sm">
                                    <h3 className="font-semibold mb-2 flex items-center gap-2"><MapPin className="w-4 h-4 text-sky-500" /> Route to Owner</h3>
                                    <p className="text-xs text-muted-foreground mb-3">{selectedJob.route_summary || 'Route summary unavailable.'}</p>
                                    <RouteMiniMap geometry={selectedJob.route_geometry} className="border border-border/50 rounded-lg overflow-hidden shadow-sm" />
                                    <a
                                        className="inline-flex items-center gap-1.5 mt-3 text-sm font-semibold text-sky-600 hover:text-sky-700 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 rounded-lg w-full justify-center transition-colors border border-sky-100 dark:border-sky-900/50"
                                        href={`https://www.google.com/maps/dir/?api=1&destination=${selectedJob.owner_lat},${selectedJob.owner_lon}&travelmode=driving`}
                                        target="_blank"
                                        rel="noreferrer"
                                    >
                                        <Navigation className="w-4 h-4" /> Open Maps Navigation
                                    </a>
                                </div>
                            </CardContent>
                            <CardFooter className="flex flex-col gap-3">
                                <Button 
                                    className="w-full bg-sky-600 hover:bg-sky-700 text-white shadow-lg shadow-sky-500/20 h-11 transition-all" 
                                    onClick={() => submitSingleUpdate(true)}
                                    disabled={submitting || selectedJob.status === 'COLLECTED'}
                                >
                                    {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-2" />}
                                    Mark Collected & Finalize
                                </Button>
                                <Button 
                                    variant="outline" 
                                    className="w-full h-11 border-border/50" 
                                    onClick={() => submitSingleUpdate(false)}
                                    disabled={submitting || selectedJob.status === 'COLLECTED'}
                                >
                                    Save Progress
                                </Button>
                            </CardFooter>
                        </Card>
                    ) : (
                        <div className="h-full border-2 border-dashed border-border rounded-xl flex items-center justify-center p-8 text-center text-muted-foreground bg-muted/20 animate-in fade-in">
                            <div>
                                <Map className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                                <p className="font-medium text-foreground">No Job Selected</p>
                                <p className="text-sm mt-1">Select a job from the board to view route and update collection.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
