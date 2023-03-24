import xml.etree.ElementTree as ET
import matplotlib.pyplot as plt

# Afterwards, need to copy the header from the original file, change the CRLF to LF, and remove all np1: in the tags. Then it should be working.

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

# Distance and altitude values for plotting
distances = []
altitudes = []

# Accumulated distance and altitude
current_distance = 0.0
current_altitude = 0.0

# Iterate over each Lap element
for lap, lap_value in zip(root.findall('.//tcx:Lap', NS), lap_values):
    # Get the speed and gradient values for this lap from the list of lap_values
    speed_kmh, gradient = lap_value
    speed = speed_kmh / 3.6

    # Correct the distance for this lap, based on the user input
    time = float(lap.find('tcx:TotalTimeSeconds', NS).text)
    lap_distance = speed * time
    lap.find('tcx:DistanceMeters', NS).text = str(lap_distance)

    # Update the Trackpoint elements within this Lap with corrected distance and altitude values
    track = lap.find('tcx:Track', NS)
    trackpoints = track.findall('tcx:Trackpoint', NS)
    delta_distance = lap_distance / len(trackpoints)
    delta_altitude = delta_distance * gradient / 100

    for trackpoint in trackpoints:
        current_distance += delta_distance
        current_altitude += delta_altitude

        trackpoint.find('tcx:DistanceMeters', NS).text = str(current_distance)
        trackpoint.append(ET.Element('{{{tcx}}}AltitudeMeters'.format(**NS)))
        trackpoint.find('tcx:AltitudeMeters', NS).text = str(current_altitude)

        # Add the distance and altitude values to the lists to plot
        distances.append(current_distance)
        altitudes.append(current_altitude)

# Write the updated TCX file to disk
tree.write('my_activity_corrected.tcx', encoding='UTF-8', xml_declaration=True)

# Create a plot of distance and altitude
plt.plot(distances, label="distances")
plt.plot(altitudes, label="altitudes")
plt.show()
pass
