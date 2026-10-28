"use client";

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from '@/context/AuthContext';
import { AnalysisResult } from "./AnalysisResult";
import { UploadCloud, MapPin, Map, Loader2 } from "lucide-react";

export function UploadForm() {
    const [files, setFiles] = useState<File[]>([]);
    const [previews, setPreviews] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState("");
    const [locationLoading, setLocationLoading] = useState(false);
    const [houseAddress, setHouseAddress] = useState("");
    const [ownerLat, setOwnerLat] = useState("");
    const [ownerLon, setOwnerLon] = useState("");
    const { token } = useAuth();

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const selectedFiles = Array.from(e.target.files);
            setFiles(selectedFiles);
            setPreviews(selectedFiles.map(f => URL.createObjectURL(f)));
        }
    };

    const handleUseCurrentLocation = () => {
        if (!navigator.geolocation) {
            setError("Geolocation is not supported by your browser.");
            return;
        }

        setLocationLoading(true);
        setError("");

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setOwnerLat(position.coords.latitude.toFixed(6));
                setOwnerLon(position.coords.longitude.toFixed(6));
                setLocationLoading(false);
            },
            (geoError) => {
                setError(`Unable to fetch current location: ${geoError.message}`);
                setLocationLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000 }
        );
    };

    const handleAnalyze = async () => {
        if (files.length === 0) {
            setError("Please upload at least one image.");
            return;
        }

        if ((ownerLat && !ownerLon) || (!ownerLat && ownerLon)) {
            setError("Please provide both latitude and longitude.");
            return;
        }

        setError("");
        setLoading(true);

        try {
            const formData = new FormData();
            files.forEach(file => {
                formData.append('images', file);
            });
            if (houseAddress.trim()) {
                formData.append('owner_address_text', houseAddress.trim());
            }
            if (ownerLat && ownerLon) {
                formData.append('owner_lat', ownerLat);
                formData.append('owner_lon', ownerLon);
            }

            const res = await fetch('/api/waste/analyze', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to analyze images');

            setResult(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    if (result) {
        return <AnalysisResult data={result} onReset={() => { setResult(null); setFiles([]); setPreviews([]); }} />;
    }

    return (
        <Card className="w-full glass-card border-primary/20 transition-all duration-300 relative overflow-hidden shadow-xl">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-emerald-400 to-violet-500"></div>
            <CardHeader className="space-y-2 pb-6">
                <CardTitle className="text-3xl font-heading flex items-center gap-2">
                    <UploadCloud className="w-8 h-8 text-primary" />
                    Appraise Local Scrap
                </CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                    Upload up to 5 photos directly from your device.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label htmlFor="image-files" className="text-sm font-semibold flex items-center gap-2">
                        Upload Images
                    </Label>
                    <div className="relative border-2 border-dashed border-primary/30 rounded-xl p-8 hover:bg-primary/5 transition-colors text-center group cursor-pointer overflow-hidden">
                        <Input
                            id="image-files"
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <UploadCloud className="w-10 h-10 mx-auto text-primary/60 group-hover:text-primary transition-colors mb-2" />
                        <p className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                            <span className="text-primary font-medium">Click to upload</span> or drag and drop
                        </p>
                    </div>
                </div>

                <div className="space-y-3">
                    <Label htmlFor="house-address" className="text-sm font-semibold flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-primary" /> House Address (Optional)
                    </Label>
                    <Input
                        id="house-address"
                        value={houseAddress}
                        onChange={(e) => setHouseAddress(e.target.value)}
                        placeholder="Ex: House 12, Dhanmondi, Dhaka"
                        className="bg-background/50 h-11"
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <Label htmlFor="owner-lat" className="text-sm font-semibold flex items-center gap-2">
                            <Map className="w-4 h-4 text-primary" /> Latitude
                        </Label>
                        <Input
                            id="owner-lat"
                            value={ownerLat}
                            onChange={(e) => setOwnerLat(e.target.value)}
                            placeholder="23.7267"
                            className="bg-background/50 h-11"
                        />
                    </div>
                    <div className="space-y-3">
                        <Label htmlFor="owner-lon" className="text-sm font-semibold flex items-center gap-2">
                            <Map className="w-4 h-4 text-primary" /> Longitude
                        </Label>
                        <Input
                            id="owner-lon"
                            value={ownerLon}
                            onChange={(e) => setOwnerLon(e.target.value)}
                            placeholder="90.3988"
                            className="bg-background/50 h-11"
                        />
                    </div>
                </div>

                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleUseCurrentLocation}
                    disabled={locationLoading}
                    className="w-full bg-secondary/50 hover:bg-secondary/80 text-secondary-foreground"
                >
                    {locationLoading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Fetching Location...
                        </>
                    ) : (
                        "Use Current Browser Location"
                    )}
                </Button>

                {previews.length > 0 && (
                    <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3 animate-in fade-in zoom-in-95 duration-300">
                        {previews.map((preview, idx) => (
                            <div key={idx} className="rounded-xl overflow-hidden border border-border/50 aspect-square relative flex items-center justify-center group shadow-sm">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={preview} alt={`Preview ${idx + 1}`} className="object-cover w-full h-full opacity-90 group-hover:scale-105 group-hover:opacity-100 transition-all duration-300" />
                            </div>
                        ))}
                    </div>
                )}

                {error && (
                    <div className="text-sm text-destructive font-medium bg-destructive/10 p-4 rounded-lg border border-destructive/20 animate-in fade-in slide-in-from-top-2">
                        {error}
                    </div>
                )}
            </CardContent>
            <CardFooter className="pt-2 pb-8">
                <Button
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-lg rounded-xl glow-primary transition-all disabled:opacity-70 disabled:hover:scale-100"
                    onClick={handleAnalyze}
                    disabled={loading || files.length === 0}
                >
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Analyzing with Vangari AI...
                        </>
                    ) : (
                        "Analyze with Vangari AI"
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
