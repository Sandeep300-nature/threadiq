import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getRouteDetails } from '../../services/routingService';
import { calculateDeliveryETA } from '../../utils/etaUtils';
import { RotateCcw, Layers } from 'lucide-react';
import karnatakaBoundary from '../../data/karnatakaBoundary.json';

// Geographic coordinates for Karnataka State, India
const KARNATAKA_BENGALURU_CENTER = [12.9716, 77.5946];
const KARNATAKA_DEFAULT_ZOOM = 7;
// Bounding box constraint for Karnataka and immediate surroundings (prevents panning away to USA or other regions)
const KARNATAKA_PAN_BOUNDS = [
  [10.5, 72.8], // Southwest (Arabian Sea / Kerala border)
  [19.2, 79.2]  // Northeast (Maharashtra / Telangana border)
];

export const StoreRadarMap = ({
  stores = [],
  selectedStore = null,
  onSelectStore,
  showTransferRoutes = true,
  transfers = [],
  selectedTransfer = null,
  onSelectTransfer,
  storeStatuses = {},
  selectedProduct = 'All Products'
}) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersLayerRef = useRef(null);
  const routesLayerRef = useRef(null);
  const boundaryLayerRef = useRef(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Initialize Leaflet Map once focused on Karnataka, India
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: KARNATAKA_BENGALURU_CENTER,
        zoom: KARNATAKA_DEFAULT_ZOOM,
        minZoom: 6,
        maxZoom: 18,
        maxBounds: KARNATAKA_PAN_BOUNDS,
        maxBoundsViscosity: 0.85,
        zoomControl: false,
        attributionControl: false
      });

      // Configure Tile Provider:
      // Uses legitimate OpenStreetMap tiles with dark obsidian styling
      const cartoKey = import.meta.env.VITE_CARTO_API_KEY;

      const tileUrl = cartoKey
        ? `https://{s}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}{r}.png?key=${encodeURIComponent(cartoKey)}`
        : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

      const tileAttribution = cartoKey
        ? '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer">CARTO</a>'
        : '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors';

      const tileLayer = L.tileLayer(tileUrl, {
        maxZoom: 19,
        subdomains: cartoKey ? 'abcd' : 'abc',
        className: cartoKey ? 'carto-tiles' : 'osm-dark-tiles',
        attribution: tileAttribution
      });

      tileLayer.addTo(map);

      // Render Karnataka State Geographical Boundary
      try {
        const boundaryLayer = L.geoJSON(karnatakaBoundary, {
          style: {
            color: 'rgba(255, 255, 255, 0.4)',
            weight: 1.8,
            opacity: 0.75,
            fillColor: 'rgba(255, 255, 255, 0.03)',
            fillOpacity: 0.04,
            dashArray: '5, 5'
          }
        }).addTo(map);
        boundaryLayerRef.current = boundaryLayer;

        // Auto-fit view to Karnataka state bounds
        map.fitBounds(boundaryLayer.getBounds(), {
          padding: [30, 30],
          maxZoom: 7
        });
      } catch (err) {
        console.warn('Could not render Karnataka boundary layer', err);
      }

      // Add zoom control in top-left
      L.control.zoom({ position: 'topleft' }).addTo(map);

      // Attribution in bottom-right
      L.control.attribution({ position: 'bottomright', prefix: false }).addTo(map);

      // Layer groups for markers and transfer routes
      markersLayerRef.current = L.layerGroup().addTo(map);
      routesLayerRef.current = L.layerGroup().addTo(map);

      mapInstanceRef.current = map;
    }
  }, []);

  // Update Markers and Routes whenever stores, transfers, or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !markersLayerRef.current || !routesLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    routesLayerRef.current.clearLayers();

    if (stores.length === 0) return;

    // 1. Render Store Markers (Preserve Stock Status Colors: Green, Yellow, Red, Slate Grey for Not Configured)
    stores.forEach((store) => {
      if (!store.lat || !store.lng) return;

      const latLng = [store.lat, store.lng];

      const statusObj = storeStatuses[store.id] || {
        status: store.status || 'Balanced',
        statusType: 'success',
        color: '#10b981',
        isPulsing: false,
        isConfigured: true
      };

      const isUnconfigured = statusObj.statusType === 'not_configured';
      const isStoreSelected = selectedStore?.id === store.id;

      // Check if this store is an active source or destination in the currently selected transfer
      const isTransferSource = selectedTransfer?.sourceStoreId === store.id;
      const isTransferDest = selectedTransfer?.destStoreId === store.id;

      // Extract short 3-letter city code for center of radar marker (e.g., JAY, RAJ, WFD, MAR, YEL, WH)
      let codeLabel = store.city ? store.city.substring(0, 3).toUpperCase() : 'STR';
      if (store.name === 'Jayanagar') codeLabel = 'JAY';
      else if (store.name === 'Rajajinagar') codeLabel = 'RAJ';
      else if (store.name === 'Whitefield') codeLabel = 'WFD';
      else if (store.name === 'Marathahalli') codeLabel = 'MAR';
      else if (store.name === 'Yelahanka') codeLabel = 'YEL';
      else if (store.name === 'Peenya WH' || store.isWarehouse || store.storeType === 'Warehouse') codeLabel = 'WH';
      else if (store.city === 'Bengaluru') codeLabel = 'BLR';
      else if (store.city === 'Mysuru') codeLabel = 'MYS';
      else if (store.city === 'Mangaluru') codeLabel = 'MNG';
      else if (store.city?.includes('Hubballi')) codeLabel = 'HUB';
      else if (store.city === 'Belagavi') codeLabel = 'BEL';
      else if (store.city === 'Kalaburagi') codeLabel = 'KLB';
      else if (store.city === 'Shivamogga') codeLabel = 'SMG';
      else if (store.city === 'Davanagere') codeLabel = 'DVG';

      const isWh = store.isWarehouse || store.storeType === 'Warehouse';

      // Custom divIcon with circular color ring, center point, and pulse animation
      const markerHtml = `
        <div class="radar-marker-wrap ${isStoreSelected ? 'selected' : ''} ${statusObj.isPulsing ? 'pulsing' : ''} ${isUnconfigured ? 'unconfigured-node' : ''} ${isTransferSource ? 'transfer-source-node' : ''} ${isTransferDest ? 'transfer-dest-node' : ''} ${isWh ? 'warehouse-node' : ''}" style="--marker-color: ${statusObj.color}" data-store-id="${store.id}" data-store-name="${store.name}">
          ${!isUnconfigured ? '<div class="radar-pulse-ring"></div>' : ''}
          <div class="radar-marker-outer" style="border-color: ${statusObj.color}; border-style: ${isUnconfigured ? 'dashed' : 'solid'}; background-color: rgba(10, 11, 15, 0.9);" data-store-id="${store.id}">
            <span class="radar-marker-code font-tech" style="color: ${statusObj.color}; ${isUnconfigured ? 'opacity: 0.6;' : ''}">
              ${codeLabel}
            </span>
          </div>
          ${isWh ? '<div class="unconfigured-marker-pill font-tech" style="background: rgba(37,99,235,0.85); color:#ffffff; border-color:#60a5fa;">CENTRAL WH</div>' : ''}
          ${isUnconfigured && !isWh ? '<div class="unconfigured-marker-pill font-tech">NO CATALOGUE</div>' : ''}
          ${isTransferSource ? '<div class="transfer-role-pill source">EXCESS SOURCE</div>' : ''}
          ${isTransferDest ? '<div class="transfer-role-pill dest">SHORTAGE TARGET</div>' : ''}
          ${isStoreSelected && !isTransferSource && !isTransferDest ? '<div class="radar-selected-indicator"></div>' : ''}
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-radar-leaflet-icon',
        html: markerHtml,
        iconSize: [44, 44],
        iconAnchor: [22, 22],
        popupAnchor: [0, -24]
      });

      const marker = L.marker(latLng, { icon: customIcon });

      // Click handler
      marker.on('click', () => {
        onSelectStore(store);
      });

      // Tooltip with store info and status
      const tooltipContent = isUnconfigured
        ? `
          <div class="radar-tooltip-content font-tech">
            <div class="radar-tooltip-title">${store.name} (${store.city || store.location || ''}) ${isWh ? '📦 [CENTRAL WAREHOUSE]' : ''}</div>
            <div class="radar-tooltip-status" style="color: #a1a1aa;">
              ⊗ Inventory Not Configured
            </div>
            <div class="radar-tooltip-meta text-dim">
              No inventory configured for ${selectedProduct !== 'All Products' ? `<strong>${selectedProduct}</strong>` : 'this product'}.
            </div>
            <div style="color: #71717a; font-size: 0.65rem; margin-top: 2px;">
              Explicit State: Zero stock is not assumed.
            </div>
          </div>
        `
        : `
          <div class="radar-tooltip-content font-tech">
            <div class="radar-tooltip-title">${store.name} (${store.city || store.location || ''}) ${isWh ? '📦 [CENTRAL WAREHOUSE]' : ''}</div>
            <div class="radar-tooltip-status" style="color: ${statusObj.color};">
              ● ${statusObj.label || statusObj.status}
            </div>
            <div class="radar-tooltip-meta text-dim">
              ${selectedProduct !== 'All Products' ? `${selectedProduct}: ` : ''}
              <strong>${statusObj.totalUnits?.toLocaleString() ?? 0} units</strong>
              ${statusObj.lowStockSizes?.length ? ` • Low: ${statusObj.lowStockSizes.join(', ')}` : ''}
              ${statusObj.outOfStockSizes?.length ? ` • Out: ${statusObj.outOfStockSizes.join(', ')}` : ''}
              ${statusObj.excessStockSizes?.length ? ` • Excess: ${statusObj.excessStockSizes.join(', ')}` : ''}
            </div>
            ${store.customerProfile ? `<div style="color: #93c5fd; font-size: 0.68rem; margin-top: 2px;">Profile: ${store.customerProfile}</div>` : ''}
            ${isTransferSource ? '<div style="color: #eab308; font-weight: 700; margin-top: 2px;">⚡ Active Transfer Origin</div>' : ''}
            ${isTransferDest ? '<div style="color: #f43f5e; font-weight: 700; margin-top: 2px;">⚡ Active Transfer Target</div>' : ''}
          </div>
        `;

      marker.bindTooltip(tooltipContent, {
        direction: 'top',
        offset: [0, -18],
        className: 'radar-map-custom-tooltip',
        opacity: 0.95
      });

      marker.addTo(markersLayerRef.current);
    });

    // 2. Render Transfer Routes (Using Driving Road Route API Geometry when available)
    if (showTransferRoutes && transfers.length > 0) {
      transfers.forEach(async (tr) => {
        const sourceStore = stores.find((s) => s.id === tr.sourceStoreId);
        const destStore = stores.find((s) => s.id === tr.destStoreId);

        if (sourceStore?.lat && sourceStore?.lng && destStore?.lat && destStore?.lng) {
          const isSelectedRoute = selectedTransfer?.transferId === tr.transferId;

          // Fetch turn-by-turn road driving route or transparent Haversine fallback
          const routeDetails = await getRouteDetails(
            sourceStore.lat,
            sourceStore.lng,
            destStore.lat,
            destStore.lng
          );

          // Calculate ETA dynamically for tooltip
          const eta = calculateDeliveryETA(
            routeDetails.distanceKm,
            tr.deliveryMode || 'normal',
            tr.dispatchTime,
            routeDetails.durationSeconds
          );

          // Create Leaflet Polyline (Monochrome route separate from stock-status colors)
          const polyline = L.polyline(routeDetails.geometry, {
            color: isSelectedRoute ? '#ffffff' : '#a1a1aa',
            weight: isSelectedRoute ? 3.5 : 2.5,
            opacity: isSelectedRoute ? 0.95 : 0.8,
            dashArray: '8, 8',
            className: `radar-transfer-route-line ${isSelectedRoute ? 'selected-route' : ''}`
          });

          // Click listener on route line
          polyline.on('click', () => {
            if (onSelectTransfer) onSelectTransfer(tr);
          });

          // Tooltip on route hover showing distance in km, mode, and ETA
          const routeTooltipContent = `
            <div class="radar-route-tooltip font-tech">
              <div class="route-badge">TRANSFER // ${tr.transferId} (${(tr.deliveryMode || 'normal').toUpperCase()})</div>
              <div class="route-info">${tr.productName} (${tr.size}) • ${tr.quantity} units</div>
              <div class="route-qty">
                Distance: <strong style="color: #ffffff;">${routeDetails.distanceKm.toLocaleString()} km</strong> (${routeDetails.isDrivingRoute ? 'Road' : 'Straight-line'})
              </div>
              <div style="color: #ffffff; font-weight: 700;">
                ETA: ${eta.formattedDuration} (${eta.formattedArrival})
              </div>
              <div class="text-dim" style="font-size: 0.65rem; margin-top: 1px;">Click route to inspect full logistics</div>
            </div>
          `;

          polyline.bindTooltip(routeTooltipContent, {
            direction: 'center',
            permanent: false,
            className: 'radar-route-custom-tooltip'
          });

          if (routesLayerRef.current) {
            polyline.addTo(routesLayerRef.current);
          }
        }
      });
    }
  }, [stores, selectedStore, showTransferRoutes, transfers, selectedTransfer, storeStatuses, onSelectStore, onSelectTransfer]);

  // Reset view to fit all visible store markers or Karnataka state boundaries
  const handleResetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (boundaryLayerRef.current) {
      map.fitBounds(boundaryLayerRef.current.getBounds(), {
        padding: [30, 30],
        maxZoom: 7,
        animate: true,
        duration: 0.8
      });
    } else {
      const validCoords = stores.filter((s) => s.lat && s.lng).map((s) => [s.lat, s.lng]);
      if (validCoords.length > 0) {
        map.fitBounds(L.latLngBounds(validCoords), {
          padding: [50, 50],
          maxZoom: 7,
          animate: true,
          duration: 0.8
        });
      } else {
        map.setView(KARNATAKA_BENGALURU_CENTER, KARNATAKA_DEFAULT_ZOOM, { animate: true });
      }
    }
  };

  return (
    <div className={`radar-map-outer-container ${isDarkMode ? 'dark-mode-tiles' : 'standard-mode-tiles'}`}>
      {/* Map Viewport Element */}
      <div
        ref={mapContainerRef}
        className="radar-map-viewport"
        role="region"
        aria-label="Interactive Store Radar Map with Transfer Routes"
      />

      {/* Floating Map Controls on Top-Right */}
      <div className="radar-map-floating-controls">
        <button
          onClick={() => setIsDarkMode((prev) => !prev)}
          className="radar-map-control-btn font-tech"
          title="Toggle map cartography theme (Dark Obsidian / Standard Cartography)"
          aria-label="Toggle map cartography theme"
        >
          <Layers size={13} />
          <span>{isDarkMode ? 'Dark Radar' : 'Natural Map'}</span>
        </button>

        <button
          onClick={handleResetView}
          className="radar-map-control-btn font-tech"
          title="Reset map view to show Karnataka network"
          aria-label="Reset map view to fit Karnataka state"
        >
          <RotateCcw size={13} />
          <span>Reset View</span>
        </button>
      </div>

      {/* Map Legend Overlay in Bottom-Left */}
      <div className="radar-map-legend-overlay font-tech">
        <div className="radar-legend-title">KARNATAKA INVENTORY RADAR [DEMO]:</div>
        <div className="radar-legend-row">
          <span className="radar-legend-dot dot-green" />
          <span>GREEN — Balanced Stock (Healthy target)</span>
        </div>
        <div className="radar-legend-row">
          <span className="radar-legend-dot dot-yellow" />
          <span>YELLOW — Excess Stock (&gt;75 target)</span>
        </div>
        <div className="radar-legend-row">
          <span className="radar-legend-dot dot-red" />
          <span>RED — Low Stock / Shortage (&lt;15 target)</span>
        </div>
        <div className="radar-legend-row">
          <span className="radar-legend-dot" style={{ backgroundColor: '#71717a', border: '1px dashed #ffffff' }} />
          <span>GREY DASH — Inventory Not Configured</span>
        </div>
        {showTransferRoutes && (
          <div className="radar-legend-row route-legend-item">
            <span className="radar-legend-line" />
            <span>WHITE DASH — State Transfer Route (ETA Enabled)</span>
          </div>
        )}
        <div className="radar-legend-row" style={{ marginTop: 2, fontSize: '0.62rem', color: '#a1a1aa' }}>
          <span>● Karnataka State Boundary Outline Active</span>
        </div>
      </div>
    </div>
  );
};
