function toRadians(degrees) {
    return (degrees * Math.PI) / 180;
}

function haversineKm(from, to) {
    const earthRadiusKm = 6371;
    const dLat = toRadians(to.lat - from.lat);
    const dLon = toRadians(to.lon - from.lon);
    const lat1 = toRadians(from.lat);
    const lat2 = toRadians(to.lat);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

async function getRouteSummary(from, to) {
    const routeApi = process.env.ROUTE_API_URL || 'https://router.project-osrm.org';
    const profile = process.env.ROUTE_PROFILE || 'driving';
    const coordinates = `${from.lon},${from.lat};${to.lon},${to.lat}`;

    try {
        const response = await fetch(
            `${routeApi}/route/v1/${profile}/${coordinates}?overview=full&geometries=geojson&steps=true`
        );

        if (!response.ok) {
            throw new Error(`Routing API failed with ${response.status}`);
        }

        const data = await response.json();
        if (!data.routes || data.routes.length === 0) {
            throw new Error('No route found');
        }

        const route = data.routes[0];
        const distanceKm = Number(route.distance || 0) / 1000;
        const durationMinutes = Number(route.duration || 0) / 60;
        const steps = (route.legs || [])
            .flatMap((leg) => leg.steps || [])
            .slice(0, 3)
            .map((step) => step.maneuver?.instruction || step.name)
            .filter(Boolean);

        return {
            provider: 'OSRM',
            distanceKm,
            durationMinutes,
            geometry: route.geometry,
            summary: steps.length > 0 ? steps.join(' -> ') : 'Follow fastest road route from map link.',
            mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=driving`,
        };
    } catch (error) {
        const distanceKm = haversineKm(from, to);

        return {
            provider: 'FALLBACK_STRAIGHT_LINE',
            distanceKm,
            durationMinutes: (distanceKm / 28) * 60,
            geometry: {
                type: 'LineString',
                coordinates: [
                    [from.lon, from.lat],
                    [to.lon, to.lat],
                ],
            },
            summary: 'Straight-line fallback route. Open map link for live road directions.',
            mapsLink: `https://www.google.com/maps/dir/?api=1&origin=${from.lat},${from.lon}&destination=${to.lat},${to.lon}&travelmode=driving`,
            warning: error.message,
        };
    }
}

module.exports = {
    getRouteSummary,
};
