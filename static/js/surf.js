// This is the js for the default/surf.html view.

var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    self.get_users = function () {

        $.getJSON(get_users_url, function (data) {
            self.vue.users = data.users;
            self.vue.current_user = data.current_user;
            self.vue.logged_in = data.logged_in;

            if (self.vue.logged_in){
                self.get_user_data(self.vue.current_user.id);
            }
            $("#vue-div").show();
        })
    };

    self.get_user_data = function (user_id) {
        $.get(user_data_url, {user_id: user_id}, function (data) {
            if (data == null){
                console.log("");
            } else {
                console.log("got user data", data.user_data);
                self.vue.user_data = data.user_data;
            }
        })
    };

    self.confirm_surf_session = function(session_choice) {
        var spot = self.vue.best_spot_message;
        if (session_choice == 2){
            spot = self.vue.best_spot_message2
        } else if (session_choice == 3){
            spot = self.vue.best_spot_message3
        }

        $.post(add_surf_session_url,
            {
                user_id: self.vue.current_user.id,
                session: spot
            }, 
            function () {
                if (self.vue.user_data.surf_sessions == null){
                    self.vue.user_data.surf_sessions = [spot];
                } else {
                    self.vue.user_data.surf_sessions.push(spot);
                }
                console.log("added surf session", self.vue.user_data);
            }
        );
    }

    self.delete_surf_session = function(index) {
        console.log("delete session ", index);
        $.post(delete_surf_session_url, { 
                user_id: self.vue.current_user.id,
                index: index
            },
            function() {
                self.vue.user_data.surf_sessions.splice(index, 1);
            }
        );
    }

    //creates 3 different recommendations for surf
    self.surf = async function(){
        self.vue.calculating = true;
        var skill_level = self.vue.user_data.skill_level;
        var startTime = self.start_hour;
        var endTime = self.end_hour;
        var spotIds = [];
        var spotNames = [];

        //gets spot ids and spot names for santa cruz
        const countyResponse = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
        for(var i = 0; i < countyResponse.data.length; i++){
            spotIds[i] = countyResponse.data[i].spot_id;
            spotNames[i] = countyResponse.data[i].spot_name;
        }
        //gets tide data for santa cruz for a whole week
        const tideResponse = await axios.get("http://api.spitcast.com/api/county/tide/santa-cruz/",
            {params: {dcat: "week"}});


        //gets wind data for santa cruz
        const windResponse = await axios.get("http://api.spitcast.com/api/county/wind/santa-cruz/",
            {params: {dcat: "week"}}); 

        var bestTideTimes = findBestTideTimes(startTime, endTime, tideResponse, spotIds);
        var allSpotsBestTime = [];       //array of every spots best time, same indexing as spot ids
        var allSpotsSizeAtBestTime = []; //array of the size of the waves at the best time for each spot, same indexing as spot ids
        var allSpotsTideHeights = [];    //array of the tide heights at these times

        //for each spot find best time during best tide times
        for(var spotToCheck = 0; spotToCheck < spotIds.length; spotToCheck++){
            var timeAndSize = await findBestTimeForSpot(bestTideTimes, skill_level, spotIds[spotToCheck]);
            allSpotsBestTime.push(timeAndSize[0]);
            allSpotsSizeAtBestTime.push(timeAndSize[1]);
            allSpotsTideHeights.push(tideResponse.data[timeAndSize[0]].tide);
        }

        //go through list of each spots best time and size and pick best 3 
        var topThreeSpotNames = [];
        var topThreeSpotSizes = [0,0,0];
        var timesForBestSizes = [];
        var tidesForBestSizes = [];
        for(var spotToCheck = 0; spotToCheck < allSpotsBestTime.length; spotToCheck++){
            if(allSpotsSizeAtBestTime[spotToCheck] > topThreeSpotSizes[0]){
                topThreeSpotSizes[2] = topThreeSpotSizes[1];
                topThreeSpotSizes[1] = topThreeSpotSizes[0];
                timesForBestSizes[2] = timesForBestSizes[1];
                timesForBestSizes[1] = timesForBestSizes[0];
                topThreeSpotNames[2] = topThreeSpotNames[1];
                topThreeSpotNames[1] = topThreeSpotNames[0];
                tidesForBestSizes[2] = tidesForBestSizes[1];
                tidesForBestSizes[1] = tidesForBestSizes[0];
                topThreeSpotSizes[0] = allSpotsSizeAtBestTime[spotToCheck];
                timesForBestSizes[0] = allSpotsBestTime[spotToCheck];
                topThreeSpotNames[0] = spotNames[spotToCheck]; 
                tidesForBestSizes[0] = allSpotsTideHeights[spotToCheck];
            }
            else if(allSpotsSizeAtBestTime[spotToCheck] > topThreeSpotSizes[1]){
                topThreeSpotSizes[2] = topThreeSpotSizes[1];
                timesForBestSizes[2] = timesForBestSizes[1];
                topThreeSpotNames[2] = topThreeSpotNames[1];
                tidesForBestSizes[2] = tidesForBestSizes[1];
                topThreeSpotSizes[1] = allSpotsSizeAtBestTime[spotToCheck];
                timesForBestSizes[1] = allSpotsBestTime[spotToCheck];
                topThreeSpotNames[1] = spotNames[spotToCheck]; 
                tidesForBestSizes[1] = allSpotsTideHeights[spotToCheck];
            }
            else if(allSpotsSizeAtBestTime[spotToCheck] > topThreeSpotSizes[2]){
                topThreeSpotSizes[2] = allSpotsSizeAtBestTime[spotToCheck];
                timesForBestSizes[2] = allSpotsBestTime[spotToCheck];
                topThreeSpotNames[2] = spotNames[spotToCheck]; 
                tidesForBestSizes[2] = allSpotsTideHeights[spotToCheck];
            }
        }
        this.best_spot_message = createSpotMessage(topThreeSpotNames[0], timesForBestSizes[0], topThreeSpotSizes[0], tidesForBestSizes[0] );
        this.best_spot_message2 = createSpotMessage(topThreeSpotNames[1], timesForBestSizes[1], topThreeSpotSizes[1], tidesForBestSizes[1]);
        this.best_spot_message3 = createSpotMessage(topThreeSpotNames[2], timesForBestSizes[2], topThreeSpotSizes[2], tidesForBestSizes[2]);

        self.vue.calculating = false;

        //had to set to 12 to because it no longer only suggests 1 time, *Daniel ToDo*
        setMarkers(this.best_spot_message, this.best_spot_message2, this.best_spot_message3);
    }

    self.view_surf_session = async function(message) {
        console.log("view ", message);
        
    }

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            start_hour: 0,
            start_time: '',
            end_hour: 24,
            end_time: '',
            best_spot_message: "",
            best_spot_message2: "",
            best_spot_message3: "",
            marker1: null,
            marker2: null,
            marker3: null,
            user_data: [],
            users: [],
            current_user: null,
            logged_in: false,
            calculating: false
        },
        methods: {
            get_users: self.get_users,
            surf: self.surf,
            get_user_data: self.get_user_data,
            confirm_surf_session: self.confirm_surf_session,
            delete_surf_session: self.delete_surf_session,
            view_surf_session: self.view_surf_session
        }

    });

    self.get_users();
    $("#vue-div").show();
    return self;
};

