// This is the js for the default/index.html view.

var app = function() {

    var self = {};

    Vue.config.silent = false; // show all warnings

    // Extends an array
    self.extend = function(a, b) {
        for (var i = 0; i < b.length; i++) {
            a.push(b[i]);
        }
    };

    self.change_page = function(new_page) {
        console.log(new_page);
        self.vue.page = new_page;
    }

    self.set_current_slide = function(slide) {
        console.log("set current slide to ", slide);
        // if (slide == 1){

        // } else if (slide == 2){

        // } else {
        //     self.vue.slide_style = {
        //         backgroundImage: 'url(../static/images/surfer_3.jpg)'
        //     };
        // }
    }

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            page: 'homepage',
            current_slide: 1,
            slide_style: {
                 backgroundImage: 'url(../static/images/surfer_1.jpg)'
            }
        },
        methods: {
            change_page: self.change_page,
            set_current_slide: self.set_current_slide
        }

    });

    $("#vue-div").show();
    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
