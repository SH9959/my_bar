// static/script.js
let currentNote = null;

// 初始化加载保存的数据
window.onload = () => {
    initializeApp();
    
    // 添加键盘快捷键
    document.addEventListener('keydown', handleKeyboardShortcuts);
    
    // 添加窗口大小变化响应
    window.addEventListener('resize', debounce(updateTimeBarResponsiveness, 250));
};

// 初始化应用
function initializeApp() {
    createTimeTicks();
    
    // 首先尝试从本地存储加载
    const savedData = localStorage.getItem('timeBarData');
    if (savedData) {
        JSON.parse(savedData).forEach(item => {
            createDivider(item.position, item.content);
        });
    }
    
    updateTimeBlocks();
    setupEventListeners();
    createCurrentTimePointer();
    updateStats();
    
    // 直接调用createTimeDistributionChart确保饼图初始化
    createTimeDistributionChart();
}

// 处理时间轴点击
function handleTimeBarClick(e) {
    // 排除子元素和右键点击
    if (e.target !== e.currentTarget || e.button !== 0) return;
    
    // 计算点击位置百分比
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const position = (clickX / rect.width) * 100;
    
    // 创建新分隔线
    const newDivider = createDivider(position, '新事项');
    newDivider.style.setProperty('--divider-color', '#ff9999'); // 浅红色
    newDivider.dataset.type = 'temporary'; // 添加类型标识
    
    // 保存到本地存储
    saveToLocalStorage();
    updateTimeBlocks();
    updateStats();
}

function createDivider(position, content) {
    const divider = document.createElement('div');
    divider.className = 'divider';
    divider.style.left = `${position}%`;
    divider.dataset.content = content || '';
    
    // 添加时间显示
    const timeDisplay = document.createElement('div');
    timeDisplay.className = 'time-display';
    timeDisplay.textContent = getDateFromPosition(position);
    divider.appendChild(timeDisplay);
    
    // 添加摘要显示
    const summaryDisplay = document.createElement('div');
    summaryDisplay.className = 'summary-display';
    summaryDisplay.textContent = getSummary(content);
    divider.appendChild(summaryDisplay);
    
    // 根据内容设置颜色
    if (content && content.trim() !== '新事项' && content.trim() !== '') {
        divider.style.setProperty('--divider-color', '#2196F3'); // 蓝色
    } else {
        divider.style.setProperty('--divider-color', '#ff4444'); // 红色
    }
    
    // 添加拖动相关事件
    let isDragging = false;
    let startX;
    let startLeft;

    divider.addEventListener('mousedown', (e) => {
        if (e.button === 2) { // 右键点击
            e.preventDefault();
            e.stopPropagation();
            showDeleteConfirmation(divider);
            return;
        }
        if (e.button !== 0) return; // 只响应左键拖动
        isDragging = true;
        startX = e.clientX;
        startLeft = parseFloat(divider.style.left);
        e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        
        const timeBar = document.getElementById('timeBar');
        const rect = timeBar.getBoundingClientRect();
        const deltaX = e.clientX - startX;
        const newPosition = startLeft + (deltaX / rect.width) * 100;
        
        // 限制在时间条范围内
        if (newPosition >= 0 && newPosition <= 100) {
            divider.style.left = `${newPosition}%`;
            // 更新时间显示
            divider.querySelector('.time-display').textContent = getDateFromPosition(newPosition);
        }
    });

    document.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            saveToLocalStorage(); // 拖动结束后保存位置
        }
    });

    // 点击事件
    divider.addEventListener('click', (e) => {
        if (!isDragging) { // 只有在非拖动状态下才触发点击事件
            e.stopPropagation();
            currentNote = divider;
            showEditor(divider.dataset.content); // 直接使用保存的内容
        }
    });
    
    document.getElementById('timeBar').appendChild(divider);
    return divider;
}

function showEditor(content) {
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    const markdownInput = document.getElementById('markdownInput');
    const timeDisplay = document.getElementById('timeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');
    
    // 设置时间显示
    const position = parseFloat(currentNote.style.left);
    timeDisplay.textContent = getDateFromPosition(position);
    
    // 计算并显示时间段
    const dividers = [...document.querySelectorAll('.divider')].sort((a, b) => {
        return parseFloat(a.style.left) - parseFloat(b.style.left);
    });
    
    const index = dividers.indexOf(currentNote);
    let durationText = '';
    
    if (index >= 0 && index < dividers.length - 1) {
        const nextPosition = parseFloat(dividers[index + 1].style.left);
        durationText = calculateDuration(position, nextPosition);
    } else if (index > 0) {
        const prevPosition = parseFloat(dividers[index - 1].style.left);
        durationText = calculateDuration(prevPosition, position);
    }
    
    durationDisplay.textContent = durationText ? `(${durationText})` : '';
    
    // 设置内容
    if (content && content.trim() !== '新事项') {
        markdownInput.value = content;
    } else {
        markdownInput.value = '';
    }
    
    // 显示模态框并聚焦输入框
    modal.show();
    setTimeout(() => markdownInput.focus(), 500);
    
    // 更新预览
    updatePreview(markdownInput.value);
}

function updatePreview(text) {
    document.getElementById('preview').innerHTML = marked.parse(text);
}

function saveNote() {
    const content = document.getElementById('markdownInput').value;
    currentNote.dataset.content = content;
    
    // 更新线条颜色
    if (content && content.trim() !== '') {
        currentNote.style.setProperty('--divider-color', '#2196F3'); // 蓝色
    } else {
        currentNote.style.setProperty('--divider-color', '#ff4444'); // 红色
    }
    
    // 更新摘要显示
    const summaryDisplay = currentNote.querySelector('.summary-display');
    if (summaryDisplay) {
        summaryDisplay.textContent = getSummary(content);
    }
    
    // 使用Bootstrap API关闭模态框
    const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
    if (modal) modal.hide();
    
    saveToLocalStorage();
    updateTimeBlocks();
    updatePreview(content);
    
    // 更新饼图
    createTimeDistributionChart();
    
    showToast('记录已保存', 'success');
}

function saveToLocalStorage() {
    const items = [...document.querySelectorAll('.divider')].map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content
    }));
    localStorage.setItem('timeBarData', JSON.stringify(items));
    updateTimeBlocks();
    updateStats();
}

