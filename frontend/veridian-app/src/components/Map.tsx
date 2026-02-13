"use client";

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { Icon } from "leaflet";
import { useEffect, useState } from "react";

// Fix for default marker icon in Next.js
const customIcon = new Icon({
    iconUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png",
    iconRetinaUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png",
    shadowUrl: "https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

// Component to handle clicks
function LocationMarker({ onAddTree }: { onAddTree: (pos: [number, number]) => void }) {
    useMapEvents({
        click(e) {
            onAddTree([e.latlng.lat, e.latlng.lng]);
        },
    });
    return null;
}

export default function SimulationMap({ trees, onAddTree }: { trees: Array<[number, number]>, onAddTree: Function }) {
    // Center on New Delhi
    const position: [number, number] = [28.6139, 77.2090];

    return (
        <div className="h-full w-full rounded-3xl overflow-hidden border border-white/10 relative">
            <MapContainer
                center={position}
                zoom={13}
                scrollWheelZoom={true}
                style={{ height: "100%", width: "100%", background: "#050A07" }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                />
                <LocationMarker onAddTree={(pos) => onAddTree(pos)} />

                {trees.map((pos, idx) => (
                    <Marker key={idx} position={pos} icon={customIcon}>
                        <Popup>
                            <div className="text-gray-900 font-bold">LQUID3 Unit #{idx + 1}</div>
                            <div className="text-gray-700 text-xs">Active • Cleaning..</div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            {/* Overlay Instructions */}
            <div className="absolute top-4 right-4 bg-black/80 text-white text-xs px-3 py-2 rounded-lg backdrop-blur-md border border-white/20 z-[400] pointer-events-none">
                Click anywhere to plant a Liquid Tree
            </div>
        </div>
    );
}
