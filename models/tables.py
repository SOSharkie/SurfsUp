# Define your tables below (or better in another model file) for example
#
# >>> db.define_table('mytable', Field('myfield', 'string'))
#
# Fields can be 'string','text','password','integer','double','boolean'
#       'date','time','datetime','blob','upload', 'reference TABLENAME'
# There is an implicit 'id integer autoincrement' field
# Consult manual for more options, validators, etc.

db.define_table('user_data',
                Field('user_id', 'integer'),
                Field('boards', 'list:string'),
                Field('skill_level', default='Beginner'),
                Field('username')
                )

#db.users.skill_level.requires=IS_IN_SET(('Beginner', 'Intermediate', 'Advanced', 'Expert'))


# after defining tables, uncomment below to enable auditing
# auth.enable_record_versioning(db)