var APP = null;

var map;
//sets up the blank intial map of santa cruz
function initMap() {
  var santa_cruz = {lat: 36.9741, lng: -122.0308};
  map = new google.maps.Map(document.getElementById('map'), {
    center: santa_cruz,
    zoom: 11
  });
}

function clearMarkers(){
    if(self.marker1 != null){
        marker1.setMap(null);
    }
    if(self.marker2 != null){
        marker2.setMap(null);
    }
    if(self.marker3 != null){
        marker3.setMap(null);
    }
}
//adds a marker with wave height on each reccomended surf spot 
async function setMarkers(bestSpotMessage1, bestSpotMessage2, bestSpotMessage3){
  //first remove old markers
  clearMarkers();
  //parses best spot message to get data to be displayed when a marker is clicked
  //[0]-spot name, [1]-timeMsg, [2]-wave_ft, [3]-tide_ft
  var bestSpot1 = bestSpotMessage1.split(",");
  var bestSpot2 = bestSpotMessage2.split(",");
  var bestSpot3 = bestSpotMessage3.split(",");
  //this api call is only to get the coords of the spots
  const spotResponse = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
  var bestSpotCoords = []; 
  for(var i = 0; i < spotResponse.data.length && bestSpotCoords.length != 6; i++){
    spotName = spotResponse.data[i].spot_name;
    if(spotName == bestSpot1[0] || spotName == bestSpot2[0] || spotName == bestSpot3[0]){
        bestSpotCoords.push(spotResponse.data[i].latitude);
        bestSpotCoords.push(spotResponse.data[i].longitude);
    }
  }

  //first spot
  spotName = bestSpot1[0];
  var infowindow1 = new google.maps.InfoWindow({
    content:'<div><b>'+ bestSpot1[0] + '</b></div>' + 
            '<div>' + bestSpot1[1] + '</div>' + 
            '<div>' + bestSpot1[2] + '</div>' + 
            bestSpot1[3],
  });
  var marker1 = new google.maps.Marker({ 
    position: {lat: bestSpotCoords[0], lng: bestSpotCoords[1]}, 
    map: map,
    animation: google.maps.Animation.DROP,
    title: spotName
  });
  self.marker1 = marker1;
  marker1.addListener('click', function() {
    infowindow1.open(map, marker1);
  });

  //second spot
  spotName = bestSpot2[0];
  var infowindow2 = new google.maps.InfoWindow({
    content:'<div><b>'+ bestSpot2[0] + '</b></div>' + 
            '<div>' + bestSpot2[1] + '</div>' + 
            '<div>' + bestSpot2[2] + '</div>' + 
            bestSpot2[3],
  });
  var marker2 = new google.maps.Marker({
    position: {lat: bestSpotCoords[2], lng: bestSpotCoords[3]}, 
    map: map,
    animation: google.maps.Animation.DROP,
    title: spotName
  });
  self.marker2 = marker2;
  marker2.addListener('click', function() {
    infowindow2.open(map, marker2);
  });

  //third spot
  spotName = bestSpot3[0];
  var infowindow3 = new google.maps.InfoWindow({
    content:'<div><b>'+ bestSpot3[0] + '</b></div>' + 
            '<div>' + bestSpot3[1] + '</div>' + 
            '<div>' + bestSpot3[2] + '</div>' + 
            bestSpot3[3],
  });
  var marker3 = new google.maps.Marker({
    position: {lat: bestSpotCoords[4], lng: bestSpotCoords[5]}, 
    map: map,
    animation: google.maps.Animation.DROP,
    title: spotName
  });
  self.marker3 = marker3;
  marker3.addListener('click', function() {
    infowindow3.open(map, marker3);
  });
}


