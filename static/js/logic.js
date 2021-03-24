// ******************************************************************
// **************************Getting Data 
// for markers by combining two JSON promises and forming layer groups
// ******************************************************************

// USGS earthquakes json promise
let quakesURL='https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson',
    quakePromise=d3.json(quakesURL).then(createQuakeMarkers),

// Tectonic plates json promise
    tectonicURL='https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_boundaries.json',
    tectonicPromise=d3.json(tectonicURL).then(createPlateMarkers);

// synchronize 2 json promises
Promise.all([quakePromise,tectonicPromise]).then(values=>{
  // console.log("promise", values[0])
  // passing quakes & tectonic boundaries  layer groups to createMap function
  createMap(L.layerGroup(values[0]),L.layerGroup(values[1]));
})

// ******************************************************************
// ******************************* Function createQuakeMarkers
// ****************************************************************** 
/** create quake markers from earthquake json response
 * 
 * @param {*} response from json promise
 */
 function createQuakeMarkers(response) {
  // console.log(response)

  // Pull the "feature" property off of response
  let quakes = response.features;

  // For each feature, create a marker and bind a popup with quake info
  // and add to the array quakeCircles
  var quakeCircles = quakes.map( quake => {
    // had to swap lat and long 
    let lon=quake.geometry.coordinates[0],
        lat=quake.geometry.coordinates[1],
        depth=quake.geometry.coordinates[2],
        id=quake.id,
        magnitude=quake.properties.mag,
        place=quake.properties.place,
        time=convertTime(quake.properties.time);
    // console.log(id,magnitude,depth,place,time)
    return L.circle([lat, lon], {
      color: quakeColor(depth),
      fillColor: quakeColor(depth),
      fillOpacity: 0.3,
      radius: quakeSize(magnitude),
      }).bindPopup("<h3>ID:" + id + "</h3><h3>Place: " + place + "</h3><h3>Magnitude: " + magnitude + "</h3><h3>Time: " + time + "</h3>");
  });
  return quakeCircles;
}

// ******************************************************************
// ******************************* Function createPlateMarkers
// ****************************************************************** 
/** create plate markers from tectonic plate boundaries json response
 * 
 * @param {*} response from json promise
 */
 function createPlateMarkers(response) {
  let boundaries=response.features; 
  // console.log(response.features);
  let boundaryLines=boundaries.map(boundary=>{
    let boundaryCoord=boundary.geometry.coordinates
          // had to swap lat and long 
          .map(coordinate =>[coordinate[1],coordinate[0]]),
        boundaryName=boundary.properties.Name,
        source=boundary.properties.Source;
    // console.log(boundaryCoord);
    return L.polyline(boundaryCoord, {
    color: "red",
    opacity:0.5
    }).bindPopup("<h3>Name:" + boundaryName + "</h3><h3>Source: " + source + "</h3>");
  });
  return boundaryLines;
  }

// ******************************************************************
// ************************** Function createMap
// ******************************************************************
/** build map from base and overlay layers
 * 
 * @param {*} quakeCircles  overlay layer with quakes info
 * @param {*} boundaryLines  overlay layer with tectonic plates info
 */ 
function createMap(quakeCircles,boundaryLines){
  // Create the satellite layer that will be the background of our map
  let satMap=L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/satellite-v9',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY,
    fadeAnimation: false
  });
  // Create the grayscale layer that will be the background of our map
  let grayMap=L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/light-v10',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY,
    fadeAnimation: false
  });
  // Create the outddor layer that will be the background of our map
  let outdoorMap=L.tileLayer('https://api.mapbox.com/styles/v1/{id}/tiles/{z}/{x}/{y}?access_token={accessToken}', {
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    maxZoom: 18,
    id: 'mapbox/outdoors-v11',
    tileSize: 512,
    zoomOffset: -1,
    accessToken: API_KEY,
    fadeAnimation: false
  });

// Create a baseMaps object to hold the base layers
let baseMaps = {
  "Satellite": satMap,
  "Grayscale":grayMap,
  'Outdoors':outdoorMap
};


// Create an overlayMaps object to hold markers layers
let overlayMaps = {
  "Quakes": quakeCircles,
  "Tectonic Plates borders": boundaryLines
};
// Create the map object with options
let map=L.map('mapid', {
  center: [28, 0],
  zoom: 3,
  layers: [satMap,grayMap,outdoorMap, quakeCircles,boundaryLines]
});

// Create a layer control, pass in the baseMaps and overlayMaps. Add the layer control to the map
L.control.layers(baseMaps, overlayMaps, {
  collapsed: false
}).addTo(map);

// color legend
let legend=L.control({position:'bottomright'});
legend.onAdd=function(map){
  let div=L.DomUtil.create('div','legend'),
      grades=[-10,10,30,50,70,90];
      div.innerHTML +='<strong>'+'Earthquake Depth'+'</strong><br><br>'
      grades.forEach((grade,i)=>{
        div.innerHTML +=
        '<i style="background:' + quakeColor(grade+1)+'"></i> '+
        grade + (grades[i+1] ? '&ndash;'+ grades[i+1]+'<br>':'+');
      });
      console.log('div')
  return div;
}
legend.addTo(map)
}

// ******************************************************************
// ************************** support function for circle markers
// ******************************************************************
function quakeColor(depth){
  let colorScale= chroma.scale(['lightgreen','salmon']).domain([-10,90],6),
  qColor=colorScale(depth).hex();
  return qColor;
}
function quakeSize(qMagnitude){
  let qRadius= 10000 + qMagnitude*50000;
  return qRadius;
  }

function convertTime(unixTime) {
  let dateObject=new Date(unixTime),
      date=dateObject.toLocaleString("en-US", {timeZoneName: "short"});
  return date;

}




  