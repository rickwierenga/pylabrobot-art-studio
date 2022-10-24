# artstudio.pylabrobot.org

import json

from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy

app = Flask(__name__, template_folder=".", static_folder="static")
app.config["SQLALCHEMY_DATABASE_URI"] = "postgresql://@localhost:5432/mm"
db = SQLAlchemy(app)

@app.after_request
def after_request(response):
  header = response.headers
  header['Access-Control-Allow-Origin'] = 'http://localhost:5006'
  response.headers.add("Access-Control-Allow-Headers", "*")
  response.headers.add("Access-Control-Allow-Methods", "*")
  return response

class Piece(db.Model):
  id = db.Column(db.Integer, primary_key=True)
  content = db.Column(db.String, unique=False, nullable=False)
  author = db.Column(db.String, unique=False, nullable=False)
  status = db.Column(db.String, unique=False, nullable=False) # queued, processing, done

  def serialize(self):
    return {
      "id": self.id,
      "content": self.content,
      "author": self.author,
      "status": self.status
    }

with app.app_context():
  db.create_all()


@app.route("/")
def index():
  return render_template("studio.html")

@app.route("/pieces/submit", methods=["POST"])
def submit():
  data = request.get_json()
  p = Piece(content=json.dumps(data["content"]), author=data["author"], status="queued")
  try:
    db.session.add(p)
    db.session.commit()
    return jsonify({"success": True})
  except Exception as e:
    print(e)
    db.session.rollback()
    return jsonify({"success": False})


@app.route("/pieces", methods=["GET"])
def get_latest():
  n = request.args.get("n")
  if n is None:
    n = 1
  else:
    n = int(n)
  pieces = Piece.query.order_by(Piece.id.desc()).limit(n).all()
  return jsonify([p.serialize() for p in pieces])


@app.route("/my-pieces", methods=["GET"])
def get_my_pieces():
  me = request.args.get("me")
  if me is None:
    return jsonify([])
  pieces = Piece.query.order_by(Piece.id.desc()).filter(Piece.author == me).all()
  return jsonify([p.serialize() for p in pieces])


@app.route("/pieces/<int:id>", methods=["GET"])
def get_piece(id):
  p = Piece.query.get(id)
  if p is None:
    return jsonify({"success": False})
  return jsonify({"success": True, "content": p.content})


@app.route("/pieces/status", methods=["PUT"])
def update_status():
  data = request.get_json()
  p = Piece.query.get(data["id"])
  if p is None:
    return jsonify({"success": False})
  else:
    p.status = data["status"]
    db.session.commit()
    return jsonify({"success": True})


@app.route("/pieces/<int:id>", methods=["DELETE"])
def delete_piece(id):
  p = Piece.query.get(id)
  db.session.delete(p)
  try:
    db.session.commit()
    return jsonify({"success": True})
  except Exception as e:
    db.session.rollback()
    print(e)
    return jsonify({"success": False})


if __name__ == "__main__":
  app.run(debug=True, host="0.0.0.0", port=5003)
