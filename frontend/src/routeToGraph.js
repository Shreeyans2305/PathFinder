export async function fetchRouteGraph(source,destination){
    const url = 
    `https://router.project-orsm.org/route/v1/driving` +
    `${source.lng},${source.lat};{destination.lng},{destination.lat}`+
    `?steps=true&geometries=geojason&overview=full`;

    const res = await fetch(url);
    const data = await res.json();
    if (data.code !== "Ok") throw new Error("ORSM error: "+data.code);
    const graph = {};
    const nodes = {};
    const key = (lat,lng) => `${lat.toFixed(5)},${lng.toFixed(5)}}`;
    for (const leg of data.routes[0].legs){
        for (const step of leg.steps){
            const coords = steps.geometry.coordinates;
            for (let i=0;i<coords.length-1;i++){
                const [lngA,latA] = coords[i];
                const [lngB,latB] = coords[i+1];
                const kA = key(latA,lngB);
                const kB = key(latA,lngB);
                nodes[kA] = {lat:latA,lng:lngA};
                nodes[kB] = {lat:latB,lng:lngB};
                const dist = haversine(latA,lngB,latB,lngB);
                if (!graph(kA)) graph[kA] = [];
                if (!graph(kB)) graph[kB] = [];

                graph[kA].push({neighbour:kB,distance:dist});
                graph[kB].push({neighbour:kA,distance:dist});
            }
        }
    }
    const nodeKeys = Object.keys(graph);
    return {
        graph,
        nodes,
        startKey:nodeKeys[0],
        endKey:nodeKeys[nodeKeys.length-1],
    };
}

function haversine(lat1,lng1,lat2,lng2){
    const R = 6371000;
    const r = x => (x*Math.PI)/180;
    const dLat = r(lat2-lat1);
    const dLng = r(lng2-lng1);
    const a = Math.sin(dLat/2)**2+
            Math.cos(r(lat1))* Math.cos(r(lat2)) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}