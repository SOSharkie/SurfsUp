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
                self.get_notifications(user_id);
            }
        });
    };

    self.get_notifications = function(user_id){
        $.get(get_notifications_url, {
                user_id: user_id
            }, function(data){
                console.log(data.nfc_data);
                self.vue.notifications = data.nfc_data;
            }
        );
    }

    self.get_groups = function(){
        $.post(get_groups_url, {
                group_owner: self.vue.current_user.email,
            }, function(data){
                self.vue.groups = data.groups;
                console.log("got group data", self.vue.groups);
            }
        );
    };

    self.get_group = function(group_idx){
        $.post(get_group_url, {
                group_id: self.vue.groups[group_idx].id
            }, function(data){
                self.vue.current_group = data.group;
                self.vue.group_name = self.vue.current_group.group_name;
                self.vue.group_idx = group_idx;
                console.log("current group: ", self.vue.current_group);
            }
        );
    };

    self.change_group_name = function(){
        $.post(change_group_name_url, {
                //group_owner: self.vue.current_user.email,
                group_id: self.vue.groups[self.vue.group_idx].id,
                group_name: self.vue.group_name,
            }, function(){
                //console.log("changed group name to: ", self.vue.group_name);
                self.get_groups();
                //self.vue.group_name = "your group name";
            }
        );
    };

    self.delete_group = function(){
        $.post(delete_group_url, {
                group_id: self.vue.groups[self.vue.group_idx].id
            }, function(){
                self.vue.groups.splice(self.vue.group_idx, 1);
                //console.log("deleted group: ", self.vue.group_idx);
            }
        );
    };

    self.invite_member = function(){
        $.post(invite_member_url, {
                invitee: self.vue.invitee,
                group_id: self.vue.groups[self.vue.group_idx].id
            }, function(){
                console.log("invited: ", self.vue.invitee);
            }
        );
    };

    self.add_to_group = function(group_id){
        $.post(add_to_group_url, {
                group_id: group_id,
                guest: self.vue.current_user.email
            }, function(data){
                console.log("Added to group: ", group_id);
            }
        );
    };

    self.remove_notification = function(nfc_idx){
        $.post(remove_notification_url, {
                user_id: self.vue.current_user.id,
                nfc_idx: nfc_idx,
            }, function(){
                self.vue.notifications.splice(self.vue.nfc_idx, 1);
                console.log("Removed nfc: ", nfc_idx);
                self.get_user_data(self.vue.current_user.id);
            }
        );
    }

    //members can be null
    //current_user.email == should make it return false
    //if members is null return false and don't for loop

    self.check_user = function(user_eml){
        if(self.vue.current_user.email == user_eml){
            return false;
        }
        if(self.vue.current_group.members != null){
            for(var i = 0; i < self.vue.current_group.members.length; i++){
                if(user_eml == self.vue.current_group.members[i]){
                    return false;
                }
            }
        }
        return true;
    }

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_making_group: false,
            group_name: 'your group name',
            logged_in: false,
            current_user: null,
            current_group: null,
            user_data: null,
            group_data: null,
            group_idx: 0,
            invitee: null,
            is_nfc: false,
            users: [],
            groups: [],
            notifications: []
        },
        methods: {
            toggle_making_group: function(){
                this.is_making_group = !this.is_making_group;
            },
            making_group: function(){
                this.is_making_group = true;
            },
            toggle_is_nfc: function(){
                this.is_nfc = !this.is_nfc;
            },
            add_group: function(){
                console.log(this.groups.length);
                $.post(add_group_url, {
                        group_owner: this.current_user.email,
                        group_name: this.group_name,
                    }, function(data){
                        this.group_data = data.group_data;
                        console.log("created new group", this.group_data);
                        self.get_groups();
                    }
                );
                this.group_idx = this.groups.length;
            },
            get_groups: self.get_groups,
            get_group: self.get_group,
            change_group_name: self.change_group_name,
            invite_member: self.invite_member,
            delete_group: self.delete_group,
            add_to_group: self.add_to_group,
            remove_notification: self.remove_notification,
            check_user: self.check_user,
        }

    });
    self.get_users();
    //self.get_groups();
    //setTimeout(self.get_groups(), 10000);

    $("#vue-div").show();
    return self;
};

var APP = null;

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
