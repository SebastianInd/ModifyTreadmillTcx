// Global variables
let tcxDoc = null;
let lapData = [];
let originalFileName = "";
let altitudeChart = null;
let speedChart = null;

// Namespace handling for TCX files
const NS = {
  tcx: "http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2",
  tpx: "http://www.garmin.com/xmlschemas/ActivityExtension/v2",
};

// Initialize app
document.addEventListener("DOMContentLoaded", () => {
  const fileInput = document.getElementById("fileInput");
  const uploadBox = document.getElementById("uploadBox");

  // File input change handler
  fileInput.addEventListener("change", handleFileSelect);

  // Drag and drop handlers
  uploadBox.addEventListener("click", () => fileInput.click());
  uploadBox.addEventListener("dragover", handleDragOver);
  uploadBox.addEventListener("dragleave", handleDragLeave);
  uploadBox.addEventListener("drop", handleDrop);
});

// Drag and drop handlers
function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.add("drag-over");
}

function handleDragLeave(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove("drag-over");

  const files = e.dataTransfer.files;
  if (files.length > 0 && files[0].name.endsWith(".tcx")) {
    handleFile(files[0]);
  } else {
    alert("Please upload a valid TCX file");
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file) {
    handleFile(file);
  }
}

// Main file handling function
function handleFile(file) {
  originalFileName = file.name.replace(".tcx", "");
  const reader = new FileReader();

  reader.onload = function (e) {
    const content = e.target.result;
    parseTCX(content);
  };

  reader.readAsText(file);
}

// Parse TCX file
function parseTCX(xmlString) {
  const parser = new DOMParser();
  tcxDoc = parser.parseFromString(xmlString, "text/xml");

  // Check for parsing errors
  const parserError = tcxDoc.querySelector("parsererror");
  if (parserError) {
    alert("Error parsing TCX file. Please ensure it is a valid TCX file.");
    return;
  }

  extractLapData();
  displayMainContent();
  populateTable();
  updateCharts();
}

// Extract lap data from TCX
function extractLapData() {
  lapData = [];
  const laps = tcxDoc.getElementsByTagNameNS(NS.tcx, "Lap");

  for (let i = 0; i < laps.length; i++) {
    const lap = laps[i];

    // Get total time
    const timeElement = lap.getElementsByTagNameNS(
      NS.tcx,
      "TotalTimeSeconds"
    )[0];
    const totalTime = parseFloat(timeElement.textContent);

    // Get distance
    const distanceElement = lap.getElementsByTagNameNS(
      NS.tcx,
      "DistanceMeters"
    )[0];
    const distance = parseFloat(distanceElement.textContent);

    // Calculate current speed (m/s to km/h)
    const currentSpeed = (distance / totalTime) * 3.6;

    // Get first trackpoint to extract current speed from extensions
    const track = lap.getElementsByTagNameNS(NS.tcx, "Track")[0];
    const trackpoints = track.getElementsByTagNameNS(NS.tcx, "Trackpoint");

    let speedFromExtension = currentSpeed;
    if (trackpoints.length > 0) {
      const firstTrackpoint = trackpoints[0];
      const speedElement = firstTrackpoint.getElementsByTagNameNS(
        NS.tpx,
        "Speed"
      )[0];
      if (speedElement) {
        speedFromExtension = parseFloat(speedElement.textContent) * 3.6; // m/s to km/h
      }
    }

    // Calculate current incline (assume 0 if no altitude data)
    let currentIncline = 0;
    if (trackpoints.length > 1) {
      const firstAlt = trackpoints[0].getElementsByTagNameNS(
        NS.tcx,
        "AltitudeMeters"
      )[0];
      const lastAlt = trackpoints[
        trackpoints.length - 1
      ].getElementsByTagNameNS(NS.tcx, "AltitudeMeters")[0];

      if (firstAlt && lastAlt) {
        const altChange =
          parseFloat(lastAlt.textContent) - parseFloat(firstAlt.textContent);
        currentIncline = (altChange / distance) * 100;
      }
    }

    lapData.push({
      lapNumber: i + 1,
      totalTime: totalTime,
      currentSpeed: currentSpeed,
      currentIncline: currentIncline,
      newSpeed: currentSpeed,
      newIncline: currentIncline,
    });
  }
}

