document.addEventListener('DOMContentLoaded', () => {
    // 狀態
    let channels = JSON.parse(localStorage.getItem('yt-monitor-channels')) || [];
    let channelGroups = JSON.parse(localStorage.getItem('yt-monitor-groups')) || [];
    let activeChannels = [];
    const MAX_CHANNELS = 9;

    // DOM 元素
    const monitorGrid = document.getElementById('monitor-grid');
    const dashboardBtn = document.getElementById('dashboard-btn');
    const dashboardModal = document.getElementById('dashboard-modal');
    const closeModalBtn = document.getElementById('close-modal-btn');
    const addYtBtn = document.getElementById('add-yt-btn');
    const ytUrlInput = document.getElementById('yt-url-input');
    const channelList = document.getElementById('channel-list');
    const libraryCount = document.getElementById('library-count');
    const activeCount = document.getElementById('active-count');
    const groupList = document.getElementById('group-list');
    const saveGroupBtn = document.getElementById('save-group-btn');
    const shareUrlBtn = document.getElementById('share-url-btn');

    // 初始化
    renderChannelList();
    renderGroupList();
    checkSharedURL();

    // 事件監聽器
    shareUrlBtn.addEventListener('click', () => {
        if (activeChannels.length === 0) {
            alert('目前畫面上沒有頻道喔！請先加入想看的頻道。');
            return;
        }
        updateURL(); // 確保網址是最新的
        const shareUrl = window.location.href;
        // 建立一個暫時的 input 來複製
        const tempInput = document.createElement('input');
        tempInput.value = shareUrl;
        document.body.appendChild(tempInput);
        tempInput.select();
        try {
            document.execCommand('copy');
            alert('網址已經複製到剪貼簿了！\n現在你可以把這個網址貼給朋友，他們點開就會看到一模一樣的頻道組合！');
        } catch (err) {
            prompt('請手動複製以下網址：', shareUrl);
        }
        document.body.removeChild(tempInput);
    });

    dashboardBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    dashboardModal.addEventListener('click', (e) => {
        if (e.target === dashboardModal) closeModal();
    });

    // 滑鼠靠右邊緣自動開啟面板
    document.addEventListener('mousemove', (e) => {
        if (dashboardModal.classList.contains('hidden')) {
            // 當滑鼠移動到距離右側邊緣 15px 內時觸發
            if (e.clientX >= window.innerWidth - 15) {
                openModal();
            }
        }
    });

    addYtBtn.addEventListener('click', handleAddChannel);
    ytUrlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleAddChannel();
        }
    });

    // 快速排版選擇器事件
    document.querySelectorAll('.layout-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const count = parseInt(e.currentTarget.dataset.count, 10);
            if (channels.length === 0) {
                alert('頻道庫目前是空的！請先新增一些頻道。');
                return;
            }
            
            // 選擇最新的 N 個頻道 (依據 reverse 後的陣列)
            const sortedChannels = [...channels].reverse();
            const targetCount = Math.min(count, sortedChannels.length);
            
            activeChannels = sortedChannels.slice(0, targetCount).map(c => c.id);
            
            updateGrid();
            renderChannelList();
            
            if (sortedChannels.length < count) {
                // 可選：提示使用者頻道不夠
                console.log(`頻道數量不足 ${count} 個，已顯示 ${sortedChannels.length} 個`);
            }
        });
    });

    // 處理空狀態按鈕綁定 (使用事件委派，因按鈕會被重新渲染)
    document.addEventListener('click', (e) => {
        if (e.target && e.target.id === 'empty-add-btn') {
            openModal();
        }
    });

    // 處理 Esc 鍵退出放大模式
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const focusedCell = document.querySelector('.monitor-cell.focused');
            if (focusedCell) {
                focusedCell.classList.remove('focused');
                focusedCell.querySelector('.focus-btn i').className = 'fa-solid fa-expand';
            }
        }
    });

    // 群組功能
    saveGroupBtn.addEventListener('click', () => {
        if (activeChannels.length === 0) {
            alert('當前畫面沒有頻道！請先在主畫面加入頻道後再儲存群組。');
            return;
        }
        const groupName = prompt('請輸入群組名稱 (例如: 新聞台, 音樂, 遊戲等):');
        if (!groupName || groupName.trim() === '') return;

        const newGroup = {
            id: Date.now().toString(),
            name: groupName.trim(),
            channels: [...activeChannels]
        };

        channelGroups.push(newGroup);
        localStorage.setItem('yt-monitor-groups', JSON.stringify(channelGroups));
        renderGroupList();
    });

    function renderGroupList() {
        if (channelGroups.length === 0) {
            groupList.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; margin-top: 5px;">目前沒有儲存的群組</span>';
            return;
        }

        groupList.innerHTML = '';
        channelGroups.forEach(group => {
            const chip = document.createElement('div');
            chip.className = 'group-chip';
            chip.title = '點擊載入此群組';
            
            const nameSpan = document.createElement('span');
            nameSpan.className = 'group-name';
            nameSpan.textContent = `${group.name} (${group.channels.length})`;
            
            nameSpan.addEventListener('click', () => {
                activeChannels = [...group.channels];
                updateGrid();
                renderChannelList();
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'delete-group-btn';
            deleteBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            deleteBtn.title = '刪除群組';
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`確定要刪除「${group.name}」群組嗎？`)) {
                    channelGroups = channelGroups.filter(g => g.id !== group.id);
                    localStorage.setItem('yt-monitor-groups', JSON.stringify(channelGroups));
                    renderGroupList();
                }
            });

            chip.appendChild(nameSpan);
            chip.appendChild(deleteBtn);
            groupList.appendChild(chip);
        });
    }

    // 備份與同步功能 (匯出/匯入)
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const backupInput = document.getElementById('backup-data-input');

    exportBtn.addEventListener('click', () => {
        const backupData = {
            channels: channels,
            groups: channelGroups
        };
        // 使用 Base64 編碼避免 JSON 字串太雜亂
        const encodedData = btoa(encodeURIComponent(JSON.stringify(backupData)));
        backupInput.style.display = 'block';
        backupInput.value = encodedData;
        backupInput.select();
        try {
            document.execCommand('copy');
            alert('備份代碼已產生並自動複製到剪貼簿！\n請將這串代碼傳送給自己，並在另一台電腦貼上來匯入。');
        } catch (err) {
            alert('備份代碼已產生在下方框框中，請手動全選複製。');
        }
    });

    importBtn.addEventListener('click', () => {
        // 如果輸入框還沒顯示，先顯示它讓使用者貼上
        if (backupInput.style.display === 'none') {
            backupInput.style.display = 'block';
            backupInput.focus();
            return;
        }

        const inputData = backupInput.value.trim();
        if (!inputData) {
            alert('請先在輸入框中貼上您的備份代碼！');
            return;
        }

        try {
            const decodedData = JSON.parse(decodeURIComponent(atob(inputData)));
            if (decodedData.channels && Array.isArray(decodedData.channels)) {
                if (confirm('⚠️ 警告：匯入設定將會覆蓋這台電腦目前的頻道庫與群組！確定要繼續嗎？')) {
                    channels = decodedData.channels;
                    channelGroups = decodedData.groups || [];
                    saveChannels();
                    localStorage.setItem('yt-monitor-groups', JSON.stringify(channelGroups));
                    
                    // 清空當前畫面
                    activeChannels = [];
                    updateGrid();
                    renderChannelList();
                    renderGroupList();
                    
                    backupInput.value = '';
                    backupInput.style.display = 'none';
                    alert('匯入成功！您的頻道庫與群組已全數更新。');
                }
            } else {
                throw new Error('Invalid format');
            }
        } catch (e) {
            alert('匯入失敗：無效的備份代碼，請確認代碼是否完整複製沒有漏字。');
        }
    });

    function updateURL() {
        const url = new URL(window.location.href);
        if (activeChannels.length > 0) {
            url.searchParams.set('c', activeChannels.join(','));
        } else {
            url.searchParams.delete('c');
        }
        // 使用 replaceState 更新網址列但不產生歷史紀錄
        window.history.replaceState({}, '', url);
    }

    async function checkSharedURL() {
        const urlParams = new URLSearchParams(window.location.search);
        const sharedChannelsStr = urlParams.get('c');
        
        if (sharedChannelsStr) {
            const sharedIds = sharedChannelsStr.split(',').filter(id => id.trim() !== '');
            if (sharedIds.length === 0) return;

            let needSave = false;
            
            // 由於可能需要去抓取影片標題（若不在頻道庫中），這裡給予提示
            const originalTitle = document.title;
            document.title = "載入分享畫面中...";
            
            for (const id of sharedIds) {
                // 如果這台電腦沒有存過這個頻道，去抓資訊
                if (!channels.some(c => c.id === id)) {
                    try {
                        const videoDetails = await fetchVideoDetails(id);
                        channels.push(videoDetails);
                        needSave = true;
                    } catch (error) {
                        console.error("Failed to load shared channel:", id);
                    }
                }
                
                // 加入監控畫面
                if (!activeChannels.includes(id) && activeChannels.length < MAX_CHANNELS) {
                    activeChannels.push(id);
                }
            }
            
            if (needSave) saveChannels();
            
            document.title = originalTitle;
            updateGrid();
            renderChannelList();
        }
    }

    // 輔助函數
    function extractVideoId(url) {
        // 處理各種 YouTube URL 格式
        const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=|live\/)([^#\&\?]*).*/;
        const match = url.match(regExp);
        if (match && match[2].length === 11) {
            return match[2];
        }
        // 如果輸入剛好是 11 個字元，假設它就是 ID
        if (url.length === 11) {
            return url;
        }
        return null;
    }

    async function fetchVideoDetails(videoId) {
        // 使用 noembed 取得基本資訊，如失敗則給予預設值
        try {
            const response = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
            const data = await response.json();
            if (data.error) throw new Error('Video not found');
            return {
                id: videoId,
                title: data.title,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                addedAt: new Date().toISOString()
            };
        } catch (error) {
            return {
                id: videoId,
                title: `YouTube 影片 (${videoId})`,
                thumbnail: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
                addedAt: new Date().toISOString()
            };
        }
    }

    async function handleAddChannel() {
        const input = ytUrlInput.value.trim();
        if (!input) return;

        // 支援多網址，用空白或逗號或換行分割
        const urls = input.split(/[\s,]+/).filter(u => u.trim() !== '');
        if (urls.length === 0) return;

        // 顯示載入狀態
        const originalBtnText = addYtBtn.innerHTML;
        addYtBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 處理中';
        addYtBtn.disabled = true;

        let addedCount = 0;
        let dupCount = 0;
        let errCount = 0;

        for (const url of urls) {
            const videoId = extractVideoId(url);
            if (!videoId) {
                errCount++;
                continue;
            }

            // 檢查是否已存在
            if (channels.some(c => c.id === videoId)) {
                dupCount++;
                continue;
            }

            try {
                const videoDetails = await fetchVideoDetails(videoId);
                channels.push(videoDetails);
                addedCount++;
            } catch (error) {
                errCount++;
            }
        }

        saveChannels();
        renderChannelList();

        addYtBtn.innerHTML = originalBtnText;
        addYtBtn.disabled = false;

        // 給予結果回饋
        if (urls.length === 1) {
            if (addedCount > 0) {
                ytUrlInput.value = '';
            } else if (dupCount > 0) {
                alert('此頻道已在您的清單中');
                ytUrlInput.value = '';
            } else {
                alert('無法獲取影片資訊，請確認連結格式正確');
            }
        } else {
            // 批次匯入回饋
            alert(`批次處理完成！\n✅ 成功新增: ${addedCount} 個\n⚠️ 重複跳過: ${dupCount} 個\n❌ 格式錯誤: ${errCount} 個`);
            if (addedCount > 0 || dupCount > 0) {
                ytUrlInput.value = '';
            }
        }
    }

    function removeChannelFromLibrary(id) {
        if (confirm('確定要從頻道庫刪除此頻道嗎？')) {
            channels = channels.filter(c => c.id !== id);
            saveChannels();
            
            // 如果此頻道正在監看中，也將其從畫面移除
            if (activeChannels.includes(id)) {
                toggleMonitor(id);
            } else {
                renderChannelList();
            }
        }
    }

    function toggleMonitor(id) {
        const index = activeChannels.indexOf(id);
        if (index > -1) {
            // 從監看中移除
            activeChannels.splice(index, 1);
        } else {
            // 加入監看
            if (activeChannels.length >= MAX_CHANNELS) {
                alert(`最多只能同時監看 ${MAX_CHANNELS} 個頻道！`);
                return;
            }
            activeChannels.push(id);
        }
        
        updateGrid();
        renderChannelList();
    }

    function updateGrid() {
        monitorGrid.innerHTML = '';
        
        // 移除先前的網格類別
        monitorGrid.classList.remove('empty');
        for (let i = 1; i <= 9; i++) {
            monitorGrid.classList.remove(`grid-${i}`);
        }

        const count = activeChannels.length;
        activeCount.textContent = `${count} / ${MAX_CHANNELS} 頻道`;

        if (count === 0) {
            monitorGrid.classList.add('empty');
            monitorGrid.innerHTML = `
                <div class="empty-state">
                    <i class="fa-brands fa-youtube"></i>
                    <h2>系統待命中</h2>
                    <p>請開啟控制面板新增並選擇要監控的頻道</p>
                    <button id="empty-add-btn" class="glow-btn outline">開啟控制面板</button>
                </div>
            `;
            return;
        }

        monitorGrid.classList.add(`grid-${count}`);

        activeChannels.forEach(id => {
            const channel = channels.find(c => c.id === id);
            if (!channel) return;

            const cell = document.createElement('div');
            cell.className = 'monitor-cell';
            
            // 使用 autoplay=1 & mute=1 允許自動播放
            cell.innerHTML = `
                <iframe 
                    src="https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=1&origin=https://www.youtube.com" 
                    title="YouTube video player" 
                    frameborder="0" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowfullscreen>
                </iframe>
                <div class="cell-overlay">
                    <div class="cell-title" style="color: white; text-shadow: 1px 1px 3px black; font-size: 0.95rem; font-weight: 500; max-width: 60%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        ${channel.title}
                    </div>
                    <div class="cell-actions" style="display: flex; gap: 8px;">
                        <button class="focus-btn" data-id="${id}" title="放大/縮小 (Esc)">
                            <i class="fa-solid fa-expand"></i>
                        </button>
                        <button class="remove-monitor-btn" data-id="${id}" title="關閉視窗">
                            <i class="fa-solid fa-xmark"></i>
                        </button>
                    </div>
                </div>
            `;
            monitorGrid.appendChild(cell);

            // 放大按鈕邏輯
            const focusBtn = cell.querySelector('.focus-btn');
            focusBtn.addEventListener('click', (e) => {
                const isFocused = cell.classList.contains('focused');
                
                // 移除所有人的 focused
                document.querySelectorAll('.monitor-cell.focused').forEach(c => {
                    c.classList.remove('focused');
                    c.querySelector('.focus-btn i').className = 'fa-solid fa-expand';
                });

                if (!isFocused) {
                    cell.classList.add('focused');
                    focusBtn.querySelector('i').className = 'fa-solid fa-compress';
                }
            });
        });

        // 綁定關閉按鈕事件
        document.querySelectorAll('.remove-monitor-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                toggleMonitor(id);
            });
        });

        // 每次網格更新時，同步更新網址
        updateURL();
    }

    function renderChannelList() {
        channelList.innerHTML = '';
        libraryCount.textContent = channels.length;

        if (channels.length === 0) {
            channelList.innerHTML = '<li style="text-align: center; color: var(--text-muted); padding: 20px;">尚無儲存的頻道，請在上方新增</li>';
            return;
        }

        // 依照加入時間倒序排列
        const sortedChannels = [...channels].reverse();

        sortedChannels.forEach(channel => {
            const isActive = activeChannels.includes(channel.id);
            const li = document.createElement('li');
            li.className = 'channel-item';
            li.innerHTML = `
                <div class="channel-info">
                    <div class="channel-thumb" style="background-image: url('${channel.thumbnail}')"></div>
                    <div class="channel-details">
                        <span class="channel-title" title="${channel.title}">${channel.title}</span>
                        <span class="channel-id">${channel.id}</span>
                    </div>
                </div>
                <div class="channel-actions">
                    <button class="watch-btn ${isActive ? 'active' : ''}" data-id="${channel.id}">
                        <i class="fa-solid ${isActive ? 'fa-stop' : 'fa-play'}"></i>
                        ${isActive ? '停止' : '監看'}
                    </button>
                    <button class="delete-btn" data-id="${channel.id}">
                        <i class="fa-regular fa-trash-can"></i>
                    </button>
                </div>
            `;
            channelList.appendChild(li);
        });

        // 綁定列表按鈕事件
        document.querySelectorAll('.watch-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                toggleMonitor(id);
            });
        });

        document.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = e.currentTarget.dataset.id;
                removeChannelFromLibrary(id);
            });
        });
    }

    function saveChannels() {
        localStorage.setItem('yt-monitor-channels', JSON.stringify(channels));
    }

    function openModal() {
        dashboardModal.classList.remove('hidden');
        ytUrlInput.focus();
    }

    function closeModal() {
        dashboardModal.classList.add('hidden');
    }
});
