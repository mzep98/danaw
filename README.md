# DANAW
> **Decentralized Aquaculture Swarm Platform for Real-Time Thermocline Inversion Forecasting & Fish Kill Prevention**

[![Status](https://img.shields.io/badge/Status-Complete%20%2F%20Ready%20for%20Presentation-success.svg)]()
[![Platform](https://img.shields.io/badge/Platform-IoT%20%2F%20Edge%20AI%20%2F%20Expo-orange.svg)]()
[![Target Ecosystems](https://img.shields.io/badge/Target-Lakes%20Buhi%20%26%20Bato-blue.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## About DANAW
**DANAW** is an advanced aquaculture intelligence and swarm telemetry platform engineered to monitor, analyze, and forecast thermocline inversions and water quality shifts in vulnerable freshwater bodies (specifically optimized for **Lakes Buhi and Bato**)[cite: 4]. By deploying synchronized edge nodes connected via LoRa mesh networks and predictive machine learning models, DANAW equips fish farmers with early-warning telemetry and automated mitigation triggers to prevent catastrophic fish kills[cite: 4].

---

## Hardware 3D Design & Architecture
> *IP68-rated Arduino-powered buoy node equipped with multi-depth thermal arrays and Meshtastic LoRa communication.*

*(Note: Place your 3D model export or hardware render in `assets/images/buoy_3d.png`)*
<p align="center">
  <img src="assets/images/buoy_3d.png" width="550" alt="DANAW Hardware 3D Model">
</p>

---

## App Preview & UI/UX Design
> *Clean, high-performance interfaces tailored for field deployment and rapid farmer response.*

<table>
  <tr>
    <td align="center"><b>Dashboard</b></td>
    <td align="center"><b>Swarm Nodes</b></td>
    <td align="center"><b>Spatial Map</b></td>
  </tr>
  <tr>
    <td><img src="assets/images/dash.png" width="230" alt="Dashboard"></td>
    <td><img src="assets/images/nodes.png" width="230" alt="Nodes"></td>
    <td><img src="assets/images/map.png" width="230" alt="Map"></td>
  </tr>
  <tr>
    <td align="center"><b>Predictive Forecast</b></td>
    <td align="center"><b>Computer Vision</b></td>
    <td></td>
  </tr>
  <tr>
    <td><img src="assets/images/forecast.png" width="230" alt="Forecast"></td>
    <td><img src="assets/images/vision.png" width="230" alt="Vision"></td>
    <td></td>
  </tr>
</table>

---

## Core System Modules

### 1. Dashboard
- **3-Level Depth Telemetry Scroller:** Real-time water column profiling across stratified layers for precise environmental inspection[cite: 4].
- **LoRa Control Hub & O2 Pump Station:** Remote actuation interface for manual or automated aeration control to stabilize dissolved oxygen levels[cite: 6].
- **Depth Intelligence Card:** Interactive deep-dive module with quick-access profile expansion and performance metrics.

### 2. Swarm Nodes
- **Swarm Setup & Network Topology:** Real-time visualization of node health, connectivity paths, and mesh signal status[cite: 6].
- **Smart Filtering:** Instant filtering controls supporting All Connected, Unpaired, and All nodes.

### 3. Spatial Map
- **Topobathymetry Overlays:** High-resolution spatial mapping combining lake contour depth data with live water column metrics[cite: 4].
- **Dynamic Node Inspection:** Clean map-first layout where detailed node metrics appear dynamically via interactive selection.

### 4. Predictive Forecast
- **Stratification Index & Inversion Alerts:** Early-warning analytics detecting thermal layer inversion risks before anaerobic conditions occur[cite: 4].
- **Observed + Forecast Graphs:** Time-series prediction trends tracking thermal shifts and environmental parameters[cite: 4].
- **Automated Aeration Feedback:** Seamless command dispatch with clear operational states for emergency pump triggers[cite: 6].

### 5. Computer Vision & Analytics
- **Schooling Density Tracking:** Edge vision insights evaluating fish behavior, spatial distribution, and biomass metrics[cite: 6].
- **Interactive Event Timeline:** Historical tracking log for water parameter anomalies, alerts, and system responses.

---

## Tech Stack & Architecture
- **Frontend / Mobile:** React Native & Expo framework (`npx expo start`)
- **Hardware & Communication:** Microcontroller units equipped with LoRa transceivers (Meshtastic-compatible infrastructure), multi-depth temperature/DO sensors, and bathymetric sonar/LiDAR integration[cite: 4].
- **Intelligence & Processing:** Time-series forecasting algorithms and spatial interpolation models[cite: 4].

---

## Repository Structure
```text
├── assets/
│   └── images/           # App screenshots (dash, nodes, map, forecast, vision, buoy_3d)
├── src/
│   ├── components/       # UI views (Dashboard, Nodes, Map, Forecast, Vision)
│   ├── assets/           # Icons, map graphics, and styling assets
│   └── services/         # Telemetry sync and sensor data handlers
├── public/               # Static assets and layout templates
├── README.md
└── LICENSE