// 关闭弹窗
document.addEventListener('DOMContentLoaded', function() {
    const closeBtn = document.querySelector('.close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            if (modal) modal.hide();
        });
    }
});

// 实时预览
document.getElementById('markdownInput').addEventListener('input', (e) => {
    updatePreview(e.target.value);
});

// 添加删除确认弹窗
function showDeleteConfirmation(divider) {
    const modal = document.createElement('div');
    modal.className = 'delete-modal';
    modal.innerHTML = `
        <div class="delete-modal-content">
            <p>确定要删除这个分隔线吗？</p>
            <div class="delete-buttons">
                <button class="confirm-delete">确定</button>
                <button class="cancel-delete">取消</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // 确认删除
    modal.querySelector('.confirm-delete').addEventListener('click', () => {
        deleteMarker(divider);
        modal.remove();
    });
    
    // 取消删除
    modal.querySelector('.cancel-delete').addEventListener('click', () => {
        modal.remove();
    });
    
    // 点击模态框外部关闭
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 删除标记
function deleteMarker(divider) {
    divider.remove();
    saveToLocalStorage();
    updateTimeBlocks();
    
    // 更新饼图
    createTimeDistributionChart();
    
    showToast('记录已删除', 'success');
}

// 修改保存按钮的创建和事件处理
const saveButton = document.createElement('button');
saveButton.id = 'saveButton';
saveButton.textContent = '保存到本地';
document.body.appendChild(saveButton);

const saveToServerButton = document.createElement('button');
saveToServerButton.id = 'saveToServerButton';
saveToServerButton.textContent = '保存到服务器';
document.body.appendChild(saveToServerButton);

// 保存到本地
saveButton.addEventListener('click', () => {
    const dividers = [...document.querySelectorAll('.divider')];
    const data = dividers.map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content
    }));
    
    // 保存到本地存储
    localStorage.setItem('timeBarData', JSON.stringify(data));
    
    // 下载数据文件
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timebar_data_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    alert('数据已保存到本地');
});

// 保存到服务器
saveToServerButton.addEventListener('click', async () => {
    const password = prompt('请输入服务器密码：');
    if (!password) return;
    
    const dividers = [...document.querySelectorAll('.divider')];
    const data = dividers.map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content
    }));

    try {
        const response = await fetch('/save_data', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                data: data,
                password: password
            })
        });

        const result = await response.json();
        if (result.status === 'success') {
            alert(`数据已保存到服务器: ${result.filepath}`);
        } else {
            alert('保存失败: ' + result.error);
        }
    } catch (error) {
        alert('保存失败: ' + error.message);
    }
});

// 添加清空按钮到页面
const clearButton = document.createElement('button');
clearButton.id = 'clearButton';
clearButton.textContent = '清空所有';
document.body.appendChild(clearButton);

// 修改按钮样式
const style = document.createElement('style');
style.textContent = `
    #saveButton {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 10px 20px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    }
    #saveButton:hover {
        background-color: #45a049;
    }
    #saveToServerButton {
        position: fixed;
        bottom: 70px;  // 修改为在保存到本地按钮上方
        right: 20px;
        padding: 10px 20px;
        background-color: #2196F3;  // 使用蓝色区分
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    }
    #saveToServerButton:hover {
        background-color: #1976D2;
    }
    #clearButton {
        position: fixed;
        bottom: 20px;
        right: 120px;
        padding: 10px 20px;
        background-color: #f44336;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        z-index: 1000;
    }
    #clearButton:hover {
        background-color: #d32f2f;
    }
    
    .time-display {
        position: absolute;
        top: -20px;
        left: 50%;
        transform: translateX(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        white-space: nowrap;
    }
    
    .divider:hover .time-display {
        display: block;
    }
    
    .summary-display {
        position: absolute;
        top: 50%;
        right: 100%;  // 改为右侧，这样会显示在分隔线左侧
        transform: translateY(-50%);
        background-color: rgba(0, 0, 0, 0.7);
        color: white;
        padding: 2px 6px;
        border-radius: 3px;
        font-size: 12px;
        white-space: nowrap;
        max-width: 80px;  // 减小最大宽度
        overflow: hidden;
        text-overflow: ellipsis;
        margin-right: 5px;  // 添加一些间距
    }
    
    .divider:hover .summary-display {
        display: block;
    }

    #statsBox {
        position: fixed;
        bottom: 20px;
        left: 20px;
        background-color: rgba(255, 255, 255, 0.9);
        padding: 15px;
        border-radius: 5px;
        box-shadow: 0 2px 5px rgba(0,0,0,0.2);
        font-family: Arial, sans-serif;
        z-index: 1000;
    }
    
    #statsBox h3 {
        margin: 0 0 10px 0;
        color: #333;
    }
    
    #statsBox ul {
        margin: 0;
        padding: 0;
        list-style: none;
    }
    
    #statsBox li {
        margin: 5px 0;
        color: #666;
    }

    .time-pointer {
        position: absolute;
        top: 0;
        height: 100%;
        width: 2px;
        background-color: #ff0000;
        z-index: 10;
    }
    
    .time-pointer::after {
        content: '';
        position: absolute;
        top: 0;
        left: -4px;
        width: 10px;
        height: 10px;
        background-color: #ff0000;
        border-radius: 50%;
    }
