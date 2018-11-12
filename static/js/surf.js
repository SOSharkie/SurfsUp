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

    self.confirm_surf_session = function() {
        $.post(add_surf_session_url,
            {
                user_id: self.vue.current_user.id,
                session: self.vue.best_spot_message
            }, 
            function () {
                self.vue.user_data.surf_sessions.push(self.vue.best_spot_message);
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

    //picks the spot with the highest wave height at 12pm
    self.surf = async function() {
        self.vue.calculating = true;
        var spot_ids = [];
        //gets spot ids for santa cruz
        const spotResponse = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
        for(var i = 0; i < spotResponse.data.length; i++){
            spot_ids[i] = spotResponse.data[i].spot_id;
        }

        //gets tide data for santa cruz for a whole week
        const tideResponse = await axios.get("http://api.spitcast.com/api/county/tide/santa-cruz/",
            {params: {dcat: "week"}});

        //gets wind data for santa cruz
        const windResponse = await axios.get("http://api.spitcast.com/api/county/wind/santa-cruz/",
            {params: {dcat: "week"}});

        //click on profile
        var skill_level = self.vue.user_data.skill_level;
        
        var startTime = self.start_hour;
        var endTime = self.end_hour;

        //find all times tide and wind will be suitable for skill level
        var suitableTimes = [];
        var lowestTideHour = startTime;
        for(var i = startTime; i < endTime; i++){
            var tideAtTime = tideResponse.data[i].tide;
            if(tideAtTime < tideResponse.data[lowestTideHour].tide){
                //check different wind levels based on skill level and throw out bad winds
                lowestTideHour = i;
            }
        }
        var lowestTideValue = tideResponse.data[lowestTideHour].tide;

        //go through each spot, check wave size at time
        var max_ft = [0,0,0];
        var best_spots_expert_names = [];
        var timeToCheck = lowestTideHour;
        var avg_ft_in_county = 0;
        for(var i = 0; i < spot_ids.length; i++){
            this_id = spot_ids[i];
            //get the forecast for each spot id
            const spotResponse = await axios.get("http://api.spitcast.com/api/spot/forecast/" + this_id + "/",
                { params: {dcat:"week"}});
            var current_stats = spotResponse.data[timeToCheck];
            if(current_stats.size_ft > max_ft[0]){
                max_ft[0] = current_stats.size_ft;
                best_spots_expert_names[0] = current_stats.spot_name;
            }
            else if(current_stats.size_ft > max_ft[1]){
                max_ft[1] = current_stats.size_ft;
                best_spots_expert_names[1] = current_stats.spot_name;
            }
            else if(current_stats.size_ft > max_ft[2]){
                max_ft[2] = current_stats.size_ft;
                best_spots_expert_names[2] = current_stats.spot_name;
            }
            //add to avg
            avg_ft_in_county += current_stats.size_ft;
        }
        console.log(max_ft);
        console.log(best_spots_expert_names);
        avg_ft_in_county = avg_ft_in_county/spot_ids.length;

        //go through again to look for beginner, intermeddiate, advanced
        var ft_at_avg_spot;
        var best_spots_advanced_names = [];
        var best_spots_intermediate_names = [];
        var best_spots_beginner_names = [];
        var beginnerSpots = [];
        var maxBeginner = [0,0,0];
        var maxIntermediate = [0,0,0];
        var maxAdvanced = [0,0,0];
        for(var i = 0; i < spot_ids.length; i++){
            this_id = spot_ids[i];
            //get the forecast for each spot id
            const spotResponse = await axios.get("http://api.spitcast.com/api/spot/forecast/" + this_id + "/",
                { params: {dcat:"week"}});
            var current_stats = spotResponse.data[timeToCheck];
            //advanced spot uses 1.5 ft above avg in county
            if(current_stats.size_ft < (avg_ft_in_county + 1.5) && current_stats.size_ft > avg_ft_in_county){
                if(current_stats.size_ft > maxAdvanced[0]){
                    maxAdvanced[0] = current_stats.size_ft;
                    best_spots_advanced_names[0] = current_stats.spot_name;
                }
                else if(current_stats.size_ft > maxAdvanced[1]){
                    maxAdvanced[1] = current_stats.size_ft;
                    best_spots_advanced_names[1] = current_stats.spot_name;
                }
                else if(current_stats.size_ft > maxAdvanced[2]){
                    maxAdvanced[2] = current_stats.size_ft;
                    best_spots_advanced_names[2] = current_stats.spot_name;
                }
            }
            //intermediate spot uses 1.5 ft under avg in county
            if(current_stats.size_ft > (avg_ft_in_county - 1.5) && current_stats.size_ft < avg_ft_in_county){
                if(current_stats.size_ft > maxIntermediate[0]){
                    maxIntermediate[0] = current_stats.size_ft;
                    best_spots_intermediate_names[0] = current_stats.spot_name;
                }
                else if(current_stats.size_ft > maxIntermediate[1]){
                    maxIntermediate[1] = current_stats.size_ft;
                    best_spots_intermediate_names[1] = current_stats.spot_name;
                }
                else if(current_stats.size_ft > maxIntermediate[2]){
                    maxIntermediate[2] = current_stats.size_ft;
                    best_spots_intermediate_names[2] = current_stats.spot_name;
                }
            }
            //beginner uses anything under 2.5 feet
            if(current_stats.size_ft < 2.5){
                if(current_stats.size_ft > maxBeginner[0]){
                    maxBeginner[0] = current_stats.size_ft;
                    best_spots_beginner_names[0] = current_stats.spot_name;
                }
                else if(current_stats.size_ft > maxBeginner[1]){
                    maxBeginner[1] = current_stats.size_ft;
                    best_spots_beginner_names[1] = current_stats.spot_name;
                }
                else if(current_stats.size_ft > maxBeginner[2]){
                    maxBeginner[2] = current_stats.size_ft;
                    best_spots_beginner_names[2] = current_stats.spot_name;
                }
            }
        }

        var timeDisplay = timeToCheck;
        var ampm = "AM";
        var todaytmrw = "Today";
        console.log(timeDisplay);
        if(timeDisplay > 12){
            if(timeDisplay < 24){
                ampm = "PM";
                timeDisplay -= 12;
            }
            else if(timeDisplay < 36){
                timeDisplay -= 24;
                todaytmrw ="Tomorrow";
            }
            else{
                ampm = "PM";
                todaytmrw = "Tomorrow";
                timeDisplay -= 36;
            }
        }
        console.log(timeDisplay);
        var best_spot_expert = best_spots_expert_names[0] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(max_ft[0] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_expert2 = best_spots_expert_names[1] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(max_ft[1] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_expert3 = best_spots_expert_names[2] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(max_ft[2] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";

        var best_spot_advanced = best_spots_advanced_names[0] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxAdvanced[0] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_advanced2 = best_spots_advanced_names[1] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxAdvanced[1] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_advanced3 = best_spots_advanced_names[2] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxAdvanced[2] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";

        var best_spot_intermediate = best_spots_intermediate_names[0] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxIntermediate[0] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_intermediate2 = best_spots_intermediate_names[1] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxIntermediate[1] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_intermediate3 = best_spots_intermediate_names[2] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxIntermediate[2] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";

        var best_spot_beginner = best_spots_beginner_names[0] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxBeginner[0] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_beginner2 = best_spots_beginner_names[1] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxBeginner[1] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
        var best_spot_beginner3 = best_spots_beginner_names[2] + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(maxBeginner[2] * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";

        if(skill_level == 'Beginner'){
            this.best_spot_message = best_spot_beginner;
            this.best_spot_message2 = best_spot_beginner2;
            this.best_spot_message3 = best_spot_beginner3;
        }
        else if(skill_level == 'Intermediate'){
            this.best_spot_message = best_spot_intermediate;
            this.best_spot_message2 = best_spot_intermediate2;
            this.best_spot_message3 = best_spot_intermediate3;
        }
        else if(skill_level == 'Advanced'){
            this.best_spot_message = best_spot_advanced;
            this.best_spot_message2 = best_spot_advanced2;
            this.best_spot_message3 = best_spot_advanced3;
        }
        else if(skill_level == 'Expert'){
            this.best_spot_message =  best_spot_expert;
            this.best_spot_message2 = best_spot_expert2;
            this.best_spot_message3 = best_spot_expert3;
        }
        else if(skill_level == null){
            this.best_spot_message = "Expert: " + best_spot_expert + "\n Advanced: " + 
            best_spot_advanced + "\n Intermediate: " + best_spot_intermediate +
            "\n Beginner: " + best_spot_beginner + "\n Log in if you would like a personalized recommendation";
        }
        self.vue.calculating = false;
        //set the markers on the map after finding the best spots
        setMarkers(timeToCheck, this.best_spot_message, this.best_spot_message2, this.best_spot_message3);
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
            best_spot_expert: "",
            best_spot_advanced: "",
            best_spot_intermediate: "",
            best_spot_beginner: "",
            best_spot_message: "",
            best_spot_message2: "",
            best_spot_message3: "",
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
            delete_surf_session: self.delete_surf_session
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
//adds a marker with wave height on each surf spot 
async function setMarkers(timeToCheck, bestSpotMessage1, bestSpotMessage2, bestSpotMessage3){
  var bestSpot1 = bestSpotMessage1.split(",");
  var bestSpot2 = bestSpotMessage2.split(",");
  var bestSpot3 = bestSpotMessage3.split(",");
  var bestImage = {
    url: 'https://developers.google.com/maps/documentation/javascript/examples/full/images/beachflag.png',
    // This marker is 20 pixels wide by 32 pixels high.
    size: new google.maps.Size(20, 32),
    // The origin for this image is (0, 0).
    origin: new google.maps.Point(0, 0),
    // The anchor for this image is the base of the flagpole at (0, 32).
    anchor: new google.maps.Point(0, 32)
  };
  const spotResponse = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
  for(var i = 0; i < spotResponse.data.length; i++){
    this_id = spotResponse.data[i].spot_id;
    const spotForecast = await axios.get("http://api.spitcast.com/api/spot/forecast/" + this_id + "/",
            { params: {dcat:"week"}});
    size_ft = Math.round(spotForecast.data[timeToCheck].size_ft * 100) / 100;
    spot_lat = spotResponse.data[i].latitude;
    spot_long = spotResponse.data[i].longitude;
    spot_name = spotResponse.data[i].spot_name;
    //best spots get different image and bounce
    if(spot_name == bestSpot1[0] || spot_name == bestSpot2[0] || spot_name == bestSpot3[0]){
      var marker = new google.maps.Marker({
        position: {lat: spot_lat, lng: spot_long}, 
        map: map,
        icon: bestImage,
        animation: google.maps.Animation.BOUNCE,
        title: spot_name + "\nWaves: " + size_ft + " ft",
        zIndex: 1
      });
    }
    else{
      var marker = new google.maps.Marker({
        position: {lat: spot_lat, lng: spot_long}, 
        map: map,
        animation: google.maps.Animation.DROP,
        title: spot_name + "\nWaves: " + size_ft + " ft",
        zIndex: 2
      });
    }
  }
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
