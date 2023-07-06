import os
from flask import Flask, render_template, request, jsonify
from flask_assets import Environment, Bundle
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import subprocess

debug = True
host = '127.0.0.1' # host for the DirtyCoffee to be ran at
title = 'DirtyCoffee' # global site title

app = Flask(__name__, template_folder='tpl')
basedir = os.path.abspath(os.path.dirname(__file__)) # directory of current script
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "coffee.db")}'
db = SQLAlchemy(app)
assets = Environment(app)

class Caffeinator(db.Model):
    name = db.Column(db.String(100), nullable=False, primary_key=True)
    last_clean = db.Column(db.DateTime)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

with app.app_context():
    db.create_all()

assets.load_path = [
    'node_modules'
]

bootstrap_js = Bundle('bootstrap/dist/js/bootstrap.min.js', output='gen/bootstrap.js')
bootstrap_css = Bundle('bootstrap/dist/css/bootstrap.min.css', output='gen/bootstrap.css')

assets.register('bootstrap_js', bootstrap_js)
assets.register('bootstrap_css', bootstrap_css)

@app.route('/')
def home():
    try:
        return render_template("index.html", title = title)
    except Exception as e:
        return '500: ' + str(e)

@app.route('/employees', methods = ['GET'])
def get_employees():
    employees = Caffeinator.query.all() 
    employees_list = [e.__dict__ for e in employees]
    for e in employees_list:
        e.pop('_sa_instance_state', None)
    return jsonify(employees_list)

@app.route('/employees', methods = ['POST'])
def add_employee():
    name = request.form.get('name')
    caffeinator = Caffeinator(name=name)
    db.session.add(caffeinator)
    db.session.commit() 
    return jsonify(message="New caffeinator added to the database")

@app.route('/employees/<name>', methods = ['DELETE'])
def delete_employee(name):
    caffeinator = Caffeinator.query.get(name)
    if caffeinator is None:
        return jsonify(message="Employee not found"), 404
    db.session.delete(caffeinator)
    db.session.commit()
    return jsonify(message="Employee deleted successfully")

if __name__ == '__main__':
    app.run(debug=debug, passthrough_errors=debug, host=host, port=8080)