// Display main content
function displayMainContent() {
  document.getElementById("uploadSection").classList.add("hidden");
  document.getElementById("mainContent").classList.remove("hidden");

  // Update file info
  document.getElementById(
    "fileName"
  ).textContent = `File: ${originalFileName}.tcx`;

  const totalTime = lapData.reduce((sum, lap) => sum + lap.totalTime, 0);
  const minutes = Math.floor(totalTime / 60);
  const seconds = Math.floor(totalTime % 60);

  document.getElementById(
    "fileStats"
  ).textContent = `Laps: ${lapData.length} | Total Time: ${minutes}m ${seconds}s`;
}

// Populate table with lap data
function populateTable() {
    const tbody = document.getElementById('lapTableBody');
    tbody.innerHTML = '';
    
    lapData.forEach((lap, index) => {
        const row = document.createElement('tr');
        const minutes = Math.floor(lap.totalTime / 60);
        const seconds = Math.floor(lap.totalTime % 60);
        const timeFormatted = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        row.innerHTML = `
            <td>${lap.lapNumber}</td>
            <td>${timeFormatted}</td>
            <td>${lap.currentSpeed.toFixed(2)}</td>
            <td class="editable" onclick="editCell(${index}, 'speed', this)">
                ${lap.newSpeed.toFixed(2)}
            </td>
            <td>${lap.currentIncline.toFixed(2)}</td>
            <td class="editable" onclick="editCell(${index}, 'incline', this)">
                ${lap.newIncline.toFixed(2)}
            </td>
        `;
    tbody.appendChild(row);
  });
}

// Edit cell functionality
function editCell(lapIndex, field, cell) {
  const currentValue =
    field === "speed"
      ? lapData[lapIndex].newSpeed
      : lapData[lapIndex].newIncline;

  const input = document.createElement("input");
  input.type = "number";
  input.step = "0.1";
  input.value = currentValue.toFixed(2);
  input.style.width = "80px";

  input.onblur = function () {
    const newValue = parseFloat(input.value) || 0;
    if (field === "speed") {
      lapData[lapIndex].newSpeed = newValue;
    } else {
      lapData[lapIndex].newIncline = newValue;
    }
    cell.textContent = newValue.toFixed(2);
    updateCharts();
  };

  input.onkeypress = function (e) {
    if (e.key === "Enter") {
      input.blur();
    }
  };

  cell.textContent = "";
  cell.appendChild(input);
  input.focus();
  input.select();
}

// Update charts
function updateCharts() {
  updateAltitudeChart();
  updateSpeedChart();
}

// Update altitude chart
function updateAltitudeChart() {
  const distances = [];
  const altitudes = [];

  let currentDistance = 0;
  let currentAltitude = 0;

  lapData.forEach((lap) => {
    const speed = lap.newSpeed / 3.6; // km/h to m/s
    const lapDistance = speed * lap.totalTime;
    const gradient = lap.newIncline;

    // Sample points within the lap
    const numPoints = Math.max(10, Math.floor(lap.totalTime / 10));
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const pointDistance = currentDistance + lapDistance * fraction;
      const pointAltitude =
        currentAltitude + ((lapDistance * gradient) / 100) * fraction;

      distances.push(pointDistance / 1000); // Convert to km
      altitudes.push(pointAltitude);
    }

    currentDistance += lapDistance;
    currentAltitude += (lapDistance * gradient) / 100;
  });

  const ctx = document.getElementById("altitudeChart").getContext("2d");

  if (altitudeChart) {
    altitudeChart.destroy();
  }

    // Calculate appropriate x-axis step size
    const maxDistance = Math.max(...distances);
    let stepSize = 1; // Default 1 km
    if (maxDistance > 20) stepSize = 2;
    if (maxDistance > 40) stepSize = 5;
    if (maxDistance > 100) stepSize = 10;
    
    altitudeChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances,
            datasets: [{
                label: 'Altitude (m)',
                data: altitudes,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.4,
                pointRadius: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9'
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Distance (km)',
                        color: '#cbd5e1'
                    },
                    ticks: {
                        color: '#cbd5e1',
                        stepSize: stepSize,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
                    grid: {
                        color: 'rgba(71, 85, 105, 0.3)'
                    }
                },
                y: {
          title: {
            display: true,
            text: "Altitude (m)",
            color: "#cbd5e1",
          },
          ticks: {
            color: "#cbd5e1",
          },
          grid: {
            color: "rgba(71, 85, 105, 0.3)",
          },
        },
      },
    },
  });
}

