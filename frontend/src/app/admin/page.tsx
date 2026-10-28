"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { RouteMiniMap } from '@/components/RouteMiniMap';
import { LayoutDashboard, List, MapPin, Users, Wallet, Navigation, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminDashboard() {
    const { user, token } = useAuth();
    const router = useRouter();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [users, setUsers] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [listings, setListings] = useState<any[]>([]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [selectedListing, setSelectedListing] = useState<any>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [collectors, setCollectors] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [payoutSummary, setPayoutSummary] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [recentLedger, setRecentLedger] = useState<any[]>([]);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [assignmentMeta, setAssignmentMeta] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedToken = localStorage.getItem('token');
        if (!storedToken) {
            router.push('/auth/login');
            return;
        }

        if (!user) return; // Wait for user context
        if (user.role !== 'ADMIN') {
            router.push('/');
            return;
        }

        const fetchAdminData = async () => {
            try {
                const opts = { headers: { 'Authorization': `Bearer ${token}` } };
                const [usersRes, listingsRes, payoutsRes] = await Promise.all([
                    fetch('/api/admin/users', opts),
                    fetch('/api/admin/listings', opts),
                    fetch('/api/admin/payouts/collectors', opts)
                ]);
                const usersData = await usersRes.json();
                const listingsData = await listingsRes.json();
                const payoutsData = await payoutsRes.json();

                if (usersData.success) setUsers(usersData.users);
                if (listingsData.success) setListings(listingsData.listings);
                if (payoutsData.success) {
                    setPayoutSummary(payoutsData.summary || []);
                    setRecentLedger(payoutsData.ledger || []);
                }
            } catch (err) {
                console.error("Failed to fetch admin data", err);
            } finally {
                setLoading(false);
            }
        };

        fetchAdminData();
    }, [user, router, token]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleAssignClick = async (listing: any) => {
        setSelectedListing(listing);
        try {
            const res = await fetch(`/api/admin/listings/${listing.id}/collectors`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                setCollectors(data.collectors);
            }
        } catch (err) {
            console.error("Failed to fetch collectors", err);
        }
    };

    const confirmAssignment = async (collectorId: string) => {
        try {
            const res = await fetch(`/api/admin/listings/${selectedListing.id}/assign`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ collector_id: collectorId })
            });
            const data = await res.json();
            if (data.success) {
                // Update listings local state
                setListings(prev => prev.map(l => l.id === selectedListing.id ? { ...l, status: 'ASSIGNED', collector_id: collectorId, collector_name: collectors.find(c => c.id === collectorId)?.name } : l));
                setAssignmentMeta({ route: data.route, sms: data.sms, collectorId });
                setSelectedListing(null);
            }
        } catch (err) {
            console.error("Failed to assign collector", err);
        }
    };

    if (loading) return (
        <div className="flex-1 flex items-center justify-center min-h-[calc(100vh-64px)]">
            <div className="flex flex-col items-center gap-4">
                <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <p className="text-muted-foreground font-medium animate-pulse">Loading Admin Data...</p>
            </div>
        </div>
    );

    return (
        <main className="flex-1 p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full relative">
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 rounded-full blur-[120px] -z-10 pointer-events-none"></div>

            <div className="flex items-center gap-4 mb-2">
                <div className="bg-primary/10 p-3 rounded-2xl">
                    <LayoutDashboard className="w-8 h-8 text-primary" />
                </div>
                <div>
                    <h1 className="text-4xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-primary to-teal-400 font-heading">Admin Dashboard</h1>
                    <p className="text-muted-foreground text-lg">Oversee users and dispatch collectors optimally.</p>
                </div>
            </div>

            {assignmentMeta && (
                <Card className="border-primary/20 bg-background/50 backdrop-blur-md shadow-lg shadow-primary/5 overflow-hidden animate-in fade-in slide-in-from-top-4">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-teal-400"></div>
                    <CardHeader>
                        <CardTitle className="text-xl flex items-center gap-2">
                            <Navigation className="w-5 h-5 text-primary" /> Last Assignment Info
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid md:grid-cols-2 gap-6">
                        <div className="bg-background/80 p-5 rounded-xl border border-border/50 shadow-sm">
                            <h3 className="font-semibold mb-3 flex items-center gap-2"><MapPin className="w-4 h-4 text-emerald-500"/> Route Intelligence</h3>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <p><strong className="text-foreground">Provider:</strong> {assignmentMeta.route?.provider || 'N/A'}</p>
                                <p><strong className="text-foreground">Distance:</strong> {Number(assignmentMeta.route?.distanceKm || 0).toFixed(2)} km</p>
                                <p><strong className="text-foreground">ETA:</strong> {Number(assignmentMeta.route?.durationMinutes || 0).toFixed(0)} minutes</p>
                                <p className="bg-muted p-2 rounded-lg text-xs mt-2">{assignmentMeta.route?.summary}</p>
                            </div>
                            <RouteMiniMap geometry={assignmentMeta.route?.geometry} className="mt-4 border border-border/50 rounded-lg overflow-hidden shadow-sm" />
                        </div>
                        <div className="bg-background/80 p-5 rounded-xl border border-border/50 shadow-sm">
                            <h3 className="font-semibold mb-3 flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500"/> SMS Dispatch</h3>
                            <div className="space-y-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-2">
                                    <strong className="text-foreground">Status:</strong>
                                    <Badge variant={assignmentMeta.sms?.status === 'success' || assignmentMeta.sms?.status === 'queued' ? 'secondary' : 'destructive'} className="h-5 uppercase text-[10px]">
                                        {assignmentMeta.sms?.status || 'UNKNOWN'}
                                    </Badge>
                                </div>
                                <p><strong className="text-foreground">Provider ID:</strong> {assignmentMeta.sms?.providerMessageId || 'N/A'}</p>
                                {assignmentMeta.sms?.errorMessage && <p className="text-destructive font-medium mt-2 flex items-center gap-1"><AlertCircle className="w-4 h-4"/>{assignmentMeta.sms.errorMessage}</p>}
                                <div className="bg-secondary/50 p-3 rounded-lg text-xs font-mono mt-4 border border-border/50">
                                    "{assignmentMeta.sms?.messageText}"
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            <Tabs defaultValue="listings" className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-14 bg-background/50 backdrop-blur-md border border-border/50 p-1 mb-6 rounded-xl shadow-sm">
                    <TabsTrigger value="listings" className="text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <List className="w-4 h-4 mr-2" /> Listings
                    </TabsTrigger>
                    <TabsTrigger value="payouts" className="text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Wallet className="w-4 h-4 mr-2" /> Collector Payouts
                    </TabsTrigger>
                    <TabsTrigger value="ledger" className="text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <LayoutDashboard className="w-4 h-4 mr-2" /> Ledger
                    </TabsTrigger>
                    <TabsTrigger value="users" className="text-base font-medium rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground transition-all">
                        <Users className="w-4 h-4 mr-2" /> All Users
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="listings" className="animate-in fade-in duration-500">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader>
                            <CardTitle>Waste Listings</CardTitle>
                            <CardDescription>Manage incoming scrap listings and assign collectors.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead className="w-[100px]">Date</TableHead>
                                        <TableHead>Image</TableHead>
                                        <TableHead>Owner Info</TableHead>
                                        <TableHead>AI Analysis</TableHead>
                                        <TableHead>Payout</TableHead>
                                        <TableHead className="text-right">Action / Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {listings.map(l => {
                                        const estimates = typeof l.ai_estimated_weight === 'string'
                                            ? JSON.parse(l.ai_estimated_weight)
                                            : (l.ai_estimated_weight || {});
                                        return (
                                            <TableRow key={l.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium text-xs">{new Date(l.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    {typeof l.image_url === 'string' && l.image_url.startsWith('data:image') ? (
                                                        // eslint-disable-next-line @next/next/no-img-element
                                                        <img
                                                            src={l.image_url}
                                                            alt="Waste"
                                                            className="w-16 h-16 object-cover rounded-lg border shadow-sm"
                                                        />
                                                    ) : (
                                                        <div className="w-16 h-16 rounded-lg border border-dashed flex items-center justify-center text-[10px] text-muted-foreground bg-muted/50 text-center p-1">
                                                            No img
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">{l.owner_name}</div>
                                                    <div className="text-xs text-muted-foreground">{l.owner_email}</div>
                                                    {l.owner_address_text && <div className="text-xs text-muted-foreground mt-1 truncate max-w-[200px]">{l.owner_address_text}</div>}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-wrap gap-1">
                                                        {estimates.iron_kg > 0 && <Badge variant="outline" className="text-[10px] bg-secondary/50 text-secondary-foreground border-secondary">Fe: {estimates.iron_kg}kg</Badge>}
                                                        {estimates.plastic_kg > 0 && <Badge variant="outline" className="text-[10px] bg-blue-500/10 text-blue-600 border-blue-500/20">PET: {estimates.plastic_kg}kg</Badge>}
                                                        {estimates.electronics_kg > 0 && <Badge variant="outline" className="text-[10px] bg-violet-500/10 text-violet-600 border-violet-500/20">E-W: {estimates.electronics_kg}kg</Badge>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-bold text-emerald-600">৳{Number(l.estimated_payout).toFixed(2)}</TableCell>
                                                <TableCell className="text-right">
                                                    {l.status === 'PENDING' ? (
                                                        <Button size="sm" onClick={() => handleAssignClick(l)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                                                            Assign Collector
                                                        </Button>
                                                    ) : (
                                                        <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border-emerald-500/20 shadow-none">
                                                            Assigned: {l.collector_name}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                    {listings.length === 0 && (
                                        <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground">No listings found.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="payouts" className="animate-in fade-in duration-500">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader>
                            <CardTitle>Collector Payouts Summary</CardTitle>
                            <CardDescription>Hybrid formula: 12% of actual payout or minimum BDT 30.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Collector</TableHead>
                                        <TableHead>Total Jobs</TableHead>
                                        <TableHead>Pending Jobs</TableHead>
                                        <TableHead>Pending Pay</TableHead>
                                        <TableHead className="text-right">Total Paid</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {payoutSummary.map(p => (
                                        <TableRow key={p.collector_id}>
                                            <TableCell>
                                                <div className="font-semibold text-sm">{p.collector_name}</div>
                                                <div className="text-xs text-muted-foreground">{p.collector_email}</div>
                                            </TableCell>
                                            <TableCell>{p.total_jobs}</TableCell>
                                            <TableCell>{p.pending_payout_jobs}</TableCell>
                                            <TableCell className="font-semibold text-amber-600">৳{Number(p.collector_payout_pending || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">৳{Number(p.collector_payout_total || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {payoutSummary.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No payout data yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="ledger" className="animate-in fade-in duration-500">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader>
                            <CardTitle>Recent Payout Ledger</CardTitle>
                            <CardDescription>History of collector earnings per job.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Time</TableHead>
                                        <TableHead>Collector</TableHead>
                                        <TableHead>Listing ID</TableHead>
                                        <TableHead>Actual Payout</TableHead>
                                        <TableHead className="text-right">Collector Share</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {recentLedger.map((entry) => (
                                        <TableRow key={entry.id}>
                                            <TableCell className="text-xs">{new Date(entry.created_at).toLocaleString()}</TableCell>
                                            <TableCell className="font-medium text-sm">{entry.collector_name}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono">{entry.listing_id.slice(0, 8)}...</TableCell>
                                            <TableCell>৳{Number(entry.actual_payout || 0).toFixed(2)}</TableCell>
                                            <TableCell className="text-right font-bold text-emerald-600">৳{Number(entry.final_payout || 0).toFixed(2)}</TableCell>
                                        </TableRow>
                                    ))}
                                    {recentLedger.length === 0 && (
                                        <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground">No ledger entries yet.</TableCell></TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="animate-in fade-in duration-500">
                    <Card className="glass-card overflow-hidden">
                        <CardHeader>
                            <CardTitle>Platform Users</CardTitle>
                            <CardDescription>All registered users across roles.</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-muted/50">
                                    <TableRow>
                                        <TableHead>Name</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Role</TableHead>
                                        <TableHead className="text-right">Wallet Balance</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map(u => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-medium">{u.name}</TableCell>
                                            <TableCell className="text-muted-foreground">{u.email}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-mono text-[10px] uppercase">
                                                    {u.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-primary">৳{u.wallet_balance}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal for Assignment */}
            {selectedListing && (
                <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <Card className="glass-card shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border-primary/30 relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-teal-400"></div>
                        <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 pb-4">
                            <CardTitle className="text-2xl font-heading">Assign Collector</CardTitle>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedListing(null)} className="h-8 w-8 rounded-full hover:bg-muted">
                                &times;
                            </Button>
                        </CardHeader>

                        <CardContent className="overflow-y-auto p-6 space-y-6">
                            <div className="p-5 rounded-xl bg-muted/50 border border-border/50 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <MapPin className="w-20 h-20" />
                                </div>
                                <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">Target Owner Details</h4>
                                <div className="space-y-1 text-sm text-muted-foreground">
                                    <p><strong className="text-foreground">Name:</strong> {selectedListing.owner_name}</p>
                                    <p><strong className="text-foreground">Location:</strong> {Number(selectedListing.owner_lon).toFixed(4)}, {Number(selectedListing.owner_lat).toFixed(4)}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <h4 className="font-bold text-foreground flex items-center gap-2">
                                    <Navigation className="w-4 h-4 text-primary" /> Available Collectors <span className="text-xs font-normal text-muted-foreground">(Ranked by proximity)</span>
                                </h4>
                                {collectors.length === 0 ? (
                                    <p className="text-sm text-muted-foreground p-4 bg-muted/30 rounded-lg text-center border border-dashed">No collectors found in the system.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {collectors.map((c, idx) => (
                                            <div key={c.id} className="flex justify-between items-center p-4 rounded-xl bg-background/50 border border-border shadow-sm hover:border-primary/50 hover:shadow-md transition-all group relative overflow-hidden">
                                                {idx === 0 && <div className="absolute top-0 left-0 w-1 h-full bg-primary"></div>}
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span className="font-bold text-lg">{c.name}</span>
                                                        {idx === 0 && <Badge className="bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-none font-bold text-[10px] uppercase">Optimal Match</Badge>}
                                                    </div>
                                                    <div className="text-sm text-muted-foreground mt-1 capitalize">{c.role} • ৳{c.wallet_balance} in wallet</div>

                                                    <div className="mt-3 flex items-center gap-2 text-sm">
                                                        <div className="w-2 h-2 rounded-full bg-blue-500/80"></div>
                                                        <div className="w-12 h-px bg-gradient-to-r from-blue-500/50 to-emerald-500/50"></div>
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500/80"></div>
                                                        <span className="font-medium text-muted-foreground ml-2">
                                                            Path Distance: <strong className="text-primary">{(c.distance * 100).toFixed(2)} km</strong>
                                                        </span>
                                                    </div>
                                                </div>
                                                <Button onClick={() => confirmAssignment(c.id)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all shrink-0 rounded-lg group-hover:scale-105">
                                                    Dispatch Collector
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </main>
    );
}
