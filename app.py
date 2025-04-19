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
import socket

app = Flask(__name__)

# 设置数据存储目录
DATA_DIR = "saved_data"
if not os.path.exists(DATA_DIR):
    os.makedirs(DATA_DIR)

# 设置服务器密码
SERVER_PASSWORD = '123456'  # 修改为你想要的密码

@app.route('/')
def index():
    current_date = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    return render_template('index.html', current_date=current_date)

@app.route('/save_data', methods=['POST'])
def save_data():
    try:
        request_data = request.json
        if request_data.get('password') != SERVER_PASSWORD:
            return jsonify({'status': 'error', 'error': '密码错误'}), 401
            
        data = request_data.get('data', [])
        timestamp = datetime.now().strftime("%Y%m%d")
        client_ip = request.remote_addr  # 获取客户端IP
        filename = f"timebar_data_remote_{client_ip}_{timestamp}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'status': 'success',
            'filepath': filepath
        })
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

if __name__ == '__main__':
    # 获取本机IP地址
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print(f"服务器运行在: http://{local_ip}:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)