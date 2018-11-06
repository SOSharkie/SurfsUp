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

    //picks the spot with the highest wave height at 12pm
    self.surf = async function() {
        var spot_ids = [];
        //gets spot ids for santa cruz
        const spotResponse = await axios.get("http://api.spitcast.com/api/county/spots/santa-cruz/");
        for(var i = 0; i < spotResponse.data.length; i++){
            spot_ids[i] = spotResponse.data[i].spot_id;
        }

        //gets tide data for santa cruz for a whole week
        const tideResponse = await axios.get("http://api.spitcast.com/api/county/tide/santa-cruz/",
            {params: {dcat: "week"}});

        //click on profile
        var skill_level = self.vue.user_data.skill_level;
        
        var startTime = self.start_hour;
        var endTime = self.end_hour;

        //find time with lowest tide value in given time window
        var lowestTideHour = startTime;
        for(var i = startTime; i < endTime; i++){
            var tideAtTime = tideResponse.data[i].tide;
            if(tideAtTime < tideResponse.data[lowestTideHour].tide){
                lowestTideHour = i;
            }
        }
        var lowestTideValue = tideResponse.data[lowestTideHour].tide;

        //go through each spot, check wave size at time
        var max_ft = 0;
        var best_spot_name;
        var timeToCheck = lowestTideHour;
        for(var i = 0; i < spot_ids.length; i++){
            this_id = spot_ids[i];
            //get the forecast for each spot id
            const spotResponse = await axios.get("http://api.spitcast.com/api/spot/forecast/" + this_id + "/",
                { params: {dcat:"week"}});
            var current_stats = spotResponse.data[timeToCheck];
            if(current_stats.size_ft > max_ft){
                max_ft = current_stats.size_ft;
                best_spot_name = current_stats.spot_name;
            }
        }
        var timeDisplay = timeToCheck;
        var ampm = "AM";
        var todaytmrw = "Today";
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
                timeDisplay -= 24;
            }
        }
        this.best_spot = best_spot_name + ", " + todaytmrw + " @ " + timeDisplay + ampm + ", Waves: " + Math.round(max_ft * 100)/100
             + " ft" + " Tide: " + Math.round(lowestTideValue * 100) / 100 + " ft ";
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
            best_spot: "",
            user_data: [],
            users: [],
            current_user: null,
            logged_in: false
        },
        methods: {
            get_users: self.get_users,
            surf: self.surf,
            get_user_data: self.get_user_data
        }

    });

    self.get_users();
    $("#vue-div").show();
    return self;
};

var APP = null;

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
    } else {
        if(minutes < 10){
            return "Tomorrow " + (hours-24) + ":0" + minutes + "am";
        } else {
            return "Tomorrow " + (hours-24) + ":" + minutes + "am";
        }
    }
}

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
