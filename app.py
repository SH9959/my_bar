# 文件结构：
# app.py
# templates/
#   index.html
# static/
#   style.css
#   script.js
#   marked.min.js

# app.py
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(debug=True)