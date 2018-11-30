// This is the js for the default/profile.html view.

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
    self.get_user_data = function (user_id) {
        $.get(user_data_url, {user_id: user_id}, function (data) {
            if (data == null){
                self.add_user_data();
            } else {
                console.log("got user data", data.user_data);
                self.vue.user_data = data.user_data;
            }
        })
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
            }
        );
    };

    /*
    * Edits and saves the user data if the user changes one of the profile fields.
    */
    self.edit_user_data = function (new_board) {
        $.post(edit_user_data_url,
            {
                new_board: new_board,
                user_id: self.vue.current_user.id,
                username: self.vue.user_data.username,
                board: self.vue.new_board,
                skill_level: self.vue.user_data.skill_level,
                county: self.vue.user_data.county
            }, 
            function () {
                self.vue.adding_board = false;
                console.log("edited user_data", self.vue.user_data);
            }
        );
    };

    /*
    * Deletes all the user data in the database. (FOR DEVELOPERS ONLY)
    */
    self.delete_all_user_data = function() {
        $.post(delete_user_data_url, {  },
            function () {
                console.log("deleted all user data");
            }
        );
    };

    /*
    * Deletes all the groups in the database. (FOR DEVELOPERS ONLY)
    */
    self.delete_all_group_data = function() {
        $.post(delete_group_data_url, {  },
            function () {
                console.log("deleted all group data");
            }
        );
    };

    /*
    * Adds a new surfboard to the users profile.
    */
    self.add_board = function() {
        console.log("adding board");
        self.vue.edit_user_data("true");
        self.vue.adding_board = false;
        if (self.vue.user_data.boards){
            self.vue.user_data.boards.push(self.vue.new_board);
        } else {
            self.vue.user_data.boards = [self.vue.new_board];
        }
        self.vue.new_board = "New Board";
    }

    /*
    * Close the add board text field in the profile.
    */
    self.stop_adding_board = function() {
        self.vue.adding_board = false;
        self.vue.new_board = "New Board";
    }

    /*
    * Deletes the selected board fron the users profile.
    */
    self.delete_board = function(index) {
        console.log("delete board ", index);
        $.post(delete_board_url, { 
                user_id: self.vue.current_user.id,
                index: index
            },
            function() {
                self.vue.user_data.boards.splice(index, 1);
            }
        );
    }

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            logged_in: false,
            current_user: null,
            user_data: null,
            users: [],
            adding_board: false,
            new_board: "New Board"
        },
        methods: {
            get_users: self.get_users,
            get_user_data: self.get_user_data,
            add_user_data: self.add_user_data,
            edit_user_data: self.edit_user_data,
            delete_all_user_data: self.delete_all_user_data,
            delete_all_group_data: self.delete_all_group_data,
            add_board: self.add_board,
            stop_adding_board: self.stop_adding_board,
            delete_board: self.delete_board
        }

    });

    self.get_users();
    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