// Update speed chart
function updateSpeedChart() {
  const distances = [];
  const oldSpeeds = [];
  const newSpeeds = [];

  let currentDistance = 0;

  lapData.forEach((lap) => {
    const oldSpeed = lap.currentSpeed;
    const newSpeed = lap.newSpeed;
    const lapDistance = (newSpeed / 3.6) * lap.totalTime;

    // Sample points within the lap
    const numPoints = Math.max(10, Math.floor(lap.totalTime / 10));
    for (let i = 0; i <= numPoints; i++) {
      const fraction = i / numPoints;
      const pointDistance = currentDistance + lapDistance * fraction;

      distances.push(pointDistance / 1000); // Convert to km
      oldSpeeds.push(oldSpeed);
      newSpeeds.push(newSpeed);
    }

    currentDistance += lapDistance;
  });

  const ctx = document.getElementById("speedChart").getContext("2d");

  if (speedChart) {
    speedChart.destroy();
  }

    // Calculate appropriate x-axis step size
    const maxDistance = Math.max(...distances);
    let stepSize = 1; // Default 1 km
    if (maxDistance > 20) stepSize = 2;
    if (maxDistance > 40) stepSize = 5;
    if (maxDistance > 100) stepSize = 10;
    
    speedChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: distances,
            datasets: [
                {
                    label: 'Original Speed (km/h)',
                    data: oldSpeeds,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    tension: 0.4,
                    pointRadius: 0
                },
                {
                    label: 'New Speed (km/h)',
                    data: newSpeeds,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    tension: 0.4,
                    pointRadius: 0
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#f1f5f9'
                    }
                }
            },
            scales: {
                x: {
                    type: 'linear',
                    title: {
                        display: true,
                        text: 'Distance (km)',
                        color: '#cbd5e1'
                    },    ticks: {
                        color: '#cbd5e1',
                        stepSize: stepSize,
                        callback: function(value) {
                            return value.toFixed(1);
                        }
                    },
          grid: {
            color: "rgba(71, 85, 105, 0.3)",
          },
        },
        y: {
          title: {
            display: true,
            text: "Speed (km/h)",
            color: "#cbd5e1",
          },
          ticks: {
            color: "#cbd5e1",
          },
          grid: {
            color: "rgba(71, 85, 105, 0.3)",
          },
        },
      },
    },
  });
}

