# 文件结构：
# app.py
# templates/
#   index.html
# static/
#   style.css
#   script.js
#   marked.min.js

# app.py
from flask import Flask, render_template, request, jsonify, send_file
import json
import os
from datetime import datetime

app = Flask(__name__)

@app.route('/')
def index():
    current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return render_template('index.html', current_date=current_date)

@app.route('/save_data', methods=['POST'])
def save_data():
    data = request.json
    timestamp = datetime.now().strftime("%Y%m%d")
    filename = f"timebar_data_{timestamp}.json"
    
    # 确保保存目录存在
    save_dir = "saved_data"
    if not os.path.exists(save_dir):
        os.makedirs(save_dir)
    
    # 保存数据
    filepath = os.path.join(save_dir, filename)
    absolute_path = os.path.abspath(filepath)  # 获取绝对路径
    
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    
    return jsonify({
        'status': 'success',
        'filepath': absolute_path  # 返回绝对路径
    })

if __name__ == '__main__':
    app.run(debug=True)