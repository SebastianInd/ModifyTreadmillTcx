import xml.etree.ElementTree as ET
import matplotlib.pyplot as plt
from datetime import datetime

# Afterwards, need to copy the header from the original file, change the CRLF to LF, and remove all np1: in the tags. Then it should be working.
# TODO: the altitude is still not correctly computed...

# define the namespace dictionary
NS = {'tcx': 'http://www.garmin.com/xmlschemas/TrainingCenterDatabase/v2'}

# Speed and gradient values for each lap
lap_values = [
    (14.0, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.2, 18.0),
    (8.2, 0.0),
    (8.0, 18.0),
    (8.0, 0.0),
    (8.0, 18.0),
    (8.0, 0.0),
    (8.0, 18.0),
    (8.0, 0.0),
    (8.0, 18.0),
    (8.0, 0.0),
    (8.0, 18.0),
    (12.0, 0.0),
    (20.0, 0.0),
    (0.0, 0.0),
    (20.0, 0.0),
    (0.0, 0.0),
    (20.0, 0.0),
    (0.0, 0.0),
    (20.0, 0.0),
    (10.0, 0.0),
]

# Load the TCX file into an ElementTree object
tree = ET.parse('my_activity.tcx')
root = tree.getroot()

# Initialize lists to store distance and altitude values
distances = []
altitudes = []

prev_time = None
total_distance = 0.0
total_altitude = 0.0

# Iterate over each Lap element
for i, lap in enumerate(root.findall('.//tcx:Lap', NS)):
    # Get the speed and gradient values for this lap from the list of lap_values
    speed, gradient = lap_values[i]
    # Convert speed from kilometer per hour to meters per second
    speed = speed / 3.6

    # Correct the distance for this lap, based on the user input
    time = float(lap.find('tcx:TotalTimeSeconds', NS).text)
    lap.find('tcx:DistanceMeters', NS).text = str(speed * time)

    # Update the Trackpoint elements within this Lap with corrected distance and altitude values
    track = lap.find('tcx:Track', NS)
    for trackpoint in track.findall('tcx:Trackpoint', NS):
        time_str = trackpoint.find('tcx:Time', NS).text
        time = datetime.strptime(time_str, '%Y-%m-%dT%H:%M:%S.%fZ')
        if prev_time is None:
            prev_time = time

        delta_time = (time - prev_time).total_seconds()
        delta_distance = delta_time * speed
        delta_altitude = delta_distance * gradient / 100

        total_distance += delta_distance
        total_altitude += delta_altitude

        trackpoint.find('tcx:DistanceMeters', NS).text = str(total_distance)
        trackpoint.append(ET.Element('{{{tcx}}}AltitudeMeters'.format(**NS)))
        trackpoint.find('tcx:AltitudeMeters', NS).text = str(total_altitude)

        prev_time = time

        # Add the distance and altitude values to the lists to plot
        distances.append(total_distance)
        altitudes.append(total_altitude)

# Write the updated TCX file to disk
tree.write('my_activity_corrected.tcx', encoding='UTF-8', xml_declaration=True)

# Create a plot of distance and altitude
plt.plot(distances, label="distances")
plt.plot(altitudes, label="altitudes")
plt.show()
pass
