from flask import Flask, request, send_file, send_from_directory
import os
import sqlite3
import atexit
import json
from random import randint
# set the project root directory as the static folder, you can set others.
app = Flask(__name__, static_folder='static')

K = 40

GUYS_DIR = "img/guys"
GALS_DIR = "img/gals"
DB_LOC = "db/data.db"

GUYS_TABLE = "GUYS_TABLE"
GALS_TABLE = "GALS_TABLE"
KEY_ID = "id"
KEY_ELO = "elo"

@app.before_first_request
def run_on_start():
	db_conn = sqlite3.connect(DB_LOC)
	db_cursor = db_conn.cursor()
	initDB(db_conn, db_cursor)

def initDB(db_conn, db_cursor):
	db_cursor.execute("CREATE TABLE IF NOT EXISTS " + GUYS_TABLE + " (" 
		+ KEY_ID + " INTEGER PRIMARY KEY,"
		+ KEY_ELO + " INTEGER DEFAULT 1200)" )
	db_cursor.execute("CREATE TABLE IF NOT EXISTS " + GALS_TABLE + " (" 
		+ KEY_ID + " INTEGER PRIMARY KEY,"
		+ KEY_ELO + " INTEGER DEFAULT 1200)" )
	db_conn.commit()

@app.route("/api/guys/<img>")
def send_guy_img(img):
    return send_from_directory(GUYS_DIR, img)

@app.route("/api/gals/<img>")
def send_gal_img(img):
    return send_from_directory(GALS_DIR, img)


@app.route('/')
@app.route('/index')
def root():
    return app.send_static_file('facemash_intro_page.html')

@app.route('/<file>')
def serveStaticFile(file):
	return app.send_static_file(file)

@app.route('/api/guys/getrandomimg')
def get_random_guy_img():
	return get_random_img(GUYS_DIR)

@app.route('/api/gals/getrandomimg')
def get_random_gal_img():
	return get_random_img(GALS_DIR)

prev_img = -1;
def get_random_img(dir):
	global prev_img
	imgList = os.listdir(dir)
	if len(imgList) < 3:
		print("WARNING: too few files. files may repeat..")
	index = randint(0,len(imgList)-1)
	while prev_img != -1 and len(imgList) >= 3 and index == prev_img:
		index = randint(0,len(imgList)-1)
	prev_img = index;
	return imgList[index]

@app.route('/api/gals/click')
def gal_click():
	leftid = request.args.get("leftid")
	rightid = request.args.get("rightid")
	side = request.args.get("side")
	if side == "left":
		return update_elo(GALS_TABLE, leftid, rightid)
	elif side == "right":
		return update_elo(GALS_TABLE, rightid, leftid)
	return "Could not update ELO"

@app.route('/api/guys/click')
def guy_click():
	leftid = request.args.get("leftid")
	rightid = request.args.get("rightid")
	side = request.args.get("side")
	if side == "left":
		return update_elo(GUYS_TABLE, leftid, rightid)
	elif side == "right":
		return update_elo(GUYS_TABLE, rightid, leftid)
	return "Could not update ELO"

def update_elo(table, winnerid, loserid):
	print("Updating ELO for " + str(winnerid) + "," + str(loserid));
	db_conn = sqlite3.connect(DB_LOC)
	db_cursor = db_conn.cursor()

	entry_exists_query = "SELECT EXISTS(SELECT 1 FROM " + table + " WHERE " + KEY_ID + "=?);"
	new_entry_query = "INSERT INTO "+table+"("+KEY_ID+") VALUES (?)"
	get_entry_query = "SELECT * FROM "+table+" WHERE "+KEY_ID+"=?"
	update_entry_query = "UPDATE "+table+" SET "+KEY_ELO+"=? WHERE "+KEY_ID+"=?"

	# insert entry if not exists
	winner_exists = db_cursor.execute(entry_exists_query, (winnerid,)).fetchone()[0]
	loser_exists = db_cursor.execute(entry_exists_query, (loserid,)).fetchone()[0]

	if winner_exists == 0:
		print("Winner not exists; making entry")
		db_cursor.execute(new_entry_query, (winnerid,))
	if loser_exists == 0:
		print("Loser not exists; making entry")
		db_cursor.execute(new_entry_query, (loserid,))

	db_conn.commit();

	print(db_cursor.execute(get_entry_query, (winnerid,)).fetchone());
	print(db_cursor.execute(get_entry_query, (loserid,)).fetchone());

	winner_initial_elo = db_cursor.execute(get_entry_query, (winnerid,)).fetchone()[1];
	loser_initial_elo = db_cursor.execute(get_entry_query, (loserid,)).fetchone()[1];

	winner_R = 10 ** (winner_initial_elo/400)
	loser_R = 10 ** (loser_initial_elo/400)

	winner_factor = 1 - winner_R/(winner_R+loser_R)
	loser_factor = 0 - loser_R/(loser_R+winner_R)

	winner_final_elo = winner_initial_elo + K*winner_factor;
	loser_final_elo = loser_initial_elo + K*loser_factor;

	db_cursor.execute(update_entry_query, (winner_final_elo,winnerid))
	db_cursor.execute(update_entry_query, (loser_final_elo,loserid))

	print("winner: " + str(winner_initial_elo) + " -> " + str(winner_final_elo));
	print("loser: " + str(loser_initial_elo) + " -> " + str(loser_final_elo));
	db_conn.commit();
	db_conn.close();
	return "good";

@app.route("/api/guys/leaderboard")
def get_guy_leaderboard():
	return get_leaderboard(GUYS_TABLE)

@app.route("/api/gals/leaderboard")
def get_gal_leaderboard():
	return get_leaderboard(GALS_TABLE)

def get_leaderboard(table):
	db_conn = sqlite3.connect(DB_LOC)
	db_cursor = db_conn.cursor()

	leaderboard = []

	leaderboard_query = "SELECT * FROM "+table+" ORDER BY "+KEY_ELO+" desc"
	for row in db_cursor.execute(leaderboard_query):
		print(json.dumps(row))
		leaderboard.append(row)

	return json.dumps(leaderboard)