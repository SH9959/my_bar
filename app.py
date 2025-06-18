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
from datetime import datetime, timedelta
import socket
import requests

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
        timestamp = datetime.now().strftime("%Y-%m-%d")
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

@app.route('/save_todo', methods=['POST'])
def save_todo():
    try:
        todo_data = request.json
        timestamp = datetime.now().strftime("%Y-%m-%d")
        client_ip = request.remote_addr
        filename = f"todo_data_{client_ip}_{timestamp}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(todo_data, f, ensure_ascii=False, indent=2)
        
        return jsonify({
            'status': 'success',
            'filepath': filepath
        })
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/load_todo', methods=['GET'])
def load_todo():
    try:
        timestamp = datetime.now().strftime("%Y-%m-%d")
        client_ip = request.remote_addr
        filename = f"todo_data_{client_ip}_{timestamp}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if os.path.exists(filepath):
            with open(filepath, 'r', encoding='utf-8') as f:
                return jsonify({
                    'status': 'success',
                    'data': json.load(f)
                })
        else:
            return jsonify({
                'status': 'success',
                'data': []
            })
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/generate_daily_summary', methods=['POST'])
def generate_daily_summary():
    try:
        # 获取今日数据
        timestamp = datetime.now().strftime("%Y-%m-%d")
        client_ip = request.remote_addr
        filename = f"timebar_data_{timestamp}.json"
        filepath = os.path.join(DATA_DIR, filename)
        
        if not os.path.exists(filepath):
            return jsonify({
                'status': 'error',
                'error': '没有找到今日数据'
            }), 404
        
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # 提取记录内容
        records = []
        for item in data:
            content = item.get('content', '')
            if content and content.strip() != '新事项':
                records.append(content)
        
        if not records:
            return jsonify({
                'status': 'error',
                'error': '今日没有有效记录'
            }), 404
        
        # 构建提示词
        prompt = f"""
        请根据以下今日记录内容，生成一个简洁的日报总结，包括：
        1. 今日完成的主要事项
        2. 时间利用情况分析
        3. 需要改进的地方
        4. 对明天的建议

        今日记录内容：
        {' '.join(records)}
        
        请用中文回答，保持简洁明了。
        """
        
        # 这里可以接入大模型API，例如OpenAI、百度文心、智谱等
        # 此处为示例，实际使用时请替换为真实API调用
        # 由于没有实际API调用，这里返回模拟数据
        summary = {
            "主要完成事项": [
                "完成了项目A的开发工作",
                "参加了团队会议",
                "处理了客户反馈"
            ],
            "时间利用分析": "今天大部分时间用于开发工作，会议占用了约2小时，效率较高。",
            "需要改进": "休息时间较少，可能导致疲劳，建议增加短暂休息。",
            "明日建议": "优先处理项目B的测试工作，安排15分钟小休。"
        }
        
        return jsonify({
            'status': 'success',
            'summary': summary
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

@app.route('/generate_weekly_report', methods=['POST'])
def generate_weekly_report():
    try:
        # 获取本周数据（从周一到今天）
        today = datetime.now()
        days_since_monday = today.weekday()
        monday = today - timedelta(days=days_since_monday)
        
        client_ip = request.remote_addr
        all_records = []
        
        # 收集本周所有数据
        for i in range(days_since_monday + 1):
            current_date = monday + timedelta(days=i)
            timestamp = current_date.strftime("%Y-%m-%d")
            filename = f"timebar_data_{timestamp}.json"
            filepath = os.path.join(DATA_DIR, filename)
            
            if os.path.exists(filepath):
                with open(filepath, 'r', encoding='utf-8') as f:
                    try:
                        data = json.load(f)
                        day_name = current_date.strftime("%A")
                        
                        for item in data:
                            content = item.get('content', '')
                            if content and content.strip() != '新事项':
                                all_records.append({
                                    'day': day_name,
                                    'date': current_date.strftime("%Y-%m-%d"),
                                    'content': content
                                })
                    except:
                        pass
        
        if not all_records:
            return jsonify({
                'status': 'error',
                'error': '本周没有有效记录'
            }), 404
        
        # 构建提示词
        prompt = f"""
        请根据以下本周记录内容，生成一个简洁的周报总结，包括：
        1. 本周完成的主要工作
        2. 各天工作内容概述
        3. 时间利用情况分析
        4. 下周工作计划建议

        本周记录内容：
        {json.dumps(all_records, ensure_ascii=False, indent=2)}
        
        请用中文回答，保持简洁明了。
        """
        
        # 这里可以接入大模型API，例如OpenAI、百度文心、智谱等
        # 此处为示例，实际使用时请替换为真实API调用
        # 由于没有实际API调用，这里返回模拟数据
        weekly_report = {
            "本周主要工作": [
                "完成了项目A的开发和测试",
                "参加了3次团队会议",
                "处理了5个客户反馈问题"
            ],
            "各日工作概述": {
                "周一": "需求分析和规划",
                "周二": "核心功能开发",
                "周三": "测试和修复问题",
                "周四": "客户演示和反馈",
                "周五": "文档完善和总结"
            },
            "时间利用分析": "开发工作占比65%，会议占比20%，其他任务占比15%。整体效率良好。",
            "下周计划建议": "开始项目B的开发，继续优化项目A的性能问题。"
        }
        
        return jsonify({
            'status': 'success',
            'report': weekly_report
        })
        
    except Exception as e:
        return jsonify({'status': 'error', 'error': str(e)}), 500

if __name__ == '__main__':
    # 获取本机IP地址
    hostname = socket.gethostname()
    local_ip = socket.gethostbyname(hostname)
    
    print(f"服务器运行在: http://{local_ip}:5000")
    app.run(host='0.0.0.0', port=5000, debug=True)