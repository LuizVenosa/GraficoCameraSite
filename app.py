# app.py - (No changes needed from original, just ensure it exists)
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    # Renders the updated templates/index.html
    # Flask automatically finds static files linked via url_for
    return render_template('index.html')

if __name__ == '__main__':
    # Set debug=True for development (auto-reloads)
    # Set debug=False for production
    app.run(debug=True)