`;
document.head.appendChild(style);

// 清空所有内容
clearButton.addEventListener('click', () => {
    const dividers = document.querySelectorAll('.divider');
    dividers.forEach(divider => divider.remove());
    saveToLocalStorage();
    alert('已清空所有内容');
});

// 创建时间刻度
function createTimeTicks() {
    const timeBar = document.getElementById('timeBar');
    const timeTicks = document.querySelector('.time-ticks');
    timeTicks.innerHTML = '';
    
    // 清除现有的刻度标签
    document.querySelector('.time-labels').innerHTML = '';
    
    // 创建24小时刻度（从2:00到第二天2:00）
    for (let hour = 0; hour <= 24; hour++) {
        // 计算实际小时（2:00开始）
        const actualHour = (hour + 2) % 24;
        const isNextDay = hour + 2 >= 24;
        
        // 创建主刻度
        const tick = document.createElement('div');
        tick.className = 'time-tick major';
        tick.style.left = `${(hour / 24) * 100}%`;
        tick.dataset.time = `${actualHour.toString().padStart(2, '0')}:00`;
        timeTicks.appendChild(tick);
        
        // 创建时间标签
        const label = document.createElement('span');
        label.textContent = `${actualHour.toString().padStart(2, '0')}:00`;
        if (isNextDay) {
            label.textContent = `${label.textContent}`;
        }
        label.style.position = 'absolute';
        label.style.left = `${(hour / 24) * 100}%`;
        label.style.transform = 'translateX(-50%)';
        document.querySelector('.time-labels').appendChild(label);
        
        // 每小时添加次刻度（每15分钟）
        if (hour < 24) {
            for (let j = 1; j <= 3; j++) {
                const minorTick = document.createElement('div');
                minorTick.className = 'time-tick minor';
                minorTick.style.left = `${((hour + j/4) / 24) * 100}%`;
                timeTicks.appendChild(minorTick);
            }
        }
    }
}

// 在页面加载时调用
document.addEventListener('DOMContentLoaded', createTimeTicks);

function updateTextareaPlaceholder() {
    const timeBar = document.getElementById('timeBar');
    const currentPosition = timeBar.style.width;
    const currentDate = getDateFromPosition(currentPosition); // 假设您有一个函数可以根据位置获取日期
    document.getElementById('markdownInput').placeholder = `输入Markdown笔记...\n当前刻度: ${currentDate}`;
}

// 在时间条更新时调用此函数
function updateTimeBar() {
    // ... 现有的时间条更新代码 ...
    updateTextareaPlaceholder();
}

function getDateFromPosition(position) {
    // 将百分比位置转换为24小时制的时间（从2:00开始）
    const totalHours = (position / 100) * 24;  // 24小时范围
    const adjustedHours = totalHours + 2;  // 从2:00开始
    const hours = Math.floor(adjustedHours);
    const minutes = Math.floor((adjustedHours - hours) * 60);
    
    // 处理跨天的情况
    const displayHours = hours % 24;
    const dayPrefix = hours >= 24 ? '次日' : '';
    
    // 格式化时间为 HH:MM 格式
    const formattedHours = displayHours.toString().padStart(2, '0');
    const formattedMinutes = minutes.toString().padStart(2, '0');
    
    return `${dayPrefix}${formattedHours}:${formattedMinutes}`;
}

// 添加获取摘要的函数
function getSummary(content) {
    if (!content) return '';
    
    // 移除 Markdown 标记
    const plainText = content.replace(/[#*`_~]/g, '');
    
    // 只获取前两个字
    return plainText.substring(0, 5);
}

// 修改getTimeDifference函数，使其更精确
function getTimeDifference(currentPosition) {
    const dividers = [...document.querySelectorAll('.divider')];
    
    // 按位置排序所有分隔线
    dividers.sort((a, b) => parseFloat(a.style.left) - parseFloat(b.style.left));
    
    // 找到当前分隔线的索引
    const currentIndex = dividers.findIndex(d => parseFloat(d.style.left) === currentPosition);
    
    if (currentIndex > 0) {
        // 获取左侧相邻分隔线的位置
        const prevPosition = parseFloat(dividers[currentIndex - 1].style.left);
        const diffHours = (currentPosition - prevPosition) / 100 * 24;
        const hours = Math.floor(diffHours);
        const minutes = Math.round((diffHours - hours) * 60);
        
        if (hours > 0) {
            return `${hours}小时${minutes}分钟`;
        } else {
            return `${minutes}分钟`;
        }
    }
    return '';
}

// 添加统计方框
const statsBox = document.createElement('div');
statsBox.id = 'statsBox';
document.body.appendChild(statsBox);