//takes list of spot IDs, and a time 
//returns average wave size in the county at that time
async function calculateAverageSizeInCounty(spotIds, time){
    var avgSizeInCounty = 0;
    for(var spotIdToCheck = 0; spotIdToCheck < spotIds.length; spotIdToCheck++){
        thisId = spotIds[spotIdToCheck];
        const spotResponse = await axios.get("http://api.spitcast.com/api/spot/forecast/" + thisId + "/",
            { params: {dcat:"week"}});
        var currentStatsAtSpot = spotResponse.data[time];
        avgSizeInCounty += currentStatsAtSpot.size_ft;
    }
    avgSizeInCounty = avgSizeInCounty/spotIds.length;
    return avgSizeInCounty;
}

//takes avg wave size in county, start and end time inputted by user, and the api resposne for tide
//returns the list of the most appropriate tide times based on current wave sizes
function findBestTideTimes(startTime, endTime, tideResponse, spotIds){
    var bestTideTimes = [];

    for(var timeToCheck = startTime; timeToCheck <= endTime; timeToCheck++){
        var currentAvgSize = calculateAverageSizeInCounty(spotIds, timeToCheck);
        var minAndMaxTides = calculateMinMaxAcceptableTide(currentAvgSize);
        var minAcceptableTide = minAndMaxTides[0]; var maxAcceptableTide = minAndMaxTides[1];
        var tideAtTime = tideResponse.data[timeToCheck].tide;
        if(tideAtTime > minAcceptableTide && tideAtTime < maxAcceptableTide){
            bestTideTimes.push(timeToCheck);
        }
    }
    return bestTideTimes;
}

