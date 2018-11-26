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
            }
        });
    };

    self.get_user_data = function (user_id) {
        $.get(user_data_url, {user_id: user_id}, function (data) {
            if (data == null){
                self.add_user_data();
            } else {
                console.log("got user data", data.user_data);
                self.vue.user_data = data.user_data;
                self.get_notifications(user_id);
                self.get_groups();
            }
        });
    };

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
                user_id: self.vue.current_user.id
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
                self.set_group_spot(self.vue.current_group.surf_session);
                console.log("current group: ", self.vue.current_group);
                if(data.group.group_owner == self.vue.current_user.email){
                    self.vue.is_modifiable = true;
                } else {
                    self.vue.is_modifiable = false;
                }
            }
        );
    };

    self.set_group_spot = function(spot_string){
        if (spot_string){
            var spot_data = spot_string.split(",");
            self.vue.group_spot = {
                style: {
                    backgroundImage: getSpotPictureUrl(spot_data[0])
                },
                spot: spot_data[0],
                wave_height: spot_data[2],
                tide: spot_data[3],
                time: spot_data[1]
            };
        } else {
            self.vue.group_spot = {
                style: {
                    backgroundImage: 'url(../static/images/generic_spot.jpg)'
                },
                spot: "Choose a spot!",
                wave_height: "Wave Height",
                tide: "Tide",
                time: "Time"
            }
        }
    };

    self.change_group_name = function(){
        $.post(change_group_name_url, {
                group_id: self.vue.groups[self.vue.group_idx].id,
                group_name: self.vue.group_name,
            }, function(){
                self.get_groups();
                self.vue.editing_group_name = false;
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
                guest: self.vue.current_user.email,
                user_id: self.vue.current_user.id
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
    };

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
    };

    self.leave_group = function(){
        $.post(leave_group_url, {
                group_id: self.vue.groups[self.vue.group_idx].id,
                member: self.vue.current_user.email,
                user_id: self.vue.current_user.id
            }, function(){
                console.log("removed from group");
                console.log(self.vue.groups[self.vue.group_idx].id);
                console.log("removed from user groups")
                console.log(self.vue.current_user);
                self.get_groups();
            }
        );
    };

    // Complete as needed.
    self.vue = new Vue({
        el: "#vue-div",
        delimiters: ['${', '}'],
        unsafeDelimiters: ['!{', '}'],
        data: {
            is_making_group: false,
            group_name: 'new group',
            editing_group_name: false,
            logged_in: false,
            current_user: null,
            current_group: null,
            user_data: null,
            group_data: null,
            group_idx: 0,
            invitee: null,
            is_nfc: false,
            is_modifiable: false,
            display_alert: false,
            users: [],
            groups: [],
            notifications: [],
            group_spot: {
                style: {
                    backgroundImage: 'url(../static/images/generic_spot.jpg)'
                },
                spot: "Pleasure Point",
                wave_height: "4.6ft",
                tide: "1.2ft",
                time: "Today @ 1:30PM"
            }
        },
        methods: {
            toggle_making_group: function(){
                this.is_making_group = !this.is_making_group;
                this.current_group = null;
            },
            making_group: function(){
                this.is_making_group = true;
            },
            toggle_is_nfc: function(){
                this.is_nfc = !this.is_nfc;
            },
            toggle_alert: function(){
                this.display_alert = true;
                setTimeout(function(){self.vue.display_alert = false;}, 3000);
            },
            add_group: function(){
                this.is_modifiable = true;
                $.post(add_group_url, {
                        group_owner: this.current_user.email,
                        group_name: 'new group',
                    }, function(data){
                        this.current_group = data.group_data;
                        console.log("created new group", this.current_group);
                        self.get_groups();
                    }
                );
                this.group_idx = this.groups.length;
            },
            edit_group_name: function() {
                this.editing_group_name = true;
            },
            is_active_group: function(index) {
                if (this.current_group){
                    if (this.groups[index].id == this.current_group.id) {
                        return true;
                    }
                }
                return false;
            },
            get_groups: self.get_groups,
            get_group: self.get_group,
            set_group_spot: self.set_group_spot,
            change_group_name: self.change_group_name,
            invite_member: self.invite_member,
            delete_group: self.delete_group,
            add_to_group: self.add_to_group,
            remove_notification: self.remove_notification,
            check_user: self.check_user,
            leave_group: self.leave_group,
        }

    });
    self.get_users();
    //self.get_groups();
    //setTimeout(self.get_groups(), 10000);

    $("#vue-div").show();
    return self;
};

var APP = null;

function getSpotPictureUrl(spotName){
    spotPics = ['naturalbridges', 'waddellreefs', 'steamerlane', 'davenportlanding', 
    'pleasurepoint', 'cowells', '26thavenue', '38thavenue', 'getchell', 'blacks', 'threemile', 'fourmile'];
    var spot = spotName.replace(/\s+/g, '').toLowerCase();
    if (spotPics.includes(spot)){
        return 'url(../static/images/' + spot + '.jpg)';
    }
    return 'url(../static/images/generic_spot.jpg)';
}

// This will make everything accessible from the js console;
// for instance, self.x above would be accessible as APP.x
jQuery(function(){APP = app();});