// 更新统计信息
function updateStats() {
    const statsContainer = document.getElementById('statsContainer');
    if (!statsContainer) return;
    
    statsContainer.innerHTML = '';
    
    const dividers = [...document.querySelectorAll('.divider')];
    if (dividers.length < 2) {
        // statsContainer.innerHTML = '<div class="col-12 text-center text-muted">添加更多时间点以查看统计信息</div>';
        return;
    }
    
    // 计算总时间和已记录时间
    let totalMinutes = 0;
    let recordedMinutes = 0;
    
    // 对分隔线进行排序
    const sortedDividers = dividers.sort((a, b) => {
        return parseFloat(a.style.left) - parseFloat(b.style.left);
    });
    
    // 计算每个时间段
    for (let i = 0; i < sortedDividers.length - 1; i++) {
        const startPos = parseFloat(sortedDividers[i].style.left);
        const endPos = parseFloat(sortedDividers[i + 1].style.left);
        
        // 计算这个时间段的分钟数
        const startMinutes = startPos * 1440 / 100;
        const endMinutes = endPos * 1440 / 100;
        const durationMinutes = endMinutes - startMinutes;
        
        totalMinutes += durationMinutes;
        
        // 检查是否有记录
        const content = sortedDividers[i].dataset.content || '';
        if (content.trim() !== '' && content.trim() !== '新事项') {
            recordedMinutes += durationMinutes;
        }
    }
    
    // 计算总时间段数和已记录段数
    const totalBlocks = sortedDividers.length - 1;
    let recordedBlocks = 0;
    
    for (let i = 0; i < sortedDividers.length - 1; i++) {
        const content = sortedDividers[i].dataset.content || '';
        if (content.trim() !== '' && content.trim() !== '新事项') {
            recordedBlocks++;
        }
    }
    
    // 格式化时间显示
    const formatTime = (minutes) => {
        const hours = Math.floor(minutes / 60);
        const mins = Math.round(minutes % 60);
        return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`;
    };
    
    // 创建统计卡片
    addStatCard('总时间段', totalBlocks, 'fas fa-chart-bar');
    addStatCard('已记录段数', recordedBlocks, 'fas fa-edit');
    addStatCard('完成率', `${Math.round((recordedBlocks / totalBlocks) * 100)}%`, 'fas fa-tasks');
    
    addStatCard('总时间', formatTime(totalMinutes), 'fas fa-clock');
    addStatCard('已记录时间', formatTime(recordedMinutes), 'fas fa-hourglass-half');
    addStatCard('时间利用率', `${Math.round((recordedMinutes / totalMinutes) * 100)}%`, 'fas fa-chart-pie');
    
    // 直接更新饼图，不再调用addTimeDistributionChart
    createTimeDistributionChart();
}

function addStatCard(title, value, icon) {
    const statsContainer = document.getElementById('statsContainer');
    const card = document.createElement('div');
    card.className = 'col-md-4 col-sm-6 mb-3';
    card.innerHTML = `
        <div class="card h-100 shadow-sm">
            <div class="card-body text-center">
                <i class="${icon} fa-2x mb-3 text-primary"></i>
                <h5 class="card-title">${title}</h5>
                <p class="card-text display-6">${value}</p>
            </div>
        </div>
    `;
    statsContainer.appendChild(card);
}

function createTimeDistributionChart() {
    // 直接使用已存在的canvas元素
    const ctx = document.getElementById('timeDistributionChart');
    if (!ctx) {
        console.error('找不到timeDistributionChart元素');
        return;
    }
    
    // 收集数据
    const dividers = [...document.querySelectorAll('.divider')].sort((a, b) => {
        return parseFloat(a.style.left) - parseFloat(b.style.left);
    });
    
    // 如果没有足够的分隔线，则不创建图表
    if (dividers.length < 2) {
        if (window.timeChart) {
            window.timeChart.destroy();
            window.timeChart = null;
        }
        
        // 显示提示信息
        const container = ctx.parentNode;
        if (container) {
            // container.innerHTML = '<div class="text-center py-5"><p class="text-muted">添加更多时间点以查看统计信息</p></div>';
            container.appendChild(ctx); // 重新添加canvas元素，以便后续使用
        }
        return;
    }
    
    // 提取所有标签
    const tagMap = {};
    let totalTime = 0;
    
    // 计算每个时间段的实际分钟数并按标签分配
    for (let i = 0; i < dividers.length - 1; i++) {
        const startPos = parseFloat(dividers[i].style.left);
        const endPos = parseFloat(dividers[i + 1].style.left);
        
        // 计算这个时间段的分钟数（百分比转换为分钟）
        const startMinutes = startPos * 1440 / 100; // 1440 = 24小时 * 60分钟
        const endMinutes = endPos * 1440 / 100;
        const durationMinutes = endMinutes - startMinutes;
        
        // 获取内容并提取标签
        const content = dividers[i].dataset.content || '';
        const tags = content.match(/#[\u4e00-\u9fa5a-zA-Z0-9]+/g);
        
        if (tags && tags.length > 0) {
            // 如果有多个标签，平均分配时间
            const timePerTag = durationMinutes / tags.length;
            tags.forEach(tag => {
                tagMap[tag] = (tagMap[tag] || 0) + timePerTag;
                totalTime += timePerTag;
            });
        } else if (content.trim() !== '' && content.trim() !== '新事项') {
            // 有内容但无标签，归为"未分类"
            tagMap['#未分类'] = (tagMap['#未分类'] || 0) + durationMinutes;
            totalTime += durationMinutes;
        }
    }
    
    // 如果没有任何有效的标签数据，添加一些默认数据
    if (Object.keys(tagMap).length === 0) {
        tagMap['#未分类'] = 1;
        totalTime = 1;
    }
    
    // 准备图表数据
    const labels = Object.keys(tagMap);
    const data = Object.values(tagMap);
    
    // 生成颜色
    const colors = labels.map((_, i) => {
        const predefinedColors = [
            '#4361ee', '#3a0ca3', '#4caf50', '#ff9800', '#e91e63',
            '#2196f3', '#673ab7', '#009688', '#ff5722', '#795548'
        ];
        return i < predefinedColors.length ? predefinedColors[i] : getRandomColor();
    });
    
    // 创建标签，包含时间和百分比
    const chartLabels = labels.map((label, i) => {
        const hours = Math.floor(data[i] / 60);
        const minutes = Math.round(data[i] % 60);
        const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
        const percentage = ((data[i] / totalTime) * 100).toFixed(1);
        return `${label.replace('#', '')} (${timeStr}, ${percentage}%)`;
    });
    
    // 创建或更新图表
    if (window.timeChart) {
        window.timeChart.destroy(); // 销毁旧图表
    }
    
    window.timeChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: chartLabels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: {
                        font: {
                            size: 12
                        },
                        padding: 10
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const hours = Math.floor(value / 60);
                            const minutes = Math.round(value % 60);
                            const timeStr = hours > 0 ? `${hours}小时${minutes}分钟` : `${minutes}分钟`;
                            const percentage = ((value / totalTime) * 100).toFixed(1);
                            return `${context.label}: ${timeStr} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

// 如果没有getRandomColor函数，添加一个
function getRandomColor() {
    const letters = '6789ABCDEF';
    let color = '#';
    for (let i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * letters.length)];
    }
    return color;
}

// 添加当前时间指针
function createCurrentTimePointer() {
    const pointer = document.createElement('div');
    pointer.id = 'currentTimePointer';
    pointer.className = 'time-pointer';
    document.getElementById('timeBar').appendChild(pointer);
    
    // 初始更新指针位置
    updateCurrentTimePointer();
    
    // 每分钟更新一次指针位置
    setInterval(updateCurrentTimePointer, 60000);
}

function updateCurrentTimePointer() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    // 计算当前时间在24小时范围内的位置（从2:00开始）
    let totalHours = hours + minutes / 60;
    if (totalHours < 2) {
        totalHours += 24; // 处理凌晨时间
    }
    totalHours -= 2; // 从2:00开始
    
    // 计算百分比位置
    const position = (totalHours / 24) * 100;
    
    const pointer = document.getElementById('currentTimePointer');
    if (pointer) {
        pointer.style.left = `${position}%`;
    }
}

// 添加缩放功能
function setupZoom() {
    const zoomSlider = document.getElementById('zoomSlider');
    
    zoomSlider.addEventListener('input', e => {
        const zoomLevel = e.target.value;
        const timeBar = document.getElementById('timeBar');
        timeBar.style.width = `${zoomLevel}%`;
        
        // 更新所有标记的位置
        updateMarkersPosition();
    });
}

