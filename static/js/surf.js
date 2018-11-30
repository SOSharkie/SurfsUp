// This is the js for the default/surf.html view.

var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    /*
    * Gets all users in the system, and the current user if logged in.
    */
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

    /*
    * Gets the user data for the currently logged in user.
    */
    self.get_user_data = async function (user_id) {
        await $.get(user_data_url, {user_id: user_id}, function (data) {
            if (data == null){
                self.add_user_data();
            } else {
                console.log("got user data", data.user_data);
                self.vue.user_data = data.user_data;
                self.get_groups();
            }
        });
        var county = getCounty();
        self.vue.countyResponse = await axios.get("http://api.spitcast.com/api/county/spots/" + county);
        self.vue.tideResponse = await axios.get("http://api.spitcast.com/api/county/tide/" + county,
            {params: {dcat: "week"}});
        centerMap(self.vue.user_data.county);
    };

    /*
    * Creates the user data in the database if this is a new user.
    */
    self.add_user_data = function () {
        $.post(add_user_data_url,
            {
                user_id: self.vue.current_user.id
            }, 
            function (data) {
                console.log("added user_data", data.user_data);
                self.vue.user_data = data.user_data;
                self.get_groups();
            }
        );
    };

    /*
    * Adds a surf session to the users sessions when the user clicks on a recommendation.
    */
    self.confirm_surf_session = function(session_choice) {
        if (!self.vue.logged_in){
            return;
        }
        var spot;
        if (session_choice == 1){
            spot = self.vue.best_spot_message;
            if (self.vue.user_data.surf_sessions.includes(spot)){
                return;
            }
            self.vue.best_spot_1.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_1.clicked_spot = false;}, 2000);
        } else if (session_choice == 2){
            spot = self.vue.best_spot_message2
            if (self.vue.user_data.surf_sessions.includes(spot)){
                return;
            }
            self.vue.best_spot_2.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_2.clicked_spot = false;}, 2000);
        } else if (session_choice == 3){
            spot = self.vue.best_spot_message3
            if (self.vue.user_data.surf_sessions.includes(spot)){
                return;
            }
            self.vue.best_spot_3.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_3.clicked_spot = false;}, 2000);
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
                console.log("added surf session", spot);
            }
        );
    };

    /*
    * Adds a surf session to the selected group if the user clicks on a recommendation.
    */
    self.confirm_group_session = function(session_choice){
        var spot;
        if (session_choice == 1){
            spot = self.vue.best_spot_message;
            self.vue.best_spot_1.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_1.clicked_spot = false;}, 2000);
        } else if (session_choice == 2){
            spot = self.vue.best_spot_message2
            self.vue.best_spot_2.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_2.clicked_spot = false;}, 2000);
        } else if (session_choice == 3){
            spot = self.vue.best_spot_message3
            self.vue.best_spot_3.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_3.clicked_spot = false;}, 2000);
        }
        var selected_group_id = (self.vue.groups.find(
            group => group.group_name == self.vue.selected_group)).id;
        console.log("session:", spot);
        $.post(edit_group_session_url,
            {
                group_id: selected_group_id,
                session: spot
            }, 
            function () {
                console.log("added group surf session", spot);
            }
        );
    };

    /*
    * Deletes a session from a users surf sessions.
    */
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

    /*
    * Creates 3 different recommendations surf spots based on waves, tides, and user skill level
    */
    self.surf = async function(recType){
        this.warnings = "";
        
        if(recType == 0){
            var skill_level = self.vue.user_data.skill_level;
            if(skill_level === undefined){
                skill_level = "Expert";
                this.warnings = "You are not logged in. Displaying expert recommendation.";
            }
        }
        else if(recType == 1){
            var skill_level = self.vue.group_skill;
        }

        self.vue.calculating = true;
        
        var startTime = self.start_hour;
        var endTime = self.end_hour;
        var spotIds = [];
        var spotNames = [];

        //gets spot ids and spot names for santa cruz
        var countyResponse = self.vue.countyResponse;
        var tideResponse = self.vue.tideResponse;
        //default to santa cruz if not logged in
        if(countyResponse == null){
            countyResponse = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
            tideResponse = await axios.get("http://api.spitcast.com/api/county/tide/santa-cruz/",
                {params: {dcat: "week"}});
        }
        for(var i = 0; i < countyResponse.data.length; i++){
            spotIds[i] = countyResponse.data[i].spot_id;
            spotNames[i] = countyResponse.data[i].spot_name;
        }
    
        var bestTideTimes = findBestTideTimes(startTime, endTime, tideResponse, spotIds);
        var allSpotsBestTime = [];       //array of every spots best time, same indexing as spot ids
        var allSpotsSizeAtBestTime = []; //array of the size of the waves at the best time for each spot, same indexing as spot ids
        var allSpotsTideHeights = [];    //array of the tide heights at these times

        var maxNewSkillLevel = skill_level;
        //for each spot find best time during best tide times
        for(var spotToCheck = 0; spotToCheck < spotIds.length; spotToCheck++){
            var timeAndSize = await findBestTimeForSpot(bestTideTimes, skill_level, spotIds[spotToCheck]);
            allSpotsBestTime.push(timeAndSize[0]);
            allSpotsSizeAtBestTime.push(timeAndSize[1]);
            allSpotsTideHeights.push(tideResponse.data[timeAndSize[0]].tide);
            if(skillLevelAsInt(timeAndSize[3]) > skillLevelAsInt(maxNewSkillLevel) ){
                maxNewSkillLevel = timeAndSize[3];
            }
            //check if no waves were found in skill level
            if(timeAndSize[2] == true){
                self.vue.warnings = "Caution: No waves were found in your skill level, the waves may be too large for you. Displaying waves for " + maxNewSkillLevel + " skill level.";
            }
        }

        //go through list of each spots best time and size and pick best 3 
        var topThreeSpotNames = [];
        var topThreeSpotSizes = [0,0,0];
        var timesForBestSizes = [];
        var tidesForBestSizes = [];
        for(var spotToCheck = 0; spotToCheck < allSpotsBestTime.length; spotToCheck++){
            if(allSpotsSizeAtBestTime[spotToCheck] > topThreeSpotSizes[0]){
                topThreeSpotSizes[2] = topThreeSpotSizes[1];
                timesForBestSizes[2] = timesForBestSizes[1];
                topThreeSpotNames[2] = topThreeSpotNames[1];
                tidesForBestSizes[2] = tidesForBestSizes[1];

                topThreeSpotSizes[1] = topThreeSpotSizes[0];
                timesForBestSizes[1] = timesForBestSizes[0];
                topThreeSpotNames[1] = topThreeSpotNames[0];
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
        //clear all markers on the map before adding new recommended spots
        clearMarkers();
        self.vue.best_spot_message = createSpotMessage(topThreeSpotNames[0], timesForBestSizes[0], topThreeSpotSizes[0], tidesForBestSizes[0] );
        self.vue.best_spot_message2 = createSpotMessage(topThreeSpotNames[1], timesForBestSizes[1], topThreeSpotSizes[1], tidesForBestSizes[1]);
        self.vue.best_spot_message3 = createSpotMessage(topThreeSpotNames[2], timesForBestSizes[2], topThreeSpotSizes[2], tidesForBestSizes[2]);

        self.vue.best_spot_1 = createSpotObject(topThreeSpotNames[0], timesForBestSizes[0], topThreeSpotSizes[0], tidesForBestSizes[0]);
        self.vue.best_spot_2 = createSpotObject(topThreeSpotNames[1], timesForBestSizes[1], topThreeSpotSizes[1], tidesForBestSizes[1]);
        self.vue.best_spot_3 = createSpotObject(topThreeSpotNames[2], timesForBestSizes[2], topThreeSpotSizes[2], tidesForBestSizes[2]);
        self.vue.calculating = false;
        
        var county = getCounty();
        //add markers to each spot
        setMarker(self.vue.best_spot_message, county);
        setMarker(self.vue.best_spot_message2, county);
        setMarker(self.vue.best_spot_message3, county);

    };

    /*
    * Set the marker on the map when the user clicks on a surf session.
    */
    self.view_surf_session = async function(message) {
        clearMarkers();
        setMarker(message, getCounty());
    }

    /*
    * Gets all the groups the current user is a part of.
    */
    self.get_groups = function(){
        $.post(get_groups_url, {
                group_owner: self.vue.current_user.email,
                user_id: self.vue.current_user.id
            }, function(data){
                self.vue.groups = data.groups;
                console.log("got group data", self.vue.groups);
            }
        );
    };

    /*
    * Calculates the average skill level in the currently selected group.
    */
    self.calculate_group_skill = function(){
        if (self.vue.selected_group == ''){
            self.vue.display_group_alert = true;
            setTimeout(function(){self.vue.display_group_alert = false;}, 3000);
            return;
        }
        $.get(calculate_group_skill_url, {
                group: self.vue.selected_group,
            }, function(data){
                console.log("avg skill level: ", data);
                if (data == 1)
                    self.vue.group_skill = 'Beginner';
                else if (data == 2)
                    self.vue.group_skill = 'Intermediate';
                else if (data == 3)
                    self.vue.group_skill = 'Advanced';
                else if (data == 4)
                    self.vue.group_skill = 'Expert';
                else
                    self.vue.group_skill = 'Beginner';
                self.surf(1);
            }    

        );
    };

    /*
    * Returns true if the session date is in the past, false if the session date is in the future
    */
    self.session_date_past = function(session){
        var current_time = new Date();
        var session_date = session.substring(session.indexOf(',')+1, session.indexOf('W')-2);
        var month = parseInt(session_date.substring(1, session_date.indexOf('/')));
        var day = parseInt(session_date.substring(session_date.indexOf('/')+1, session_date.indexOf('@')-1));
        var hour = session_date.substr(session_date.indexOf('@')+2);
        if (hour.includes("PM")){
            hour = hour.replace("PM", "");
            hour = parseInt(hour)+12;
        } else {
            hour = hour.replace("AM", "");
            hour = parseInt(hour);
        }
        var session_date_obj = new Date(current_time.getFullYear(), month-1, day, hour, 0, 0, 0);

        return session_date_obj < current_time;
    }

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
            tideResponse: null,
            countyResponse: null,
            warnings: "",
            best_spot_1: null,
            best_spot_2: null,
            best_spot_3: null,
            markers: [],
            user_data: [],
            users: [],
            current_user: null,
            logged_in: false,
            calculating: false,
            toggle_groups: false,
            groups: [],
            selected_group: '',
            display_group_alert: false,
            group_skill: 'Beginner',
        },
        methods: {
            get_users: self.get_users,
            surf: self.surf,
            get_user_data: self.get_user_data,
            add_user_data: self.add_user_data,
            confirm_surf_session: self.confirm_surf_session,
            confirm_group_session: self.confirm_group_session,
            delete_surf_session: self.delete_surf_session,
            view_surf_session: self.view_surf_session,
            get_groups: self.get_groups,
            calculate_group_skill: self.calculate_group_skill,
            session_date_past: self.session_date_past,
            toggle_to_group: function(choice){
                self.vue.best_spot_message = "";
                this.best_spot_1 = null;
                self.vue.best_spot_message2 = "";
                this.best_spot_2 = null;
                self.vue.best_spot_message3 = "";
                this.best_spot_3 = null;
                this.toggle_groups = choice;
            }
        }

    });

    self.get_users();

    var current_url = window.location.href;
    if (current_url.includes("group=")){
        self.vue.toggle_groups = true;
        var url_group = current_url.substr(current_url.indexOf('=')+1);
        self.vue.selected_group = url_group.replace(/%20/g, " ");
        console.log("selected_group: ", self.vue.selected_group);
    }

    $("#vue-div").show();
    return self;
};

