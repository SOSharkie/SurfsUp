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
        self.vue.county_response = await axios.get("http://api.spitcast.com/api/county/spots/" + county);
        self.vue.tide_response = await axios.get("http://api.spitcast.com/api/county/tide/" + county,
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
            if (self.vue.user_data.surf_sessions){
                if (self.vue.user_data.surf_sessions.includes(spot)){
                    return;
                }
            }
            self.vue.best_spot_1.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_1.clicked_spot = false;}, 2000);
        } else if (session_choice == 2){
            spot = self.vue.best_spot_message2
            if (self.vue.user_data.surf_sessions){
                if (self.vue.user_data.surf_sessions.includes(spot)){
                    return;
                }
            }
            self.vue.best_spot_2.clicked_spot = true;
            setTimeout(function(){self.vue.best_spot_2.clicked_spot = false;}, 2000);
        } else if (session_choice == 3){
            spot = self.vue.best_spot_message3
            if (self.vue.user_data.surf_sessions){
                if (self.vue.user_data.surf_sessions.includes(spot)){
                    return;
                }
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
    self.surf = async function(rec_type){
        this.warnings = "";
        
        if(rec_type == 0){
            var skill_level = self.vue.user_data.skill_level;
            if(skill_level === undefined){
                skill_level = "Expert";
                this.warnings = "You are not logged in. Displaying expert recommendation.";
            }
        }
        else if(rec_type == 1){
            var skill_level = self.vue.group_skill;
        }

        self.vue.calculating = true;
        
        var start_time = self.start_hour;
        var end_time = self.end_hour;
        var spot_ids = [];
        var spot_names = [];

        //gets spot ids and spot names for santa cruz
        var county_response = self.vue.county_response;
        var tide_response = self.vue.tide_response;
        //default to santa cruz if not logged in
        if(county_response == null){
            county_response = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
            tide_response = await axios.get("http://api.spitcast.com/api/county/tide/santa-cruz/",
                {params: {dcat: "week"}});
        }
        for(var i = 0; i < county_response.data.length; i++){
            spot_ids[i] = county_response.data[i].spot_id;
            spot_names[i] = county_response.data[i].spot_name;
        }
    
        var best_tide_times = find_best_tide_times(start_time, end_time, tide_response, spot_ids);
        var all_spots_best_time = [];       //array of every spots best time, same indexing as spot ids
        var all_spots_size_at_best_time = []; //array of the size of the waves at the best time for each spot, same indexing as spot ids
        var all_spots_tide_heights = [];    //array of the tide heights at these times

        var max_new_skill_level = skill_level;
        //for each spot find best time during best tide times
        for(var spot_to_check = 0; spot_to_check < spot_ids.length; spot_to_check++){
            var time_and_size = await find_best_time_for_spot(best_tide_times, skill_level, spot_ids[spot_to_check]);
            all_spots_best_time.push(time_and_size[0]);
            all_spots_size_at_best_time.push(time_and_size[1]);
            all_spots_tide_heights.push(tide_response.data[time_and_size[0]].tide);
            if(skill_level_as_int(time_and_size[3]) > skill_level_as_int(max_new_skill_level) ){
                max_new_skill_level = time_and_size[3];
            }
            //check if no waves were found in skill level
            if(time_and_size[2] == true){
                self.vue.warnings = "Caution: No waves were found in your skill level, the waves may be too large for you. Displaying waves for " + max_new_skill_level + " skill level.";
            }
        }

        //go through list of each spots best time and size and pick best 3 
        var top_three_spot_names = [];
        var top_three_spot_sizes = [0,0,0];
        var times_for_best_sizes = [];
        var tides_for_best_sizes = [];
        for(var spot_to_check = 0; spot_to_check < all_spots_best_time.length; spot_to_check++){
            if(all_spots_size_at_best_time[spot_to_check] > top_three_spot_sizes[0]){
                top_three_spot_sizes[2] = top_three_spot_sizes[1];
                times_for_best_sizes[2] = times_for_best_sizes[1];
                top_three_spot_names[2] = top_three_spot_names[1];
                tides_for_best_sizes[2] = tides_for_best_sizes[1];

                top_three_spot_sizes[1] = top_three_spot_sizes[0];
                times_for_best_sizes[1] = times_for_best_sizes[0];
                top_three_spot_names[1] = top_three_spot_names[0];
                tides_for_best_sizes[1] = tides_for_best_sizes[0];

                top_three_spot_sizes[0] = all_spots_size_at_best_time[spot_to_check];
                times_for_best_sizes[0] = all_spots_best_time[spot_to_check];
                top_three_spot_names[0] = spot_names[spot_to_check]; 
                tides_for_best_sizes[0] = all_spots_tide_heights[spot_to_check];
            }
            else if(all_spots_size_at_best_time[spot_to_check] > top_three_spot_sizes[1]){
                top_three_spot_sizes[2] = top_three_spot_sizes[1];
                times_for_best_sizes[2] = times_for_best_sizes[1];
                top_three_spot_names[2] = top_three_spot_names[1];
                tides_for_best_sizes[2] = tides_for_best_sizes[1];

                top_three_spot_sizes[1] = all_spots_size_at_best_time[spot_to_check];
                times_for_best_sizes[1] = all_spots_best_time[spot_to_check];
                top_three_spot_names[1] = spot_names[spot_to_check]; 
                tides_for_best_sizes[1] = all_spots_tide_heights[spot_to_check];
            }
            else if(all_spots_size_at_best_time[spot_to_check] > top_three_spot_sizes[2]){
                top_three_spot_sizes[2] = all_spots_size_at_best_time[spot_to_check];
                times_for_best_sizes[2] = all_spots_best_time[spot_to_check];
                top_three_spot_names[2] = spot_names[spot_to_check]; 
                tides_for_best_sizes[2] = all_spots_tide_heights[spot_to_check];
            }
        }
        //clear all markers on the map before adding new recommended spots
        clearMarkers();
        self.vue.best_spot_message = create_spot_message(top_three_spot_names[0], times_for_best_sizes[0], top_three_spot_sizes[0], tides_for_best_sizes[0] );
        self.vue.best_spot_message2 = create_spot_message(top_three_spot_names[1], times_for_best_sizes[1], top_three_spot_sizes[1], tides_for_best_sizes[1]);
        self.vue.best_spot_message3 = create_spot_message(top_three_spot_names[2], times_for_best_sizes[2], top_three_spot_sizes[2], tides_for_best_sizes[2]);

        self.vue.best_spot_1 = create_spot_object(top_three_spot_names[0], times_for_best_sizes[0], top_three_spot_sizes[0], tides_for_best_sizes[0]);
        self.vue.best_spot_2 = create_spot_object(top_three_spot_names[1], times_for_best_sizes[1], top_three_spot_sizes[1], tides_for_best_sizes[1]);
        self.vue.best_spot_3 = create_spot_object(top_three_spot_names[2], times_for_best_sizes[2], top_three_spot_sizes[2], tides_for_best_sizes[2]);
        self.vue.calculating = false;
        
        var county = getCounty();
        //add markers to each spot
        setMarker(self.vue.best_spot_message, county, times_for_best_sizes[0]);
        setMarker(self.vue.best_spot_message2, county, times_for_best_sizes[1]);
        setMarker(self.vue.best_spot_message3, county, times_for_best_sizes[2]);

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
            tide_response: null,
            county_response: null,
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
async function setMarker(surfSpotMessage, county, time){
    //parses best spot message to get data to be displayed when a marker is clicked
    //[0]-spot name, [1]-timeMsg, [2]-wave_ft, [3]-tide_ft
    var parsed_message = surfSpotMessage.split(","); 
    var county_response = await axios.get("http://api.spitcast.com/api/county/spots/" + county);
    var best_spot_coords = []; 
    var spot_id;
    //this loop is only to get the coords of the spots
    for(var i = 0; i < county_response.data.length && best_spot_coords.length != 2; i++){
        spot_name = county_response.data[i].spot_name;
        if(spot_name == parsed_message[0]){
            best_spot_coords.push(county_response.data[i].latitude);
            best_spot_coords.push(county_response.data[i].longitude);
            spot_id = county_response.data[i].spot_id;
        }
    }
    //spot forecast at the recomended time
    const spot_response = await axios.get("http://api.spitcast.com/api/spot/forecast/" + spot_id + "/",
        { params: {dcat:"week"}});
    var spot_forecast = spot_response.data[time];
    spot_name = parsed_message[0];
    //Contains info to be displayed when marker is clicked
    var infowindow;
    if(time == null){
        infowindow = new google.maps.InfoWindow({
            content:'<div><b>'+ spot_name + '</b></div>' + 
            '<div>' + parsed_message[1] + '</div>' + 
            '<div>' + parsed_message[2] + '</div>' + 
            '<div>' + parsed_message[3] + '</div>',
        });
    }
    else {
        infowindow = new google.maps.InfoWindow({
            content:'<div><b>'+ spot_name + '</b></div>' + 
            '<div>' + parsed_message[1] + '</div>' + 
            '<div>' + "Swell: " + spot_forecast.shape_detail.swell + '</div>' + 
            '<div>' + "Tide: " + spot_forecast.shape_detail.tide + '</div>' +
            '<div>' + "Wind: " + spot_forecast.shape_detail.wind + '</div>',
        });
    }
    var marker = new google.maps.Marker({ 
        position: {lat: best_spot_coords[0], lng: best_spot_coords[1]}, 
        map: map,
        animation: google.maps.Animation.DROP,
        title: spot_name
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
async function calculate_average_size_in_county(spot_ids, time){
    var avg_size_in_county = 0;
    for(var spot_id_to_check = 0; spot_id_to_check < spot_ids.length; spot_id_to_check++){
        thisId = spot_ids[spot_id_to_check];
        const spot_response = await axios.get("http://api.spitcast.com/api/spot/forecast/" + thisId + "/",
            { params: {dcat:"week"}});
        var current_stats_at_spot = spot_response.data[time];
        avg_size_in_county += current_stats_at_spot.size_ft;
    }
    avg_size_in_county = avg_size_in_county/spot_ids.length;
    return avg_size_in_county;
}

//takes avg wave size in county, start and end time inputted by user, and the api response for tide
//returns the list of the most appropriate tide times based on current wave sizes
function find_best_tide_times(start_time, end_time, tide_response, spot_ids){
    var best_tide_times = [];

    for(var time_to_check = start_time; time_to_check <= end_time; time_to_check++){
        var current_avg_size = calculate_average_size_in_county(spot_ids, time_to_check);
        var min_max_tides = calculate_min_max_tide_heights(current_avg_size);
        var min_acceptable_tide = min_max_tides[0]; 
        var max_acceptable_tide = min_max_tides[1];
        var tide_at_time = tide_response.data[time_to_check].tide;
        if(tide_at_time > min_acceptable_tide && tide_at_time < max_acceptable_tide){
            best_tide_times.push(time_to_check);
        }
    }
    if (best_tide_times.length == 0){
        best_tide_times.push(start_time);
        best_tide_times.push(end_time);
    }
    return best_tide_times;
}

function calculate_min_max_tide_heights(avgSize){
    var min_acceptable_tide; 
    var max_acceptable_tide;
    if(avgSize < 2.5){      // lower tides are better for smaller waves
        min_acceptable_tide = -5; // will never be this low, take as low as possible
        max_acceptable_tide = 3;
    }
    else if(avgSize > 5){   // tide matters less when waves are bigger
        min_acceptable_tide = 0;
        max_acceptable_tide = 4;
    }
    else{                   // tide for everything else
        min_acceptable_tide = 0;
        max_acceptable_tide = 3.5;
    }
    return [min_acceptable_tide, max_acceptable_tide];
}

//takes list of times where tide is good, user skill level, ID of spot to check, avg wave size
//returns the time with the best waves for the specific spot, and the actual size of the waves at that time
async function find_best_time_for_spot(best_tide_times, skill_level, spotId){
    var min_and_max_heights = calculate_min_max_wave_heights(skill_level); // 0 is min 1 is max
    var min_height = min_and_max_heights[0]; 
    var max_height = min_and_max_heights[1];
    var best_size_for_spot = 0;
    var time_with_best_size = 0;
    var skill_changed = false;
    var next_skill_level = skill_level;
    var highest_skill_level = skill_level;

    const spot_response = await axios.get("http://api.spitcast.com/api/spot/forecast/" + spotId + "/",
        { params: {dcat:"week"}});

    for(var time_to_check = 0; time_to_check < best_tide_times.length; time_to_check++){
        var current_stats_at_spot = spot_response.data[best_tide_times[time_to_check]];
        var size_at_time = current_stats_at_spot.size_ft;
        if(size_at_time < max_height && size_at_time > min_height){
            if(size_at_time > best_size_for_spot){
                best_size_for_spot = size_at_time;
                time_with_best_size = best_tide_times[time_to_check];
            }
        }
    }
    if(time_with_best_size == 0 || best_size_for_spot == 0){
        next_skill_level = calculate_next_skill(skill_level);
        highest_skill_level = next_skill_level;
        var time_and_size = await find_best_time_for_spot(best_tide_times, next_skill_level, spotId);
        time_with_best_size = time_and_size[0];
        best_size_for_spot = time_and_size[1];
        highest_skill_level = time_and_size[3];
        skill_changed = true;
    }
    return [time_with_best_size, best_size_for_spot, skill_changed, highest_skill_level];
}

//takes skill level
//returns next higherup skill level
function calculate_next_skill(skill_level){
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
 
function skill_level_as_int(skill_level){
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
function calculate_min_max_wave_heights(skill_level){
    var min_height; 
    var max_height;
    if(skill_level == 'Beginner'){
        min_height = 0; // no minimum 
        max_height = 2.5;
    }
    else if(skill_level == 'Intermediate'){
        min_height = 0;
        max_height = 3.5;
    }
    else if(skill_level == 'Advanced'){
        min_height = 0;
        max_height = 6;
    }
    else if(skill_level == 'Expert'){
        min_height = 0;
        max_height = 50; // no maximum
    }
    return [min_height, max_height];
}

function create_spot_message(spot_name, time, wave_size, tide_height){
    var am_pm = "AM";
    var today_tomorrow = "Today";
    var today_date = new Date();
    var date_day = today_date.getDate();
    var date_month = today_date.getMonth() + 1;
    if(time >= 12){
        if(time < 24){
            am_pm = "PM";
            time -= 12;
        }
        else if(time < 36){
            time -=24;
            today_tomorrow = "Tomorrow";
        }
        else{
            am_pm = "PM";
            today_tomorrow = "Tomorrow";
            time -= 36;
        }
        if(time == 0){
            time = 12;
        }
        if(time == 12){
            am_pm = "PM";
        }
    }
    if(today_tomorrow == "Tomorrow"){
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
    var message = spot_name + ", " + date_day_and_month + " @ " + time + am_pm + ", Waves: " + Math.round(wave_size * 100)/100
        + " ft," + " Tide: " + Math.round(tide_height * 100)/100 + " ft ";
    return message;
}

function create_spot_object(spot_name, time, wave_size, tide_height){
    var am_pm = "AM";
    var today_tomorrow = "Today";
    if(time >= 12){
        if(time < 24){
            am_pm = "PM";
            time -= 12;
        }
        else if(time < 36){
            time -=24;
            today_tomorrow = "Tomorrow";
        }
        else{
            am_pm = "PM";
            today_tomorrow = "Tomorrow";
            time -= 36;
        }
        if(time == 0){
            time = 12;
        }
        if(time == 12){
            am_pm = "PM";
        }
    }
    var time_string = today_tomorrow + " @ " + time + am_pm;
    var wave_string = Math.round(wave_size * 100)/100+ " ft";
    var tide_string = Math.round(tide_height * 100)/100 + " ft ";

    var spotObj = {
        style: {
            backgroundImage: getSpotPictureUrl(spot_name)
        },
        spot: spot_name,
        wave_height: wave_string,
        tide: tide_string,
        time: time_string,
        clicked_spot: false
    };
    return spotObj;
}

function getSpotPictureUrl(spot_name){
    spotPics = ['naturalbridges', 'waddellreefs', 'steamerlane', 'davenportlanding', 'manresa', 'santamarias',
    'pleasurepoint', 'cowells', '26thavenue', '38thavenue', 'getchell', 'blacks', 'threemile', 'fourmile',
    'oceanbeach', 'mavericks', , 'uppertrestles', 'huntingtonbeach', 'bolsachica', 'scottscreek'];
    var spot = spot_name.replace(/\s+/g, '').toLowerCase();
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
