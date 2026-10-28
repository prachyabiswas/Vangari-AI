import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, Truck, AlertTriangle, ExternalLink, RefreshCw } from "lucide-react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function AnalysisResult({ data, onReset }: { data: any, onReset: () => void }) {
    const { listing, ai_estimates, probable_waste_amount } = data;
    const { token } = useAuth();
    const [dispatching, setDispatching] = useState(false);
    const [dispatched, setDispatched] = useState(false);
    const [message, setMessage] = useState("");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [dispatchPayload, setDispatchPayload] = useState<any>(null);

    const handleDispatch = async () => {
        setDispatching(true);
        try {
            const res = await fetch(`/api/waste/dispatch/${listing.id}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const dispatchData = await res.json();

            if (!res.ok) throw new Error(dispatchData.error || 'Failed to dispatch');

            setDispatchPayload(dispatchData);
            setDispatched(true);
            setMessage("Collector successfully dispatched to your location!");
        } catch (err: unknown) {
            setMessage(`Error: ${err instanceof Error ? err.message : 'Dispatch failed'}`);
        } finally {
            setDispatching(false);
        }
    };

    return (
        <Card className="w-full glass-card border-primary/20 transition-all duration-300 relative overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-500">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
            <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-2xl font-heading">
                    <CheckCircle2 className="w-7 h-7 text-primary drop-shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    Analysis Complete
                </CardTitle>
                <CardDescription className="text-base flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                    <span>AI has successfully appraised your materials.</span>
                    {ai_estimates?.confidence_score > 0 && (
                        <Badge variant="secondary" className="w-fit bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20 shadow-sm py-1">
                            🎯 AI is {ai_estimates.confidence_score}% accurate
                        </Badge>
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-background/40 backdrop-blur-sm p-5 rounded-2xl border border-border/50 shadow-inner">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Estimated Payout</div>
                        <div className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary to-emerald-400 font-heading">
                            ৳{parseFloat(listing.estimated_payout || 0).toFixed(2)}
                        </div>
                    </div>
                    <div className="bg-background/40 backdrop-blur-sm p-5 rounded-2xl border border-border/50 shadow-inner flex flex-col justify-between">
                        <div className="text-sm font-medium text-muted-foreground mb-2">Status</div>
                        <Badge className="w-fit text-sm py-1.5 px-3 bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border border-amber-500/20">
                            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse mr-2"></span>
                            {listing.status}
                        </Badge>
                        <div className="mt-3">
                            <div className="text-sm font-medium text-muted-foreground mb-1">Total Amount</div>
                            <div className="text-2xl font-bold text-foreground font-heading">
                                {Number(probable_waste_amount || listing.probable_waste_amount || 0).toFixed(2)} kg
                            </div>
                        </div>
                    </div>
                </div>

                <div>
                    <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        Material Breakdown
                    </h3>
                    <div className="space-y-4">
                        {(ai_estimates.iron_kg > 0 || ai_estimates.iron_percent > 0) && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium flex items-center gap-2">⛓️ Iron / Metals</span>
                                    <span className="font-bold">{ai_estimates.iron_kg > 0 ? `${Number(ai_estimates.iron_kg).toFixed(2)} kg` : ''}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Progress value={ai_estimates.iron_percent} className="h-2 bg-secondary" indicatorClassName="bg-emerald-500" />
                                    <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{ai_estimates.iron_percent}%</span>
                                </div>
                            </div>
                        )}
                        {(ai_estimates.plastic_kg > 0 || ai_estimates.plastic_percent > 0) && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium flex items-center gap-2">🧴 Plastics (PET)</span>
                                    <span className="font-bold">{ai_estimates.plastic_kg > 0 ? `${Number(ai_estimates.plastic_kg).toFixed(2)} kg` : ''}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Progress value={ai_estimates.plastic_percent} className="h-2 bg-secondary" indicatorClassName="bg-blue-500" />
                                    <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{ai_estimates.plastic_percent}%</span>
                                </div>
                            </div>
                        )}
                        {(ai_estimates.electronics_kg > 0 || ai_estimates.electronics_percent > 0) && (
                            <div className="space-y-2">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="font-medium flex items-center gap-2">💻 E-Waste</span>
                                    <span className="font-bold">{ai_estimates.electronics_kg > 0 ? `${Number(ai_estimates.electronics_kg).toFixed(2)} kg` : ''}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Progress value={ai_estimates.electronics_percent} className="h-2 bg-secondary" indicatorClassName="bg-violet-500" />
                                    <span className="text-xs font-semibold text-muted-foreground w-10 text-right">{ai_estimates.electronics_percent}%</span>
                                </div>
                            </div>
                        )}
                        {/* {ai_estimates.biodegradable_present && (
                            <div className="flex justify-between items-center p-4 bg-destructive/10 text-destructive rounded-xl text-sm border border-destructive/20 mt-4 shadow-sm animate-in fade-in">
                                <span className="flex items-center gap-2 font-medium">
                                    <AlertTriangle className="w-5 h-5" /> 
                                    Warning: Biodegradable waste detected. This cannot be processed.
                                </span>
                            </div>
                        )} */}
                        {ai_estimates.is_biomass_possible && (
                            <div className="flex justify-between items-center p-4 bg-green-500/10 text-green-500 rounded-xl text-sm border border-green-500/20 mt-4 shadow-sm animate-in fade-in">
                                <span className="flex items-center gap-2 font-medium">
                                    🌿 Biomass Possible
                                </span>
                                {ai_estimates.biomass_kg > 0 && (
                                    <span className="font-bold">
                                        Est. {Number(ai_estimates.biomass_kg).toFixed(2)} kg
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                {message && (
                    <div className={`p-4 rounded-xl text-sm font-medium border animate-in slide-in-from-bottom-2 ${dispatched ? 'bg-primary/10 text-primary border-primary/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                        {message}
                    </div>
                )}

                {dispatchPayload?.route && (
                    <div className="rounded-xl border border-primary/20 p-5 bg-background/50 backdrop-blur-md shadow-lg shadow-primary/5 animate-in zoom-in-95 duration-500 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full blur-3xl -z-10"></div>
                        <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                            <Truck className="w-5 h-5 text-primary" /> Collector Route
                        </h3>
                        <p className="text-sm text-foreground font-medium mb-1">
                            {dispatchPayload.route.provider} route • <span className="text-primary">{Number(dispatchPayload.route.distanceKm || 0).toFixed(2)} km</span> • ETA <span className="text-primary">{Number(dispatchPayload.route.durationMinutes || 0).toFixed(0)} min</span>
                        </p>
                        <p className="text-sm text-muted-foreground mt-2 leading-relaxed bg-background/50 p-3 rounded-lg border border-border/50">{dispatchPayload.route.summary}</p>
                        <a href={dispatchPayload.route.mapsLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 mt-4 text-sm text-primary font-semibold hover:text-emerald-500 transition-colors bg-primary/10 px-3 py-1.5 rounded-full hover:bg-primary/20">
                            Open in Google Maps <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                    </div>
                )}

                {dispatchPayload?.sms && (
                    <div className="rounded-xl border border-border/50 p-5 bg-background/50 backdrop-blur-md">
                        <h3 className="font-semibold text-lg mb-2">SMS Direction Dispatch</h3>
                        <div className="flex items-center gap-2 mb-3">
                            <Badge variant={dispatchPayload.sms.status === "success" || dispatchPayload.sms.status === "queued" ? "secondary" : "destructive"}>
                                Status: {dispatchPayload.sms.status}
                            </Badge>
                        </div>
                        {dispatchPayload.sms.errorMessage && <p className="text-sm text-destructive mt-1 mb-3">{dispatchPayload.sms.errorMessage}</p>}
                        <div className="bg-secondary/50 p-3 rounded-lg text-xs text-muted-foreground font-mono leading-relaxed border border-border/50">
                            "{dispatchPayload.sms.messageText}"
                        </div>
                    </div>
                )}

            </CardContent>
            <CardFooter className="flex gap-4 pt-4 pb-6">
                {!dispatched && (
                    <Button
                        onClick={handleDispatch}
                        disabled={dispatching}
                        className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all font-semibold h-12 text-base rounded-xl"
                    >
                        {dispatching ? "Locating Collector..." : "Summon Collector"}
                    </Button>
                )}
                <Button variant="outline" onClick={onReset} className={`h-12 text-base rounded-xl font-medium border-border/50 hover:bg-secondary/80 ${dispatched ? 'w-full' : 'flex-1'}`}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Appraise Another
                </Button>
            </CardFooter>
        </Card>
    );
}