var APP = null;

//refrence to google map
var map;
//sets up the blank intial map of santa cruz
function initMap() {
    var santa_cruz = {lat: 36.974117, lng: -122.030792};
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 10,
        center: santa_cruz
    });
}

function clearMarkers(){
    for(var i = 0; i < APP.vue.markers.length; i++){
        APP.vue.markers[i].setMap(null);
    }
}

//adds a marker with wave height on each reccomended surf spot 
async function setMarker(surfSpotMessage, county){
  //parses best spot message to get data to be displayed when a marker is clicked
  //[0]-spot name, [1]-timeMsg, [2]-wave_ft, [3]-tide_ft
  var parsedMessage = surfSpotMessage.split(",");
  //this api call is only to get the coords of the spots
  const spotResponse = await axios.get("http://api.spitcast.com/api/county/spots/" + county);
  var bestSpotCoords = []; 
  for(var i = 0; i < spotResponse.data.length && bestSpotCoords.length != 2; i++){
    spotName = spotResponse.data[i].spot_name;
    if(spotName == parsedMessage[0]){
        bestSpotCoords.push(spotResponse.data[i].latitude);
        bestSpotCoords.push(spotResponse.data[i].longitude);
    }
  }
  spotName = parsedMessage[0];
  var infowindow = new google.maps.InfoWindow({
    content:'<div><b>'+ spotName + '</b></div>' + 
            '<div>' + parsedMessage[1] + '</div>' + 
            '<div>' + parsedMessage[2] + '</div>' + 
            parsedMessage[3],
  });
  var marker = new google.maps.Marker({ 
    position: {lat: bestSpotCoords[0], lng: bestSpotCoords[1]}, 
    map: map,
    animation: google.maps.Animation.DROP,
    title: spotName
  });
  APP.vue.markers.push(marker);
  marker.addListener('click', function() {
    infowindow.open(map, marker);
  });
}

