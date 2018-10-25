# The file containing all the API methods

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
				username = r.username
			)))

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
		username = r.username
    )))

# Edit user data
def edit_user_data():
	print("boards= ", request.vars.board)
	row = db(db.user_data.user_id == request.vars.user_id).select().first()
	if row.boards is not None:
		print("row.boards=", row.boards)
		row.boards.append(request.vars.board)
		print("row.boards updated=", row.boards)
		row.update_record()
	else:
		row.update_record(boards=[request.vars.board])
	row.update_record(skill_level = request.vars.skill_level)
	row.update_record(username = request.vars.username)
	return "ok"   

def delete_board():
	print("delete board ", index)


def delete_all_user_data():
	"Deletes all users from the table"
	db(db.user_data.id > -1).delete()
	return "ok"
