// This is the js for the default/surf.html view.

var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    time_convert = function(num)
    { 
        var hours = Math.floor(num / 60);
        var minutes = num % 60;
        if(hours == 0){
            if(minutes < 10){
                return (hours+12) + ":0" + minutes + "am";
            } else {
                return (hours+12) + ":" + minutes + "am";
            }
        } else if(hours < 12){
            if(minutes < 10){
                return hours + ":0" + minutes + "am";
            } else {
                return hours + ":" + minutes + "am";
            }
        } else if(hours == 12){
            if(minutes < 10){
                return hours + ":0" + minutes + "pm";
            } else {    
                return hours + ":" + minutes + "pm";
            }
        } else {
            if(minutes < 10){
                return (hours-12) + ":0" + minutes + "pm";
            } else {
                return (hours-12) + ":" + minutes + "pm";
            }
        }
    }

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            start_time: '12:00pm',
            start_num: 720,
            end_time: '12:00pm',
            end_num: 720
        },
        methods: {
            update_start_time: function(){
                var slider = document.getElementById("start_value");
                this.start_num = slider.value;
                this.start_time = time_convert(this.start_num);
            },

            update_end_time: function(){
                var slider = document.getElementById("end_value");
                this.end_num = slider.value;
                this.end_time = time_convert(this.end_num);
            }
        }

    });


    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
