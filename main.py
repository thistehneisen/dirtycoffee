import os
from flask import Flask, render_template
from flask_assets import Environment, Bundle
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime
import subprocess

debug = True
host = '127.0.0.1' # host for the DirtyCoffee to be ran at

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
    title = "Coffee wars"
    body = "<h1>&nbsp;</h1>"
    
    try:
        return render_template("index.html", title = title, body = body)
    except Exception:
        return '500'

@app.route('/<name>')
def dosage():
    result = subprocess.run(['whoami'], stdout=subprocess.PIPE)
    return result.stdout.decode().strip()

if __name__ == '__main__':
    app.run(debug=debug, passthrough_errors=debug, host=host, port=8080)