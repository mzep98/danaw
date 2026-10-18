# DANAW

**Depth-stratified Aquatic Network for Anticipating Water-inversions**

A mobile command dashboard that helps smallholder tilapia farmers in Lakes Buhi and Bato (Camarines Sur, Philippines) see an *Overtoun* lake turnover coming and act before it kills their fish. Built for the Philippine Startup Challenge XI.

## What the app does

| Screen | What it shows |
|---|---|
| **Dash** | Dissolved oxygen, water temperature, risk level, an interactive water column profile, and remote aerator and pump controls. |
| **Nodes** | Scan for and pair LoRa buoy nodes and view the mesh topology. |
| **Map** | Bathymetry map with node pins, thermal overlay, upwelling zone and depth layers. |
| **Forecast** | 12-hour multi-depth temperature forecast, inversion alert and one-tap pre-emptive aeration. |
| **Vision** | Camera feed with detection boxes, stress estimate, schooling density and event timeline. |

## Tech stack

Expo, React Native, TypeScript, Expo Router, react-native-svg, expo-linear-gradient, Poppins.

## Run it locally

You need Node.js and the Expo Go app on your phone.

    git clone https://github.com/YOUR-USERNAME/danaw-app.git
    cd danaw-app
    npm install
    npx expo start

**Note:** the Vision screen uses a sample fish photo that is not included in this repository. Add any fish or aquarium photo you have rights to as `assets/images/fish.jpeg` before starting the app.

## Prototype status

Sensor readings, forecasts, camera detections and device commands are simulated in this prototype. The buoy hardware, forecasting model and LiDAR basemaps are described in the project concept note and are not part of this repository yet.

## Team

Kaiser Francis L. Badiong, Marqus Szymon E. Pelagio, Eunice Nullan

Coach: Engr. John Roy Galvez, CCPE, CRS

## License

The code is released under the [MIT License](LICENSE). The DANAW name and logo are not covered by that license.