function calculateMinMaxAcceptableTide(avgSize){
    var minAcceptableTide; var maxAcceptableTide;
    if(avgSize < 2.5){      // lower tides are better for smaller waves
        minAcceptableTide = -5; // will never be this low, take as low as possible
        maxAcceptableTide = 3;
    }
    else if(avgSize > 5){   // tide matters less when waves are bigger
        minAcceptableTide = 0;
        maxAcceptableTide = 4;
    }
    else{                   // tide for everything else
        minAcceptableTide = 0;
        maxAcceptableTide = 3.5;
    }
    return [minAcceptableTide, maxAcceptableTide];
}

//takes list of times where tide is good, user skill level, ID of spot to check, avg wave size
//returns the time with the best waves for the specific spot, and the actual size of the waves at that time
async function findBestTimeForSpot(bestTideTimes, skill_level, spotId){
    var minAndMaxHeights = calculateMinMaxHeights(skill_level); // 0 is min 1 is max
    var minHeight = minAndMaxHeights[0]; var maxHeight = minAndMaxHeights[1];
    var bestSizeForSpot = 0;
    var timeWithBestSize = 0;

    const spotResponse = await axios.get("http://api.spitcast.com/api/spot/forecast/" + spotId + "/",
        { params: {dcat:"week"}});

    for(var timeToCheck = 0; timeToCheck < bestTideTimes.length; timeToCheck++){
        var currentStatsAtSpot = spotResponse.data[bestTideTimes[timeToCheck]];
        var sizeAtTime = currentStatsAtSpot.size_ft;
        if(sizeAtTime < maxHeight && sizeAtTime > minHeight){
            if(sizeAtTime > bestSizeForSpot){
                bestSizeForSpot = sizeAtTime;
                timeWithBestSize = bestTideTimes[timeToCheck];
            }
        }
    }
    return [timeWithBestSize, bestSizeForSpot];
}

//takes average wave size and user skill level
//returns min and max heights the waves should be based on skill level and wave size
function calculateMinMaxHeights(skill_level){
    var minHeight; var maxHeight;
    if(skill_level == 'Beginner'){
        minHeight = 0; // no minimum 
        maxHeight = 2.5;
    }
    else if(skill_level == 'Intermediate'){
        minHeight = 0;
        maxHeight = 3.5;
    }
    else if(skill_level == 'Advanced'){
        minHeight = 0;
        maxHeight = 6;
    }
    else if(skill_level == 'Expert'){
        minHeight = 0;
        maxHeight = 20; // no maximum
    }
    return [minHeight, maxHeight];
}

function createSpotMessage(spotName, time, waveSize, tideHeight){
    var ampm = "AM";
    var todayTmrw = "Today";
    if(time >= 12){
        if(time < 24){
            ampm = "PM";
            time -= 12;
        }
        else if(time < 36){
            time -=24;
            todayTmrw = "Tomorrow";
        }
        else{
            ampm = "PM";
            todayTmrw = "Tomorrow";
            time -= 36;
        }
        if(time == 0){
            time = 12;
        }
        if(time == 12){
            ampm = "PM";
        }
    }
    var message = spotName + ", " + todayTmrw + " @ " + time + ampm + ", Waves: " + Math.round(waveSize * 100)/100
        + " ft," + " Tide: " + Math.round(tideHeight * 100)/100 + " ft ";
    return message;
}

