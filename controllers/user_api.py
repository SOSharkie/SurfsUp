# Gets all the created users from the auth user table
def get_users():
	current_user = None
	logged_in = auth.user is not None
	if logged_in:
		current_user = auth.user
	users = []
	for r in db(db.auth_user.id > 0).select():
		t = dict(
			id = r.id,
			first_name = r.first_name,
			last_name = r.last_name,
			email = r.email
		)
		users.append(t)
	return response.json(dict(
		users=users,
		logged_in=logged_in,
		current_user=current_user
	))

# Gets the profile data for the specified user
def get_user_data():
	user_id = int(request.vars.user_id) if request.vars.user_id is not None else 0
	if db(db.user_data.id > 0).isempty():
		return response.json(None)
	else:
		r = db(db.user_data.user_id == request.vars.user_id).select().first()
		if r is None:
			return response.json(None)
		else: 
			return response.json(dict(user_data=dict(
				user_id = r.user_id,
				boards = r.boards,
				skill_level = r.skill_level,
				username = r.username,
                email = r.email,
                notifications = r.notifications
			)))

def get_notifications():
    user_id = int(request.vars.user_id) if request.vars.user_id is not None else 0
    row = db(db.user_data.user_id == request.vars.user_id).select().first()
    nfc = []
    if row.notifications is not None:
        for n in row.notifications:
            group = db(db.group_data.id == n).select().first()
            t = dict(
                group_name = group.group_name,
                group_id = group.id,
				group_owner = group.group_owner
            )
            nfc.append(t)
    return response.json(dict(
        nfc_data = nfc
    ))

def remove_notification():
	user_id = user_id = int(request.vars.user_id) if request.vars.user_id is not None else 0
	nfc_idx = int(request.vars.nfc_idx) if request.vars.index is not None else -1
	row = db(db.user_data.user_id == user_id).select().first()
	row.notifications.pop(nfc_idx)
	row.update_record()
	return "ok"
        
# Adds a user with profile data into the user data table
def add_user_data():
	t_id = db.user_data.insert(
		user_id = request.vars.user_id
	)
	r = db(db.user_data.id == t_id).select().first()
	return response.json(dict(user_data=dict(
		id = r.id,
		user_id = r.user_id,
		boards = r.boards,
		skill_level = r.skill_level,
		username = r.username,
        email = r.email,
        notifications = r.notifications
    )))

# Edit user data
def edit_user_data():
	row = db(db.user_data.user_id == request.vars.user_id).select().first()
	print("new_board", request.vars.new_board)
	if request.vars.new_board == 'true':
		if row.boards is not None:
			row.boards.append(request.vars.board)
			row.update_record()
		else:
			row.update_record(boards=[request.vars.board])
	else:
		row.update_record(skill_level = request.vars.skill_level)
		row.update_record(username = request.vars.username)
	return "ok"   

def delete_board():
	print("delete board ", request.vars.index)
	user_id = int(request.vars.user_id) if request.vars.user_id is not None else -1
	index = int(request.vars.index) if request.vars.index is not None else -1
	row = db(db.user_data.user_id == user_id).select().first()
	row.boards.pop(index)
	row.update_record()
	return "ok"


def delete_all_user_data():
	"Deletes all users from the table"
	db(db.user_data.id > -1).delete()
	return "ok"