//formats users county for api calls
function getCounty(){
    var countyString = APP.vue.user_data.county;
    var county = "";
    switch(countyString){
        case "Santa Cruz":
            county = "santa-cruz/";
            break;
        case "San Francisco":
            county = "san-francisco/";
            break;
        case "San Mateo":
            county = "san-mateo/";
            break;
        case "Monterey":
            county = "monterey/";
            break;
        case "Santa Barbara":
            county = "santa-barbara/";
            break;
        case "Ventura":
            county = "ventura/";
            break;
        case "Los Angeles":
            county = "los-angeles/";
            break;
        case "Orange County":
            county = "orange-county/";
            break;
        case "San Diego":
            county = "san-diego/";
            break;
        default:
            county = "santa-cruz/";
            break;
    }
    return county;
}

//centers map on users county
function centerMap(county){
    var latlng = null;
    switch(county){
        case "San Francisco":
            latlng = {lat:37.773972, lng: -122.431297};
            break;
        case "San Mateo":
            latlng = {lat:37.5629917, lng: -122.3255254};
            break;
        case "Monterey":
            latlng = {lat:36.603954, lng: -121.898460};
            break;
        case "Santa Barbara":
            latlng = {lat:34.420830, lng: -119.998189};
            break;
        case "Ventura":
            latlng = {lat:34.274647, lng: -119.229034};
            break;
        case "Los Angeles":
            latlng = {lat:34.052235, lng: -118.243683};
            break;
        case "Orange County":
            latlng = {lat:33.6077944, lng: -117.8531119};
            break;
        case "San Diego":
            latlng = {lat:32.715736, lng: -117.161087};
            break;
    }
    map.setCenter(latlng);
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

//takes avg wave size in county, start and end time inputted by user, and the api response for tide
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
    if (bestTideTimes.length == 0){
        bestTideTimes.push(startTime);
        bestTideTimes.push(endTime);
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
    var skillChanged = false;
    var next_skill_level = skill_level;
    var highest_skill_level = skill_level;

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
    if(timeWithBestSize == 0 || bestSizeForSpot == 0){
        next_skill_level = calculateNextSkill(skill_level);
        highest_skill_level = next_skill_level;
        var timeAndSize = await findBestTimeForSpot(bestTideTimes, next_skill_level, spotId);
        timeWithBestSize = timeAndSize[0];
        bestSizeForSpot = timeAndSize[1];
        highest_skill_level = timeAndSize[3];
        skillChanged = true;
    }
    return [timeWithBestSize, bestSizeForSpot, skillChanged, highest_skill_level];
}

//takes skill level
//returns next higherup skill level
function calculateNextSkill(skill_level){
    var new_skill;
    if(skill_level == "Beginner"){
        new_skill = "Intermediate";
    }
    else if(skill_level == "Intermediate"){
        new_skill = "Advanced";
    }
    else if(skill_level == "Advanced"){
        new_skill = "Expert";
    }
    return new_skill;
}
 
function skillLevelAsInt(skill_level){
    if(skill_level == 'Beginner'){
        return 1;
    }
    else if(skill_level == 'Intermediate'){
        return 2;
    }
    else if(skill_level == 'Advanced'){
        return 3;
    }
    else if(skill_level == 'Expert'){
        return 4;
    }
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
        maxHeight = 50; // no maximum
    }
    return [minHeight, maxHeight];
}