// Generate corrected TCX file
function generateCorrectedFile() {
  const laps = tcxDoc.getElementsByTagNameNS(NS.tcx, "Lap");

  lapData.forEach((lap, index) => {
    const lapElement = laps[index];
    const speed = lap.newSpeed / 3.6; // km/h to m/s
    const gradient = lap.newIncline;

    // Update lap distance
    const lapDistance = speed * lap.totalTime;
    const distanceElement = lapElement.getElementsByTagNameNS(
      NS.tcx,
      "DistanceMeters"
    )[0];
    distanceElement.textContent = lapDistance.toFixed(2);

    // Update trackpoints
    const track = lapElement.getElementsByTagNameNS(NS.tcx, "Track")[0];
    const trackpoints = track.getElementsByTagNameNS(NS.tcx, "Trackpoint");

    const deltaDistance = lapDistance / trackpoints.length;
    const deltaAltitude = (deltaDistance * gradient) / 100;

    let cumulativeDistance =
      index === 0 ? 0 : getCurrentCumulativeDistance(index - 1);
    let cumulativeAltitude =
      index === 0 ? 0 : getCurrentCumulativeAltitude(index - 1);

    for (let i = 0; i < trackpoints.length; i++) {
      const trackpoint = trackpoints[i];

      cumulativeDistance += deltaDistance;
      cumulativeAltitude += deltaAltitude;

      // Update distance
      const tpDistanceElement = trackpoint.getElementsByTagNameNS(
        NS.tcx,
        "DistanceMeters"
      )[0];
      if (tpDistanceElement) {
        tpDistanceElement.textContent = cumulativeDistance.toFixed(2);
      }

      // Update or create altitude
      let altitudeElement = trackpoint.getElementsByTagNameNS(
        NS.tcx,
        "AltitudeMeters"
      )[0];
      if (!altitudeElement) {
        altitudeElement = tcxDoc.createElementNS(NS.tcx, "AltitudeMeters");
        trackpoint.appendChild(altitudeElement);
      }
      altitudeElement.textContent = cumulativeAltitude.toFixed(2);

      // Update speed in extensions
      const speedElement = trackpoint.getElementsByTagNameNS(
        NS.tpx,
        "Speed"
      )[0];
      if (speedElement) {
        speedElement.textContent = speed.toFixed(2);
      }
    }
  });

  // Serialize and download
  const serializer = new XMLSerializer();
  const xmlString = serializer.serializeToString(tcxDoc);

  const blob = new Blob([xmlString], { type: "application/xml" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${originalFileName}_corrected.tcx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Show success message
  alert("✅ Corrected TCX file downloaded successfully!");
}

// Helper function to get cumulative distance at end of previous lap
function getCurrentCumulativeDistance(lapIndex) {
  const laps = tcxDoc.getElementsByTagNameNS(NS.tcx, "Lap");
  const lapElement = laps[lapIndex];
  const track = lapElement.getElementsByTagNameNS(NS.tcx, "Track")[0];
  const trackpoints = track.getElementsByTagNameNS(NS.tcx, "Trackpoint");
  const lastTrackpoint = trackpoints[trackpoints.length - 1];
  const distanceElement = lastTrackpoint.getElementsByTagNameNS(
    NS.tcx,
    "DistanceMeters"
  )[0];
  return parseFloat(distanceElement.textContent);
}

// Helper function to get cumulative altitude at end of previous lap
function getCurrentCumulativeAltitude(lapIndex) {
  const laps = tcxDoc.getElementsByTagNameNS(NS.tcx, "Lap");
  const lapElement = laps[lapIndex];
  const track = lapElement.getElementsByTagNameNS(NS.tcx, "Track")[0];
  const trackpoints = track.getElementsByTagNameNS(NS.tcx, "Trackpoint");
  const lastTrackpoint = trackpoints[trackpoints.length - 1];
  const altitudeElement = lastTrackpoint.getElementsByTagNameNS(
    NS.tcx,
    "AltitudeMeters"
  )[0];
  return altitudeElement ? parseFloat(altitudeElement.textContent) : 0;
}

// Reset app
function resetApp() {
  document.getElementById("uploadSection").classList.remove("hidden");
  document.getElementById("mainContent").classList.add("hidden");
  document.getElementById("fileInput").value = "";
  tcxDoc = null;
  lapData = [];
  originalFileName = "";

  if (altitudeChart) {
    altitudeChart.destroy();
    altitudeChart = null;
  }
  if (speedChart) {
    speedChart.destroy();
    speedChart = null;
  }
}