function getVals(){
    // Get slider values
    var parent = this.parentNode;
    var slides = parent.getElementsByTagName("input");
    var slide1 = parseFloat( slides[0].value );
    var slide2 = parseFloat( slides[1].value );
    // Neither slider will clip the other, so make sure we determine which is larger
    if( slide1 > slide2 ){
        var tmp = slide2; slide2 = slide1; slide1 = tmp; 
    }
    var slide1Time = time_convert(slide1, "start");
    var slide2Time = time_convert(slide2, "end");
    APP.start_time = slide1Time;
    APP.end_time = slide2Time;
    var displayElement = parent.getElementsByClassName("rangeValues")[0];
    displayElement.innerHTML = slide1Time + " - " + slide2Time;
}

window.onload = function(){
    // Initialize Sliders
    var sliderSections = document.getElementsByClassName("range-slider");
    for( var x = 0; x < sliderSections.length; x++ ){
        var sliders = sliderSections[x].getElementsByTagName("input");
        for( var y = 0; y < sliders.length; y++ ){
            if( sliders[y].type ==="range" ){
                sliders[y].oninput = getVals;
                // Manually trigger event first time to display values
                sliders[y].oninput();
            }
        }
    }
}

time_convert = function(num, start_or_end) { 
    var hours = Math.floor(num / 60);
    var minutes = num % 60;
    var current_time = new Date();
    hours += current_time.getHours();
    minutes += current_time.getMinutes();
    if(minutes <= 15){
        minutes = 15;
    } else if (minutes <= 30){
        minutes = 30;
    } else if (minutes <= 45){
        minutes = 45;
    } else {
        minutes = 0;
        hours++;
    }

    if (start_or_end == "start"){
        APP.start_hour = hours;
    } else if (start_or_end == "end"){
        APP.end_hour = hours;
    }

    if(hours == 0){
        if(minutes < 10){
            return "Today " + (hours+12) + ":0" + minutes + "am";
        } else {
            return "Today " + (hours+12) + ":" + minutes + "am";
        }
    } else if(hours < 12){
        if(minutes < 10){
            return "Today " + hours + ":0" + minutes + "am";
        } else {
            return "Today " + hours + ":" + minutes + "am";
        }
    } else if(hours == 12){
        if(minutes < 10){
            return "Today " + hours + ":0" + minutes + "pm";
        } else {    
            return "Today " + hours + ":" + minutes + "pm";
        }
    } else if(hours < 24) {
        if(minutes < 10){
            return "Today " + (hours-12) + ":0" + minutes + "pm";
        } else {
            return "Today " + (hours-12) + ":" + minutes + "pm";
        }
    } else if(hours == 24){
        if(minutes < 10){
            return "Tomorrow " + (hours-12) + ":0" + minutes + "am";
        } else {    
            return "Tomorrow " + (hours-12) + ":" + minutes + "am";
        }
    } else if(hours < 36) {
        if(minutes < 10){
            return "Tomorrow " + (hours-24) + ":0" + minutes + "am";
        } else {
            return "Tomorrow " + (hours-24) + ":" + minutes + "am";
        }
    } else if(hours == 36){
        if(minutes < 10){
            return "Tomorrow " + (hours-24) + ":0" + minutes + "pm";
        } else {
            return "Tomorrow " + (hours-24) + ":" + minutes + "pm";
        }
    } else {
        if(minutes < 10){
            return "Tomorrow " + (hours-36) + ":0" + minutes + "pm";
        } else {
            return "Tomorrow " + (hours-36) + ":" + minutes + "pm";
        }
    }
}

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
