# The file containing all the group API methods

def change_group_name():
    row = db(db.group_data.id == request.vars.group_id).select().first()
    row.update_record(group_name = request.vars.group_name)
    return "ok"

def add_group():
    t_id = db.group_data.insert(
	    group_owner = request.vars.group_owner,
        group_name = request.vars.group_name,
	)
    r = db(db.group_data.id == t_id).select().first()
    return response.json(dict(group_data=dict(
		id = r.id,
        group_owner = r.group_owner,
		group_name = r.group_name,
        members = r.members,
        surf_session = r.surf_session
    )))

def delete_all_group_data():
	"Deletes all groups from the table"
	db(db.group_data.id > -1).delete()
	return "ok"

def delete_group():
    db(db.group_data.id == request.vars.group_id).delete()
    return "ok"

def get_groups():
    groups = []
    user = db(db.user_data.user_id == request.vars.user_id).select().first()
    if user.groups is not None:
        for r in user.groups:
            group = db(db.group_data.id == r).select().first()
            t = dict(
                id = group.id,
                group_owner = group.group_owner,
                group_name = group.group_name,
                members = group.members,
                surf_session = group.surf_session
            )
            groups.append(t)
    for r in db(db.group_data.group_owner == request.vars.group_owner).select():
        t = dict(
            id = r.id,
            group_owner = r.group_owner,
            group_name = r.group_name,
            members = r.members,
            surf_session = r.surf_session
        )
        groups.append(t)
    return response.json(dict(
        groups = groups
    ))

def get_group():
    r = db(db.group_data.id == request.vars.group_id).select().first()
    return response.json(dict(group=dict(
		id = r.id,
        group_owner = r.group_owner,
		group_name = r.group_name,
        members = r.members,
        surf_session = r.surf_session
    )))

def edit_group_session():
    r = db(db.group_data.id == request.vars.group_id).select().first()
    r.update_record(surf_session=request.vars.session)
    return "ok"

def invite_member():
    r = db(db.user_data.email == request.vars.invitee).select().first()
    group_id = int(request.vars.group_id) if request.vars.group_id is not None else -1
    if r.notifications is not None:
        if group_id not in r.notifications:
            r.notifications.append(request.vars.group_id)
            r.update_record()
    else:
        r.update_record(notifications=[request.vars.group_id])
    return "ok"

def add_to_group():
    r = db(db.group_data.id == request.vars.group_id).select().first()
    u = db(db.user_data.user_id == request.vars.user_id).select().first()
    if r.members is not None:
        r.members.append(request.vars.guest)
        r.update_record()
        if u.groups is not None:
            u.groups.append(request.vars.group_id)
            u.update_record()
        else:
            u.update_record(groups=[request.vars.group_id])
    else:
        r.update_record(members=[request.vars.guest])
        if u.groups is not None:
            u.groups.append(request.vars.group_id)
            u.update_record()
        else:
            u.update_record(groups=[request.vars.group_id])

def leave_group():
    r = db(db.group_data.id == request.vars.group_id).select().first()
    u = db(db.user_data.id == request.vars.user_id).select().first()
    for idx, mem in enumerate(r.members):
        if mem == request.vars.member:
            r.members.pop(idx)
            r.update_record()
    group_id = int(request.vars.group_id) if request.vars.group_id is not None else -1
    for index, group in enumerate(u.groups):
        # group = int(group) if group is not None else -1
        if group == group_id:
            u.groups.pop(index)
            u.update_record()
    return "ok"

def calculate_group_skill():
    group = db(db.group_data.group_name == request.vars.group).select().first()
    owner = db(db.user_data.email == group.group_owner).select().first()
    skill_level = 0
    counter = 0
    print("owner skill lvl: ", owner.skill_level)
    if owner.skill_level == 'Beginner':
        skill_level = 1
    elif owner.skill_level == 'Intermediate':
        skill_level = 2
    elif owner.skill_level == 'Advanced':
        skill_level = 3
    elif owner.skill_level == 'Expert':
        skill_level = 4
    counter = counter + 1
    for idx, mem in enumerate(group.members):
        user = db(db.user_data.email == mem).select().first()
        print("users skill lvl: ", user.skill_level)
        if user.skill_level == 'Beginner':
            skill_level += 1
        elif user.skill_level == 'Intermediate':
            skill_level += 2
        elif user.skill_level == 'Advanced':
            skill_level += 3
        elif user.skill_level == 'Expert':
            skill_level += 4
        counter = counter + 1
    print("unrounded skill:", skill_level)
    skill_level = round(skill_level/counter)
    print("rounded skill:", skill_level)
    return skill_level