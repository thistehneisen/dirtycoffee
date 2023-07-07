import os
from bleach import clean
from flask import Flask, render_template, request, jsonify
from flask_assets import Environment, Bundle
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import subprocess

debug = True
host = '127.0.0.1' # host for the DirtyCoffee to be ran at
title = 'DirtyCoffee' # global site title

app = Flask(__name__, template_folder='tpl')
basedir = os.path.abspath(os.path.dirname(__file__)) # directory of current script
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{os.path.join(basedir, "coffee.db")}'
db = SQLAlchemy(app)

# assets
assets = Environment(app)
assets.load_path = ['node_modules']

bootstrap_css = Bundle('bootstrap/dist/css/bootstrap.min.css', output='gen/bootstrap.css')
bootstrap_js = Bundle('bootstrap/dist/js/bootstrap.min.js', filters='rjsmin', output='gen/bootstrap.js')
bootstrap_bundle = Bundle('bootstrap/dist/js/bootstrap.bundle.min.js', filters='rjsmin', output='gen/bootstrap.bundle.js')
jquery_js = Bundle('jquery/dist/jquery.slim.min.js', filters='rjsmin', output='gen/jquery.js')
moment_js = Bundle('moment/min/moment.min.js', filters='rjsmin', output='gen/moment.js')
chart_js = Bundle('chart.js/dist/chart.umd.js', filters='rjsmin', output='gen/chart.js')

assets.register('bootstrap_css', bootstrap_css)
assets.register('bootstrap_js', bootstrap_js)
assets.register('bootstrap_bundle', bootstrap_bundle)
assets.register('jquery_js', jquery_js)
assets.register('moment_js', moment_js)
assets.register('chart_js', chart_js)

with app.app_context():
    class Caffeinator(db.Model):
        name = db.Column(db.String(100), nullable=False, primary_key=True)
        drinks = db.relationship('Drink', backref='caffeinator', lazy=True, cascade="all,delete")
        cleans = db.relationship('Clean', backref='caffeinator', lazy=True, cascade="all,delete")
        created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        updated_at = db.Column(db.DateTime, onupdate=datetime.utcnow)

        def to_dict(self):
            return {
                'name': self.name,
                'drinks': [drink.to_dict() for drink in self.drinks],
                'cleans': [clean.to_dict() for clean in self.cleans],
                'created_at': self.created_at,
                'updated_at': self.updated_at,
            }


    class Clean(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        clean_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        caffeinator_name = db.Column(db.String(100), db.ForeignKey('caffeinator.name'), nullable=False)

        def to_dict(self):
            return {
            'id': self.id,
            'clean_time': self.clean_time,
            'caffeinator_name': self.caffeinator_name,
        }

    class Drink(db.Model):
        id = db.Column(db.Integer, primary_key=True)
        drink_time = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
        caffeinator_name = db.Column(db.String(100), db.ForeignKey('caffeinator.name'), nullable=False)

        def to_dict(self):
            return {
            'id': self.id,
            'drink_time': self.drink_time,
            'caffeinator_name': self.caffeinator_name,
        }

    db.create_all()

# routes
@app.route('/')
def home():
    try:
        return render_template("index.html", title = title)
    except Exception as e:
        return '500: ' + str(e)

@app.route('/employees', methods = ['GET'])
def get_employees():
    employees = Caffeinator.query.all()
    employees_list = [e.to_dict() for e in employees]
    return jsonify(employees_list)

@app.route('/employees', methods=['POST'])
def add_employee():
    name = request.form.get('name')
    if not name or name.strip() == '':
        return jsonify(message="Invalid entry. Name cannot be empty."), 400
    
    # Clean the name input to prevent XSS attacks
    name = clean(name, tags=[], attributes={}, strip=True)
    
    try:
        caffeinator = Caffeinator(name=name)
        db.session.add(caffeinator)
        db.session.commit()
        return jsonify(message="New caffeinator added to the database")
    except SQLAlchemyError:
        return jsonify(message="An error occurred while adding the employee"), 500


@app.route('/employees/<name>', methods = ['DELETE'])
def delete_employee(name):
    caffeinator = Caffeinator.query.get(name)
    if caffeinator is None:
        return jsonify(message="Employee not found"), 404
    db.session.delete(caffeinator)
    db.session.commit()
    return jsonify(message="Employee deleted successfully")

@app.route('/coffee/drink/<employee>', methods=['PUT'])
def drink_coffee(employee):
    caffeinator = Caffeinator.query.filter_by(name=employee).first()
    if caffeinator is None:
        return jsonify({"error": "Employee not found"}), 404

    last_drink = Drink.query.filter_by(caffeinator_name=caffeinator.name).order_by(Drink.drink_time.desc()).first()
    if last_drink and datetime.utcnow() - last_drink.drink_time < timedelta(minutes=5):
        return jsonify({"error": "Only one drink is allowed per 5 minutes"}), 400

    drink = Drink(caffeinator_name=caffeinator.name)
    db.session.add(drink)

    db.session.commit()

    return jsonify({"message": f"{employee} drank coffee"}), 200

@app.route('/coffee/clean/<employee>', methods=['PUT'])
def clean_coffee(employee):
    caffeinator = Caffeinator.query.filter_by(name=employee).first()
    if caffeinator is None:
        return jsonify({"error": "Employee not found"}), 404

    last_clean = Clean.query.filter_by(caffeinator_name=caffeinator.name).order_by(Clean.clean_time.desc()).first()
    if last_clean and datetime.utcnow() - last_clean.clean_time < timedelta(hours=1):
        return jsonify({"error": "Cleaning can only be done once per hour"}), 400

    clean = Clean(caffeinator_name=caffeinator.name)
    db.session.add(clean)

    db.session.commit()

    return jsonify({"message": f"{employee} cleaned coffee machine"}), 200

# init
if __name__ == '__main__':
    app.run(debug=debug, passthrough_errors=debug, host=host, port=8080)