function createSpotMessage(spotName, time, waveSize, tideHeight){
    var ampm = "AM";
    var todayTmrw = "Today";
    var todayDate = new Date();
    var date_day = todayDate.getDate();
    var date_month = todayDate.getMonth() + 1;
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
    if(todayTmrw == "Tomorrow"){
        date_day++;
        if(date_month % 2 == 0){
            if(date_day > 31){
                date_month++;
                if(date_month > 12){
                    date_month = 1;
                }
                date_day = 1;
            }
        }
        else if(date_month != 3){
            if(date_day > 30){
                date_month++;
                date_day = 1;
            }
        }
        else{
            if(date_day > 28){
                date_month++;
                date_day = 1;
            }
        }
    }
    var date_day_and_month = date_month + "/" + date_day;
    var message = spotName + ", " + date_day_and_month + " @ " + time + ampm + ", Waves: " + Math.round(waveSize * 100)/100
        + " ft," + " Tide: " + Math.round(tideHeight * 100)/100 + " ft ";
    return message;
}

function createSpotObject(spotName, time, waveSize, tideHeight){
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
    var timeString = todayTmrw + " @ " + time + ampm;
    var waveString = Math.round(waveSize * 100)/100+ " ft";
    var tideString = Math.round(tideHeight * 100)/100 + " ft ";

    var spotObj = {
        style: {
            backgroundImage: getSpotPictureUrl(spotName)
        },
        spot: spotName,
        wave_height: waveString,
        tide: tideString,
        time: timeString,
        clicked_spot: false
    };
    return spotObj;
}

function getSpotPictureUrl(spotName){
    spotPics = ['naturalbridges', 'waddellreefs', 'steamerlane', 'davenportlanding', 'manresa', 'santamarias',
    'pleasurepoint', 'cowells', '26thavenue', '38thavenue', 'getchell', 'blacks', 'threemile', 'fourmile',
    'oceanbeach', 'mavericks', , 'uppertrestles', 'huntingtonbeach', 'bolsachica', 'scottscreek'];
    var spot = spotName.replace(/\s+/g, '').toLowerCase();
    if (spot.includes('oceanbeach')){
        spot = 'oceanbeach';
    }
    if (spotPics.includes(spot)){
        return 'url(../../static/images/' + spot + '.jpg)';
    }
    return 'url(../../static/images/generic_spot.jpg)';
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
