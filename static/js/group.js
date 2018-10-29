// This is the js for the default/index.html view.

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
                self.get_groups();
            }
        });
        //$.post(delete_all_group_data_url, function(){console.log("deleted all group data")});
    };

    self.get_user_data = function (user_id) {
        $.get(user_data_url, {user_id: user_id}, function (data) {
            if (data == null){
                //self.add_user_data();
            } else {
                console.log("got user data", data.user_data);
                self.vue.user_data = data.user_data;
            }
        });
    };

    self.get_groups = function(){
        $.post(get_groups_url, {
                group_owner: self.vue.current_user.email,
            }, function(data){
                self.vue.groups = data.groups;
                console.log("got group data", self.vue.groups);
                //self.vue.group_id = self.vue.groups.length;
                console.log("group id: ", self.vue.group_id);
            }
        );
    };

    self.get_group = function(group_idx){
        $.post(get_group_url, {
                group_owner: self.vue.current_user.email,
                group_id: group_idx
            }, function(data){
                self.vue.current_group = data.group;
                self.vue.group_name = self.vue.current_group.group_name;
                self.vue.group_id = self.vue.current_group.group_id;
        });
    };

    self.change_group_name = function(group_idx){
        $.post(change_group_name_url, {
                group_owner: self.vue.current_user.email,
                group_id: group_idx,
                group_name: self.vue.group_name,
            }, function(){
                console.log("changed group name to", self.vue.group_name);
            }
        );
    };

    self.invite_member = function(){

    };

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_making_group: false,
            group_name: 'your group name',
            username: 'username',
            logged_in: false,
            current_user: null,
            current_group: null,
            user_data: null,
            group_data: null,
            group_id: 0,
            users: [],
            groups: [],
        },
        methods: {
            toggle_making_group: function(){
                this.is_making_group = !this.is_making_group;
            },
            add_group: function(){
                this.group_id = self.vue.groups.length;
                $.post(add_group_url, {
                        group_owner: this.current_user.email,
                        group_name: this.group_name,
                        group_id: this.group_id,
                    }, function(data){
                        this.group_data = data.group_data;
                        console.log("created new group", this.group_data);
                    }
                );
                console.log("group_id of group created: ", this.group_id);
            },
            get_groups: self.get_groups,
            get_group: self.get_group,
            change_group_name: self.change_group_name,
            invite_member: self.invite_member,
        }

    });
    self.get_users();
    //self.get_groups();
    //setTimeout(self.get_groups(), 10000);

    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
