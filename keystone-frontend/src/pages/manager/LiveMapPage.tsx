import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { trackingService, userService } from '@/services/index';
import { LocationResponse, RouteOptimizationResponse, User } from '@/types';
import {
  Navigation, Zap, Fuel, Clock, MapPin, Play, CheckCircle2,
  TrendingDown, Shield, Users, Compass
} from 'lucide-react';
import toast from 'react-hot-toast';
import 'leaflet/dist/leaflet.css';

// Fix default marker icons broken by Vite bundling
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const techIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const startDepotIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-black.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41], iconAnchor: [12, 41], popupAnchor: [1, -34],
});

const stopIcon = (num: number) => L.divIcon({
  className: 'custom-stop-marker',
  html: `<div style="
    background: #2563eb;
    color: white;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    font-size: 13px;
    border: 3px solid white;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1);
  ">${num}</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

function FitBounds({ positions }: { positions: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (positions.length > 0) {
      map.fitBounds(positions, { padding: [50, 50], maxZoom: 14 });
    }
  }, [positions, map]);
  return null;
}

export default function LiveMapPage() {
  const [activeTab, setActiveTab] = useState<'live' | 'route'>('route');
  const [locations, setLocations] = useState<Map<number, LocationResponse>>(new Map());
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [selectedTechId, setSelectedTechId] = useState<number>(3); // Demo Tech ID
  const [routeData, setRouteData] = useState<RouteOptimizationResponse | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const stompRef = useRef<Client | null>(null);

  // Load technicians list
  useEffect(() => {
    userService.getTechnicians().then(list => {
      setTechnicians(list);
      if (list.length > 0) setSelectedTechId(list[0].id);
    }).catch(() => {});
  }, []);

  // Load initial snapshot of latest locations
  useEffect(() => {
    trackingService.getAllLatest().then(list => {
      setLocations(new Map(list.map(l => [l.userId, l])));
    }).catch(() => {});
  }, []);

  // Subscribe to live WebSocket updates
  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    const client = new Client({
      webSocketFactory: () => new SockJS('/ws'),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/locations', (msg) => {
          const loc: LocationResponse = JSON.parse(msg.body);
          setLocations(prev => new Map(prev).set(loc.userId, loc));
        });
      },
    });
    client.activate();
    stompRef.current = client;
    return () => { client.deactivate(); };
  }, []);

  // Fetch Route Optimization
  useEffect(() => {
    if (selectedTechId) {
      trackingService.getOptimizedRoute(selectedTechId)
        .then(setRouteData)
        .catch(err => console.error('Route error:', err));
    }
  }, [selectedTechId]);

  const handleSimulateDrive = async () => {
    if (!selectedTechId) return;
    setIsSimulating(true);
    toast.success('Live simulated driving started! Broadcasting GPS waypoints...', { icon: '🚗' });
    try {
      await trackingService.simulateDrive(selectedTechId);
    } catch (e) {
      toast.error('Simulation completed');
    } finally {
      setTimeout(() => setIsSimulating(false), 5000);
    }
  };

  const techList = Array.from(locations.values());
  const livePositions: [number, number][] = techList.map(l => [l.latitude, l.longitude]);

  // Positions for route bounds
  const routePositions: [number, number][] = routeData
    ? [
        [routeData.startLocation.latitude, routeData.startLocation.longitude],
        ...routeData.stops.map(s => [s.latitude, s.longitude] as [number, number]),
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
            <Compass className="w-7 h-7 text-primary-600" />
            Field Dispatch & Route Optimization
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Real-time GPS tracking and TSP algorithmic route optimization for minimum travel time and fuel cost
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab selector */}
          <div className="bg-gray-100 dark:bg-gray-800 p-1 rounded-xl flex items-center border border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('route')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'route'
                  ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Navigation className="w-3.5 h-3.5" />
              Route Optimizer
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all ${
                activeTab === 'live'
                  ? 'bg-white dark:bg-gray-900 text-primary-600 shadow-sm'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Fleet Live Map
            </button>
          </div>

          <span className="flex items-center gap-1.5 text-xs text-green-600 font-semibold px-2.5 py-1 bg-green-50 rounded-lg">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            STOMP Live
          </span>
        </div>
      </div>

      {/* Route Optimization Metrics Ribbon (Shown in Route mode) */}
      {activeTab === 'route' && routeData && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          <div className="card p-3.5 bg-gradient-to-br from-blue-50 to-indigo-50/50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-100 dark:border-blue-900">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Optimized Route</span>
              <Navigation className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {routeData.totalDistanceKm} <span className="text-sm font-normal text-gray-500">km</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              Sequence of {routeData.stops.length} service calls
            </p>
          </div>

          <div className="card p-3.5 bg-gradient-to-br from-emerald-50 to-green-50/50 dark:from-emerald-950/20 dark:to-green-950/20 border-emerald-100 dark:border-emerald-900">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Distance Saved</span>
              <TrendingDown className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {routeData.distanceSavedKm} <span className="text-sm font-normal text-emerald-500">km</span>
            </p>
            <span className="inline-block px-1.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 text-[11px] font-bold rounded mt-0.5">
              -{routeData.savingsPercentage}% vs original
            </span>
          </div>

          <div className="card p-3.5 bg-gradient-to-br from-amber-50 to-orange-50/50 dark:from-amber-950/20 dark:to-orange-950/20 border-amber-100 dark:border-amber-900">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Fuel & CO2 Saved</span>
              <Fuel className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {routeData.fuelSavedLiters} <span className="text-sm font-normal text-gray-500">Liters</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Eco-friendly fleet savings</p>
          </div>

          <div className="card p-3.5 bg-gradient-to-br from-purple-50 to-pink-50/50 dark:from-purple-950/20 dark:to-pink-950/20 border-purple-100 dark:border-purple-900">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-1">
              <span className="text-xs font-semibold uppercase tracking-wider">Estimated Drive</span>
              <Clock className="w-4 h-4" />
            </div>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {routeData.estimatedDriveTimeMinutes} <span className="text-sm font-normal text-gray-500">mins</span>
            </p>
            <p className="text-xs text-gray-500 mt-0.5">Continuous schedule flow</p>
          </div>
        </div>
      )}

      {/* Main Map + Side Itinerary View */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Leaflet Map Card */}
        <div className="lg:col-span-2 card overflow-hidden flex flex-col" style={{ height: '68vh' }}>
          {/* Map Top Bar */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800/80 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between gap-3 text-sm">
            {activeTab === 'route' ? (
              <div className="flex items-center gap-3">
                <span className="font-medium text-gray-700 dark:text-gray-300">Technician:</span>
                <select
                  value={selectedTechId}
                  onChange={(e) => setSelectedTechId(Number(e.target.value))}
                  className="input py-1 px-2.5 text-xs font-semibold bg-white dark:bg-gray-900 w-44"
                >
                  {technicians.map(t => (
                    <option key={t.id} value={t.id}>{t.fullName}</option>
                  ))}
                  {technicians.length === 0 && (
                    <option value={3}>James Walker (Tech #3)</option>
                  )}
                </select>
              </div>
            ) : (
              <span className="font-semibold text-gray-700 dark:text-gray-300">
                Active Fleet ({techList.length} Units Online)
              </span>
            )}

            {activeTab === 'route' && (
              <button
                onClick={handleSimulateDrive}
                disabled={isSimulating}
                className="btn-primary py-1 px-3 text-xs flex items-center gap-1.5 shadow-sm"
              >
                <Play className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                {isSimulating ? 'Simulating Drive...' : 'Simulate Live Drive'}
              </button>
            )}
          </div>

          {/* Leaflet Map Container */}
          <div className="flex-1 relative">
            <MapContainer
              center={[25.2048, 55.2708]}
              zoom={12}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />

              {/* ROUTE OPTIMIZATION MODE */}
              {activeTab === 'route' && routeData && (
                <>
                  <FitBounds positions={routePositions} />

                  {/* Polyline Path */}
                  <Polyline
                    positions={routeData.polylineCoordinates as [number, number][]}
                    color="#2563eb"
                    weight={5}
                    opacity={0.8}
                    dashArray="10, 6"
                  />

                  {/* Start Depot Marker */}
                  <Marker
                    position={[routeData.startLocation.latitude, routeData.startLocation.longitude]}
                    icon={startDepotIcon}
                  >
                    <Popup>
                      <div className="text-xs">
                        <p className="font-bold text-gray-900">Dispatch Hub / Start</p>
                        <p className="text-gray-500">{routeData.startLocation.address}</p>
                        <p className="text-blue-600 font-semibold mt-1">Departure: 09:00 AM</p>
                      </div>
                    </Popup>
                  </Marker>

                  {/* Numbered Stops Markers */}
                  {routeData.stops.map((stop) => (
                    <Marker
                      key={stop.stopNumber}
                      position={[stop.latitude, stop.longitude]}
                      icon={stopIcon(stop.stopNumber)}
                    >
                      <Popup>
                        <div className="text-xs space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-primary-600">Stop #{stop.stopNumber}</span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              {stop.priority}
                            </span>
                          </div>
                          <p className="font-bold text-gray-900">{stop.title}</p>
                          <p className="text-gray-500">{stop.customerName} - {stop.siteAddress}</p>
                          <div className="pt-1 text-[11px] border-t border-gray-100 text-gray-600 flex justify-between">
                            <span>ETA: <strong>{stop.estimatedArrival}</strong></span>
                            <span>Duration: <strong>{stop.durationMinutes} min</strong></span>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>
              )}

              {/* FLEET LIVE TRACKING MODE */}
              {activeTab === 'live' && (
                <>
                  {livePositions.length > 0 && <FitBounds positions={livePositions} />}
                  {techList.map((loc) => (
                    <Marker key={loc.userId} position={[loc.latitude, loc.longitude]} icon={techIcon}>
                      <Popup>
                        <div className="text-xs space-y-1">
                          <p className="font-bold text-gray-900">Technician #{loc.userId}</p>
                          <p className="text-gray-500 font-mono">
                            {loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}
                          </p>
                          {loc.speed != null && <p>Speed: {loc.speed.toFixed(1)} km/h</p>}
                          {loc.heading != null && <p>Heading: {loc.heading.toFixed(0)}°</p>}
                          <p className="text-gray-400 text-[10px]">
                            Last Ping: {new Date(loc.recordedAt).toLocaleTimeString()}
                          </p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </>
              )}
            </MapContainer>
          </div>
        </div>

        {/* Right Sidebar: Optimized Itinerary Schedule */}
        <div className="card p-4 flex flex-col h-[68vh] overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h3 className="font-bold text-gray-900 dark:text-white text-base">
                {activeTab === 'route' ? 'Daily Service Itinerary' : 'Online Technicians'}
              </h3>
              <p className="text-xs text-gray-500">
                {activeTab === 'route' ? 'Optimized sequential order' : 'Real-time telemetry'}
              </p>
            </div>
            {activeTab === 'route' && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                {routeData?.stops.length ?? 0} Stops
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pt-3 pr-1">
            {activeTab === 'route' && routeData?.stops.map((stop) => (
              <div
                key={stop.stopNumber}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary-600 text-white font-bold text-xs flex items-center justify-center">
                      {stop.stopNumber}
                    </span>
                    <div>
                      <span className="text-xs font-mono font-semibold text-gray-500">{stop.woNumber}</span>
                      <h4 className="text-sm font-bold text-gray-900 dark:text-white leading-tight">{stop.title}</h4>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    stop.priority === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                    stop.priority === 'HIGH' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {stop.priority}
                  </span>
                </div>

                <div className="mt-2 text-xs text-gray-600 dark:text-gray-400 space-y-1 pl-8">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="truncate">{stop.siteAddress}</span>
                  </p>
                  <div className="flex items-center justify-between text-gray-500 pt-1 border-t border-gray-100 dark:border-gray-700">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      Arrival: <strong className="text-gray-800 dark:text-gray-200">{stop.estimatedArrival}</strong>
                    </span>
                    <span>Job Est: <strong>{stop.durationMinutes}m</strong></span>
                  </div>
                </div>
              </div>
            ))}

            {activeTab === 'live' && techList.map((tech) => (
              <div
                key={tech.userId}
                className="p-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
                    <span className="font-bold text-sm text-gray-900 dark:text-white">
                      Technician #{tech.userId}
                    </span>
                  </div>
                  <span className="text-xs text-gray-500 font-mono">
                    {tech.speed != null ? `${tech.speed.toFixed(0)} km/h` : 'Stationary'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1 pl-4.5">
                  Lat: {tech.latitude.toFixed(4)}, Lng: {tech.longitude.toFixed(4)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