function updateMarkersPosition() {
    // 根据新的宽度重新计算所有标记的位置
    const dividers = document.querySelectorAll('.divider');
    dividers.forEach(divider => {
        const percentage = parseFloat(divider.dataset.percentage || divider.style.left);
        divider.style.left = `${percentage}%`;
    });
}

// 添加导出为图片功能
function exportAsImage() {
    html2canvas(document.querySelector('.time-bar-container')).then(canvas => {
        const link = document.createElement('a');
        link.download = `精力管理_${new Date().toISOString().split('T')[0]}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
}

// 设置事件监听器
function setupEventListeners() {
    // 时间轴点击事件
    document.getElementById('timeBar').addEventListener('click', handleTimeBarClick);
    
    // 标签页切换时自动更新预览
    document.getElementById('preview-tab').addEventListener('click', () => {
        updatePreview(document.getElementById('markdownInput').value);
    });
    
    // 实时预览（使用防抖优化性能）
    document.getElementById('markdownInput').addEventListener('input', 
        debounce(e => updatePreview(e.target.value), 300)
    );
    
    // 保存按钮事件
    document.getElementById('saveButton').addEventListener('click', saveToLocalStorage);
    document.getElementById('saveToServerButton').addEventListener('click', saveToServer);
    
    // 删除按钮事件
    document.getElementById('deleteMarkerBtn').addEventListener('click', () => {
        if (currentNote) {
            // 隐藏模态框
            const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
            if (modal) modal.hide();
            
            // 删除标记
            deleteMarker(currentNote);
            currentNote = null;
        }
    });
    
    // 模态框关闭时清理
    const editModal = document.getElementById('editModal');
    editModal.addEventListener('hidden.bs.modal', clearCurrentNote);
}

// 处理键盘快捷键
function handleKeyboardShortcuts(e) {
    // Ctrl+S 保存到本地
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveToLocalStorage();
    }
    
    // Esc 关闭模态框
    if (e.key === 'Escape') {
        const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
        if (modal) modal.hide();
    }
    
    // 编辑器内的Tab键处理
    if (e.target.id === 'markdownInput' && e.key === 'Tab') {
        e.preventDefault();
        const start = e.target.selectionStart;
        const end = e.target.selectionEnd;
        e.target.value = e.target.value.substring(0, start) + '    ' + e.target.value.substring(end);
        e.target.selectionStart = e.target.selectionEnd = start + 4;
    }
}

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// 保存到服务器
function saveToServer() {
    const dividers = [...document.querySelectorAll('.divider')];
    const data = dividers.map(divider => ({
        position: parseFloat(divider.style.left),
        content: divider.dataset.content,
        timestamp: new Date().toISOString()
    }));
    
    // 显示加载指示器
    const button = document.getElementById('saveToServerButton');
    const originalText = button.innerHTML;
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 保存中...';
    button.disabled = true;
    
    fetch('/save_data', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            password: '123456',
            data: data
        })
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === 'success') {
            showToast('保存成功', 'success');
        } else {
            showToast('保存失败: ' + result.error, 'danger');
        }
    })
    .catch(error => {
        showToast('保存失败: ' + error.message, 'danger');
    })
    .finally(() => {
        // 恢复按钮状态
        button.innerHTML = originalText;
        button.disabled = false;
    });
}

// 显示通知
function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toastContainer') || createToastContainer();
    
    const toast = document.createElement('div');
    toast.className = `toast align-items-center text-white bg-${type} border-0`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-live', 'assertive');
    toast.setAttribute('aria-atomic', 'true');
    
    toast.innerHTML = `
        <div class="d-flex">
            <div class="toast-body">
                ${message}
            </div>
            <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
    `;
    
    toastContainer.appendChild(toast);
    const bsToast = new bootstrap.Toast(toast);
    bsToast.show();
    
    // 自动移除
    toast.addEventListener('hidden.bs.toast', () => {
        toast.remove();
    });
}

// 创建通知容器
function createToastContainer() {
    const container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container position-fixed bottom-0 end-0 p-3';
    container.style.zIndex = '1050';
    document.body.appendChild(container);
    return container;
}

// 清理当前笔记
function clearCurrentNote() {
    currentNote = null;
    document.getElementById('markdownInput').value = '';
}

// 更新时间轴响应式
function updateTimeBarResponsiveness() {
    // 根据窗口大小调整时间轴
    const timeBar = document.getElementById('timeBar');
    if (timeBar) {
        // 重新渲染刻度
        createTimeTicks();
        // 更新标记位置
        updateMarkersPosition();
    }
}

// 更新时间块
function updateTimeBlocks() {
    const container = document.querySelector('.blocks-container');
    if (!container) return;
    
    container.innerHTML = '';
    const dividers = [...document.querySelectorAll('.divider')].sort((a, b) => {
        return parseFloat(a.style.left) - parseFloat(b.style.left);
    });
    
    // 如果没有足够的分隔线，则不创建时间块
    if (dividers.length < 2) return;
    
    // 创建时间块
    for (let i = 0; i < dividers.length - 1; i++) {
        const start = parseFloat(dividers[i].style.left);
        const end = parseFloat(dividers[i + 1].style.left);
        
        const block = document.createElement('div');
        block.className = 'time-block';
        block.style.left = `${start}%`;
        block.style.width = `${end - start}%`;
        block.dataset.start = start;
        block.dataset.end = end;
        
        // 计算时间范围
        const startTime = getDateFromPosition(start);
        const endTime = getDateFromPosition(end);
        block.dataset.timeRange = `${startTime}-${endTime}`;
        
        // 如果相邻的分隔线有内容，则添加内容标记
        if (dividers[i].dataset.content && dividers[i].dataset.content.trim() !== '' && 
            dividers[i].dataset.content.trim() !== '新事项') {
            block.classList.add('has-content');
            block.dataset.content = dividers[i].dataset.content;
        }
        
        // 添加点击事件，显示编辑器
        block.addEventListener('click', () => {
            showBlockEditor(block, dividers[i], dividers[i + 1]);
        });
        
        container.appendChild(block);
    }
}

// 显示时间块编辑器
function showBlockEditor(block, startDivider, endDivider) {
    currentNote = startDivider;
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    const markdownInput = document.getElementById('markdownInput');
    const timeDisplay = document.getElementById('timeDisplay');
    const durationDisplay = document.getElementById('durationDisplay');
    
    // 设置时间显示
    const startTime = getDateFromPosition(parseFloat(startDivider.style.left));
    const endTime = getDateFromPosition(parseFloat(endDivider.style.left));
    timeDisplay.textContent = `${startTime} - ${endTime}`;
    
    // 计算并显示时间段
    const duration = calculateDuration(parseFloat(startDivider.style.left), parseFloat(endDivider.style.left));
    durationDisplay.textContent = duration ? `(${duration})` : '';
    
    // 设置内容
    const content = startDivider.dataset.content;
    if (content && content.trim() !== '新事项') {
        markdownInput.value = content;
    } else {
        markdownInput.value = '';
    }
    
    // 显示模态框并聚焦输入框
    modal.show();
    setTimeout(() => markdownInput.focus(), 500);
    
    // 更新预览
    updatePreview(markdownInput.value);
}

// 计算两个时间点之间的持续时间
function calculateDuration(startPos, endPos) {
    const startMinutes = startPos * 1440 / 100; // 转换为分钟
    const endMinutes = endPos * 1440 / 100;
    const durationMinutes = endMinutes - startMinutes;
    
    const hours = Math.floor(durationMinutes / 60);
    const minutes = Math.floor(durationMinutes % 60);
    
    if (hours > 0 && minutes > 0) {
        return `${hours}小时${minutes}分钟`;
    } else if (hours > 0) {
        return `${hours}小时`;
    } else {
        return `${minutes}分钟`;
    }
}

// 在文档加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
    // 初始化变量
    let timebarData = [];
    let markers = [];
    let isDragging = false;
    let draggedMarker = null;
    let dragStartX = 0;
    let dragStartTime = 0;
    let editingBlockId = null;
    
    // 获取DOM元素
    const timeline = document.getElementById('timeline');
    const timebarContainer = document.getElementById('timebar-container');
    const timebar = document.getElementById('timebar');
    const timelineContainer = document.getElementById('timeline-container');
    const editModal = new bootstrap.Modal(document.getElementById('editModal'));
    const editModalTitle = document.getElementById('editModalTitle');
    const editContent = document.getElementById('editContent');
    const saveButton = document.getElementById('saveButton');
    const deleteButton = document.getElementById('deleteButton');
    const saveDataButton = document.getElementById('saveDataButton');
    const passwordInput = document.getElementById('passwordInput');
    const statusMessage = document.getElementById('statusMessage');
    
    // 初始化TODO列表功能
    initTodoList();
    
    // 初始化总结和报告功能
    initSummaryAndReport();
    
    // 创建时间轴刻度
    createTimeScale();
    
    // 设置时间轴点击事件
    setupTimelineEvents();
    
    // 设置编辑模态框事件
    setupEditModalEvents();
    
    // 设置保存数据按钮事件
    setupSaveDataEvent();
    
    // 创建时间轴刻度
    function createTimeScale() {
        const scaleContainer = document.getElementById('scale-container');
        scaleContainer.innerHTML = '';
        
        // 创建24小时刻度
        for (let i = 0; i <= 24; i++) {
            const hour = document.createElement('div');
            hour.className = 'hour';
            hour.style.left = `${(i / 24) * 100}%`;
            
            const hourLabel = document.createElement('span');
            hourLabel.className = 'hour-label';
            hourLabel.textContent = `${i}:00`;
            
            hour.appendChild(hourLabel);
            scaleContainer.appendChild(hour);
        }
    }
    
    // 设置时间轴事件
    function setupTimelineEvents() {
        // 时间轴点击事件 - 创建新标记
        timeline.addEventListener('click', function(e) {
            if (e.target === timeline || e.target === timebarContainer || e.target === timebar) {
                const rect = timeline.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const percent = x / rect.width;
                
                // 创建新标记
                createMarker(percent);
                
                // 更新时间块
                updateTimeBlocks();
            }
        });
        
        // 监听鼠标移动事件
        document.addEventListener('mousemove', function(e) {
            if (isDragging && draggedMarker) {
                const rect = timeline.getBoundingClientRect();
                const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
                const percent = x / rect.width;
                
                // 更新标记位置
                draggedMarker.style.left = `${percent * 100}%`;
                
                // 更新时间显示
                const markerTime = percentToTime(percent);
                draggedMarker.setAttribute('data-time', markerTime);
                draggedMarker.querySelector('.marker-time').textContent = markerTime;
                
                // 更新时间块
                updateTimeBlocks();
            }
        });
        
        // 监听鼠标释放事件
        document.addEventListener('mouseup', function() {
            isDragging = false;
            draggedMarker = null;
        });
    }
    
    // 创建新标记
    function createMarker(percent) {
        // 创建标记元素
        const marker = document.createElement('div');
        marker.className = 'marker';
        marker.style.left = `${percent * 100}%`;
        
        // 生成唯一ID
        const markerId = `marker-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        marker.id = markerId;
        
        // 计算时间
        const time = percentToTime(percent);
        marker.setAttribute('data-time', time);
        
        // 创建时间显示
        const markerTime = document.createElement('div');
        markerTime.className = 'marker-time';
        markerTime.textContent = time;
        marker.appendChild(markerTime);
        
        // 添加拖动事件
        marker.addEventListener('mousedown', function(e) {
            if (e.button === 0) { // 左键点击
                isDragging = true;
                draggedMarker = marker;
                dragStartX = e.clientX;
                dragStartTime = percent;
                e.stopPropagation();
            }
        });
        
        // 将标记添加到时间轴
        timeline.appendChild(marker);
        
        // 将标记数据添加到数组
        markers.push({
            id: markerId,
            element: marker,
            percent: percent,
            time: time
        });
        
        // 按位置排序标记
        markers.sort((a, b) => a.percent - b.percent);
        
        return marker;
    }
    
    // 更新时间块
    function updateTimeBlocks() {
        // 清除现有的时间块
        const existingBlocks = document.querySelectorAll('.time-block');
        existingBlocks.forEach(block => block.remove());
        
        // 重置时间块数据
        timebarData = [];
        
        // 如果标记少于2个，不创建时间块
        if (markers.length < 2) {
            return;
        }
        
        // 按位置排序标记
        markers.sort((a, b) => a.percent - b.percent);
        
        // 创建时间块
        for (let i = 0; i < markers.length - 1; i++) {
            const startMarker = markers[i];
            const endMarker = markers[i + 1];
            
            // 创建时间块元素
            const block = document.createElement('div');
            block.className = 'time-block';
            block.style.left = `${startMarker.percent * 100}%`;
            block.style.width = `${(endMarker.percent - startMarker.percent) * 100}%`;
            
            // 生成唯一ID
            const blockId = `block-${Date.now()}-${i}`;
            block.id = blockId;
            
            // 设置默认内容
            const content = "新事项";
            block.setAttribute('data-content', content);
            
            // 添加点击事件
            block.addEventListener('click', function() {
                editBlock(blockId);
            });
            
            // 将时间块添加到时间轴
            timebar.appendChild(block);
            
            // 将时间块数据添加到数组
            timebarData.push({
                id: blockId,
                startMarkerId: startMarker.id,
                endMarkerId: endMarker.id,
                startTime: startMarker.time,
                endTime: endMarker.time,
                startPercent: startMarker.percent,
                endPercent: endMarker.percent,
                content: content,
                color: getRandomColor()
            });
        }
        
        // 应用颜色
        applyBlockColors();
    }
    
    // 编辑时间块
    function editBlock(blockId) {
        // 查找时间块数据
        const blockData = timebarData.find(block => block.id === blockId);
        if (!blockData) return;
        
        // 设置编辑模态框
        editModalTitle.textContent = `编辑 ${blockData.startTime} - ${blockData.endTime}`;
        editContent.value = blockData.content;
        editingBlockId = blockId;
        
        // 显示模态框
        editModal.show();
    }
    
    // 设置编辑模态框事件
    function setupEditModalEvents() {
        // 保存按钮点击事件
        saveButton.addEventListener('click', function() {
            if (!editingBlockId) return;
            
            // 查找时间块数据
            const blockIndex = timebarData.findIndex(block => block.id === editingBlockId);
            if (blockIndex === -1) return;
            
            // 更新内容
            const content = editContent.value.trim() || "新事项";
            timebarData[blockIndex].content = content;
            
            // 更新DOM
            const block = document.getElementById(editingBlockId);
            if (block) {
                block.setAttribute('data-content', content);
            }
            
            // 关闭模态框
            editModal.hide();
            editingBlockId = null;
        });
        
        // 删除按钮点击事件
        deleteButton.addEventListener('click', function() {
            if (!editingBlockId) return;
            
            // 查找时间块数据
            const blockIndex = timebarData.findIndex(block => block.id === editingBlockId);
            if (blockIndex === -1) return;
            
            // 获取标记ID
            const startMarkerId = timebarData[blockIndex].startMarkerId;
            
            // 删除时间块
            timebarData.splice(blockIndex, 1);
            
            // 删除DOM元素
            const block = document.getElementById(editingBlockId);
            if (block) {
                block.remove();
            }
            
            // 删除标记
            const markerIndex = markers.findIndex(marker => marker.id === startMarkerId);
            if (markerIndex !== -1) {
                const markerElement = document.getElementById(startMarkerId);
                if (markerElement) {
                    markerElement.remove();
                }
                markers.splice(markerIndex, 1);
            }
            
            // 更新时间块
            updateTimeBlocks();
            
            // 关闭模态框
            editModal.hide();
            editingBlockId = null;
        });
    }
    
    // 设置保存数据按钮事件
    function setupSaveDataEvent() {
        saveDataButton.addEventListener('click', function() {
            const password = passwordInput.value;
            if (!password) {
                statusMessage.textContent = '请输入密码';
                statusMessage.className = 'text-danger';
                return;
            }
            
            // 发送数据到服务器
            fetch('/save_data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    password: password,
                    data: timebarData
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    statusMessage.textContent = '数据保存成功';
                    statusMessage.className = 'text-success';
                } else {
                    statusMessage.textContent = `错误: ${data.error}`;
                    statusMessage.className = 'text-danger';
                }
            })
            .catch(error => {
                statusMessage.textContent = `错误: ${error.message}`;
                statusMessage.className = 'text-danger';
            });
        });
    }
    
    // 辅助函数：百分比转时间
    function percentToTime(percent) {
        const totalMinutes = percent * 24 * 60;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = Math.floor(totalMinutes % 60);
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    
    // 辅助函数：生成随机颜色
    function getRandomColor() {
        const colors = [
            '#4285F4', '#EA4335', '#FBBC05', '#34A853', // Google colors
            '#3498db', '#2ecc71', '#e74c3c', '#f39c12', // Flat UI colors
            '#9b59b6', '#1abc9c', '#e67e22', '#95a5a6'  // More Flat UI colors
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    // 应用块颜色
    function applyBlockColors() {
        timebarData.forEach(blockData => {
            const block = document.getElementById(blockData.id);
            if (block) {
                block.style.backgroundColor = blockData.color;
            }
        });
    }
    
    // 初始化TODO列表功能
    function initTodoList() {
        const todoList = document.getElementById('todoList');
        const addTodoBtn = document.getElementById('addTodoBtn');
        const addTodoModal = new bootstrap.Modal(document.getElementById('addTodoModal'));
        const todoText = document.getElementById('todoText');
        const todoPriority = document.getElementById('todoPriority');
        const saveTodoBtn = document.getElementById('saveTodoBtn');
        const emptyTodoMessage = document.getElementById('emptyTodoMessage');
        
        let todos = [];
        
        // 加载保存的TODO列表
        loadTodos();
        
        // 添加TODO按钮点击事件
        addTodoBtn.addEventListener('click', function() {
            todoText.value = '';
            todoPriority.value = 'medium';
            addTodoModal.show();
        });
        
        // 保存TODO按钮点击事件
        saveTodoBtn.addEventListener('click', function() {
            const text = todoText.value.trim();
            if (!text) return;
            
            const newTodo = {
                id: Date.now(),
                text: text,
                priority: todoPriority.value,
                completed: false
            };
            
            todos.push(newTodo);
            renderTodos();
            saveTodos();
            addTodoModal.hide();
        });
        
        // 渲染TODO列表
        function renderTodos() {
            todoList.innerHTML = '';
            
            if (todos.length === 0) {
                emptyTodoMessage.style.display = 'block';
                return;
            }
            
            emptyTodoMessage.style.display = 'none';
            
            todos.forEach(todo => {
                const todoItem = document.createElement('li');
                todoItem.className = `list-group-item todo-item priority-${todo.priority}`;
                if (todo.completed) {
                    todoItem.classList.add('completed');
                }
                
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.className = 'todo-checkbox';
                checkbox.checked = todo.completed;
                checkbox.addEventListener('change', function() {
                    todo.completed = checkbox.checked;
                    renderTodos();
                    saveTodos();
                });
                
                const todoTextSpan = document.createElement('span');
                todoTextSpan.className = 'todo-text';
                todoTextSpan.textContent = todo.text;
                
                const deleteBtn = document.createElement('i');
                deleteBtn.className = 'fas fa-times todo-delete';
                deleteBtn.addEventListener('click', function() {
                    todos = todos.filter(t => t.id !== todo.id);
                    renderTodos();
                    saveTodos();
                });
                
                todoItem.appendChild(checkbox);
                todoItem.appendChild(todoTextSpan);
                todoItem.appendChild(deleteBtn);
                todoList.appendChild(todoItem);
            });
        }
        
        // 保存TODO列表
        function saveTodos() {
            fetch('/save_todo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(todos)
            })
            .then(response => response.json())
            .catch(error => console.error('保存TODO失败:', error));
            
            // 同时保存到本地存储作为备份
            localStorage.setItem('todos', JSON.stringify(todos));
        }
        
        // 加载TODO列表
        function loadTodos() {
            // 首先尝试从服务器加载
            fetch('/load_todo')
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success' && data.data && data.data.length > 0) {
                    todos = data.data;
                    renderTodos();
                } else {
                    // 如果服务器没有数据，尝试从本地存储加载
                    const localTodos = localStorage.getItem('todos');
                    if (localTodos) {
                        todos = JSON.parse(localTodos);
                        renderTodos();
                    }
                }
            })
            .catch(error => {
                console.error('加载TODO失败:', error);
                // 尝试从本地存储加载
                const localTodos = localStorage.getItem('todos');
                if (localTodos) {
                    todos = JSON.parse(localTodos);
                    renderTodos();
                }
            });
        }
    }
    
    // 初始化总结和报告功能
    function initSummaryAndReport() {
        const generateDailySummaryBtn = document.getElementById('generateDailySummaryBtn');
        const generateWeeklyReportBtn = document.getElementById('generateWeeklyReportBtn');
        const dailySummaryContent = document.getElementById('dailySummaryContent');
        const weeklyReportContent = document.getElementById('weeklyReportContent');
        const emptySummaryMessage = document.getElementById('emptySummaryMessage');
        const emptyWeeklyMessage = document.getElementById('emptyWeeklyMessage');
        
        // 生成今日总结按钮点击事件
        generateDailySummaryBtn.addEventListener('click', function() {
            // 显示加载状态
            emptySummaryMessage.style.display = 'none';
            dailySummaryContent.innerHTML = '<div class="loading-spinner"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></div>';
            
            // 请求生成总结
            fetch('/generate_daily_summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    renderDailySummary(data.summary);
                } else {
                    dailySummaryContent.innerHTML = `<div class="alert alert-warning">${data.error || '生成总结失败'}</div>`;
                }
            })
            .catch(error => {
                dailySummaryContent.innerHTML = `<div class="alert alert-danger">请求失败: ${error.message}</div>`;
            });
        });
        
        // 生成周报按钮点击事件
        generateWeeklyReportBtn.addEventListener('click', function() {
            // 显示加载状态
            emptyWeeklyMessage.style.display = 'none';
            weeklyReportContent.innerHTML = '<div class="loading-spinner"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">加载中...</span></div></div>';
            
            // 请求生成周报
            fetch('/generate_weekly_report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    renderWeeklyReport(data.report);
                } else {
                    weeklyReportContent.innerHTML = `<div class="alert alert-warning">${data.error || '生成周报失败'}</div>`;
                }
            })
            .catch(error => {
                weeklyReportContent.innerHTML = `<div class="alert alert-danger">请求失败: ${error.message}</div>`;
            });
        });
        
        // 渲染今日总结
        function renderDailySummary(summary) {
            let html = '';
            
            // 主要完成事项
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-check-circle me-2"></i>今日完成事项</h6>';
            html += '<ul>';
            summary['主要完成事项'].forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
            html += '</div>';
            
            // 时间利用分析
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-chart-line me-2"></i>时间利用分析</h6>';
            html += `<p>${summary['时间利用分析']}</p>`;
            html += '</div>';
            
            // 需要改进
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-exclamation-triangle me-2"></i>需要改进</h6>';
            html += `<p>${summary['需要改进']}</p>`;
            html += '</div>';
            
            // 明日建议
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-lightbulb me-2"></i>明日建议</h6>';
            html += `<p>${summary['明日建议']}</p>`;
            html += '</div>';
            
            dailySummaryContent.innerHTML = html;
        }
        
        // 渲染周报
        function renderWeeklyReport(report) {
            let html = '';
            
            // 本周主要工作
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-briefcase me-2"></i>本周主要工作</h6>';
            html += '<ul>';
            report['本周主要工作'].forEach(item => {
                html += `<li>${item}</li>`;
            });
            html += '</ul>';
            html += '</div>';
            
            // 各日工作概述
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-calendar-day me-2"></i>各日工作概述</h6>';
            html += '<ul>';
            for (const [day, desc] of Object.entries(report['各日工作概述'])) {
                html += `<li><strong>${day}</strong>: ${desc}</li>`;
            }
            html += '</ul>';
            html += '</div>';
            
            // 时间利用分析
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-chart-pie me-2"></i>时间利用分析</h6>';
            html += `<p>${report['时间利用分析']}</p>`;
            html += '</div>';
            
            // 下周计划建议
            html += '<div class="summary-section">';
            html += '<h6><i class="fas fa-tasks me-2"></i>下周计划建议</h6>';
            html += `<p>${report['下周计划建议']}</p>`;
            html += '</div>';
            
            weeklyReportContent.innerHTML = html;
        }
    }
});