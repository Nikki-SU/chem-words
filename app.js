/**
 * ========================================
 * 化学单词通 - 主应用逻辑
 * ========================================
 */

(function() {
    'use strict';

    // ========================================
    // 应用状态
    // ========================================
    const App = {
        // 当前学习相关
        currentWord: null,
        currentMode: 'A',          // A/B/C/D
        currentStep: 1,            // 1-4: 英文选中文→中文选英文→英文选定义→定义选英文
        currentOptions: [],
        
        // 学习队列
        newWordsQueue: [],
        reviewWordsQueue: [],
        currentQueueIndex: 0,
        isNewWord: true,
        
        // 统计
        todayLearned: 0,
        todayReviewed: 0,
        todayCorrect: 0,
        
        // 设置
        settings: null,
        
        // DOM元素缓存
        elements: {}
    };

    // ========================================
    // DOM初始化
    // ========================================
    function initElements() {
        // 主菜单
        App.elements.mainMenu = document.getElementById('main-menu');
        
        // 面板
        App.elements.statsPanel = document.getElementById('stats-panel');
        App.elements.notebookPanel = document.getElementById('notebook-panel');
        App.elements.wordbookPanel = document.getElementById('wordbook-panel');
        App.elements.settingsPanel = document.getElementById('settings-panel');
        App.elements.learnPanel = document.getElementById('learn-panel');
        
        // 统计面板元素
        App.elements.statTotal = document.getElementById('stat-total');
        App.elements.statLearned = document.getElementById('stat-learned');
        App.elements.statNotebook = document.getElementById('stat-notebook');
        App.elements.statToday = document.getElementById('stat-today');
        
        // 生词本
        App.elements.notebookList = document.getElementById('notebook-list');
        
        // 词书管理
        App.elements.wordInput = document.getElementById('word-input');
        App.elements.wordCount = document.getElementById('word-count');
        
        // 学习页面
        App.elements.learnProgressFill = document.getElementById('learn-progress-fill');
        App.elements.learnProgressText = document.getElementById('learn-progress-text');
        
        // 模式A
        App.elements.modeA = document.getElementById('mode-a');
        App.elements.modeAWord = document.getElementById('mode-a-word');
        App.elements.modeAOptions = document.getElementById('mode-a-options');
        
        // 模式B
        App.elements.modeB = document.getElementById('mode-b');
        App.elements.modeBWord = document.getElementById('mode-b-word');
        App.elements.modeBOptions = document.getElementById('mode-b-options');
        
        // 模式C
        App.elements.modeC = document.getElementById('mode-c');
        App.elements.modeCWord = document.getElementById('mode-c-word');
        App.elements.modeCOptions = document.getElementById('mode-c-options');
        
        // 模式D
        App.elements.modeD = document.getElementById('mode-d');
        App.elements.modeDWord = document.getElementById('mode-d-word');
        App.elements.modeDOptions = document.getElementById('mode-d-options');
        
        // 单词详情
        App.elements.wordDetail = document.getElementById('word-detail');
        App.elements.detailWord = document.getElementById('detail-word');
        App.elements.detailTrans = document.getElementById('detail-trans');
        App.elements.detailDef = document.getElementById('detail-def');
        App.elements.detailSentence = document.getElementById('detail-sentence');
        
        // 学习完成
        App.elements.learnComplete = document.getElementById('learn-complete');
        App.elements.completeLearned = document.getElementById('complete-learned');
        App.elements.completeReviewed = document.getElementById('complete-reviewed');
        App.elements.completeCorrect = document.getElementById('complete-correct');
        
        // Toast
        App.elements.toast = document.getElementById('toast');
    }

    // ========================================
    // 事件绑定
    // ========================================
    function bindEvents() {
        // 主菜单按钮
        document.getElementById('btn-settings').addEventListener('click', showSettings);
        document.getElementById('btn-start-learn').addEventListener('click', startLearn);
        document.getElementById('btn-word-book').addEventListener('click', showWordbook);
        document.getElementById('btn-notebook').addEventListener('click', showNotebook);
        document.getElementById('btn-stats').addEventListener('click', showStats);
        
        // 返回按钮
        document.querySelectorAll('.back-btn').forEach(btn => {
            btn.addEventListener('click', goBack);
        });
        
        // 词书管理
        document.getElementById('btn-import').addEventListener('click', importWords);
        document.getElementById('btn-import-sample').addEventListener('click', importSampleWords);
        document.getElementById('btn-clear-words').addEventListener('click', clearWords);
        
        // 设置
        bindSettingEvents();
        
        // 学习页面
        document.getElementById('btn-quit-learn').addEventListener('click', quitLearn);
        document.getElementById('btn-next-learn').addEventListener('click', goToNextStep);
        document.getElementById('btn-back-menu').addEventListener('click', goBack);
        
        // 发音按钮
        document.querySelectorAll('.speak-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const text = this.getAttribute('data-text');
                if (text) speak(text);
            });
        });
    }

    /**
     * 绑定设置相关事件
     */
    function bindSettingEvents() {
        // 新学数量设置
        document.querySelectorAll('#setting-new-count .option-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#setting-new-count .option-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                App.settings.newWordsPerDay = parseInt(this.dataset.value);
                DataManager.saveSettings(App.settings);
                showToast('设置已保存');
            });
        });
        
        // 复习数量设置
        document.querySelectorAll('#setting-review-count .option-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                document.querySelectorAll('#setting-review-count .option-btn').forEach(b => b.classList.remove('selected'));
                this.classList.add('selected');
                App.settings.reviewWordsPerDay = parseInt(this.dataset.value);
                DataManager.saveSettings(App.settings);
                showToast('设置已保存');
            });
        });
        
        // TTS开关
        document.getElementById('toggle-tts').addEventListener('click', function() {
            this.classList.toggle('active');
            App.settings.autoTTS = this.classList.contains('active');
            DataManager.saveSettings(App.settings);
        });
        
        // 重置进度
        document.getElementById('btn-reset-progress').addEventListener('click', function() {
            if (confirm('确定要重置所有学习进度吗？此操作不可恢复！')) {
                DataManager.resetProgress();
                showToast('进度已重置');
                updateSettingsUI();
            }
        });
    }

    // ========================================
    // 面板切换
    // ========================================
    function hideAllPanels() {
        App.elements.mainMenu.style.display = 'none';
        App.elements.statsPanel.classList.add('hidden');
        App.elements.notebookPanel.classList.add('hidden');
        App.elements.wordbookPanel.classList.add('hidden');
        App.elements.settingsPanel.classList.add('hidden');
        App.elements.learnPanel.classList.add('hidden');
    }

    function showPanel(panel) {
        hideAllPanels();
        if (panel === 'main') {
            App.elements.mainMenu.style.display = 'grid';
        } else {
            panel.classList.remove('hidden');
        }
    }

    function goBack() {
        showPanel('main');
    }

    // ========================================
    // 统计页面
    // ========================================
    function showStats() {
        const stats = DataManager.getStats();
        App.elements.statTotal.textContent = stats.total;
        App.elements.statLearned.textContent = stats.mastered;
        App.elements.statNotebook.textContent = stats.notebookCount;
        App.elements.statToday.textContent = stats.todayLearned + '/' + stats.todayTotal;
        showPanel(App.elements.statsPanel);
    }

    // ========================================
    // 生词本页面
    // ========================================
    function showNotebook() {
        const notebook = DataManager.getNotebook();
        
        if (notebook.length === 0) {
            App.elements.notebookList.innerHTML = '<div class="empty-state">暂无生词，继续保持！🎉</div>';
        } else {
            App.elements.notebookList.innerHTML = notebook.map(word => `
                <div class="notebook-item">
                    <div>
                        <div class="notebook-word">${word.english}</div>
                        <div class="notebook-trans">${word.chinese}</div>
                    </div>
                    <span class="notebook-badge">错${word.totalErrors}次</span>
                </div>
            `).join('');
        }
        
        showPanel(App.elements.notebookPanel);
    }

    // ========================================
    // 词书管理页面
    // ========================================
    function showWordbook() {
        const words = DataManager.getWords();
        App.elements.wordCount.textContent = words.length;
        App.elements.wordInput.value = '';
        showPanel(App.elements.wordbookPanel);
    }

    /**
     * 导入词书
     */
    function importWords() {
        const text = App.elements.wordInput.value.trim();
        
        if (!text) {
            showToast('请输入词书内容');
            return;
        }
        
        const result = DataManager.importWords(text);
        
        if (result.success > 0) {
            App.elements.wordCount.textContent = DataManager.getWords().length;
            App.elements.wordInput.value = '';
            showToast(`成功导入 ${result.success} 个单词`);
            
            if (result.errors.length > 0) {
                console.warn('导入警告:', result.errors);
            }
        } else {
            showToast('导入失败，请检查格式');
        }
    }

    /**
     * 导入示例词书
     */
    function importSampleWords() {
        const sampleText = DataManager.getSampleWords();
        App.elements.wordInput.value = sampleText;
        showToast('示例词书已加载，点击"导入词书"保存');
    }

    /**
     * 清空词书
     */
    function clearWords() {
        if (confirm('确定要清空词书吗？所有进度将被重置！')) {
            DataManager.clearWords();
            App.elements.wordCount.textContent = '0';
            showToast('词书已清空');
        }
    }

    // ========================================
    // 设置页面
    // ========================================
    function showSettings() {
        updateSettingsUI();
        showPanel(App.elements.settingsPanel);
    }

    function updateSettingsUI() {
        App.settings = DataManager.getSettings();
        
        // 更新新学数量按钮
        document.querySelectorAll('#setting-new-count .option-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.value) === App.settings.newWordsPerDay);
        });
        
        // 更新复习数量按钮
        document.querySelectorAll('#setting-review-count .option-btn').forEach(btn => {
            btn.classList.toggle('selected', parseInt(btn.dataset.value) === App.settings.reviewWordsPerDay);
        });
        
        // 更新TTS开关
        document.getElementById('toggle-tts').classList.toggle('active', App.settings.autoTTS);
    }

    // ========================================
    // 学习功能
    // ========================================
    
    /**
     * 开始学习
     */
    function startLearn() {
        const words = DataManager.getWords();
        
        if (words.length === 0) {
            showToast('请先导入词书');
            showWordbook();
            return;
        }
        
        // 检查每日重置
        DataManager.checkDailyReset();
        
        // 获取设置
        App.settings = DataManager.getSettings();
        
        // 重置状态
        App.todayLearned = 0;
        App.todayReviewed = 0;
        App.todayCorrect = 0;
        
        // 获取学习队列
        const newWords = DataManager.getNewWords(App.settings.newWordsPerDay);
        const reviewWords = DataManager.getReviewWords(App.settings.reviewWordsPerDay);
        
        if (newWords.length === 0 && reviewWords.length === 0) {
            // 没有可学习的单词
            showToast('恭喜！所有单词都已掌握！');
            return;
        }
        
        // 混合队列：新词和复习词交替
        App.newWordsQueue = shuffleArray(newWords);
        App.reviewWordsQueue = shuffleArray(reviewWords);
        App.currentQueueIndex = 0;
        
        // 确定当前要学的单词类型
        if (App.newWordsQueue.length > 0) {
            App.isNewWord = true;
            App.currentWord = App.newWordsQueue[0];
            App.currentStep = App.currentWord.lastStep || 1;
        } else {
            App.isNewWord = false;
            App.currentWord = App.reviewWordsQueue[0];
            App.currentStep = 1;
        }
        
        // 显示学习页面
        showPanel(App.elements.learnPanel);
        updateLearnProgress();
        showCurrentStep();
    }

    /**
     * 更新学习进度条
     */
    function updateLearnProgress() {
        const total = App.newWordsQueue.length * 4 + App.reviewWordsQueue.length * 4;
        const current = (App.currentQueueIndex) * 4 + (App.currentStep - 1);
        const percent = total > 0 ? (current / total) * 100 : 0;
        
        App.elements.learnProgressFill.style.width = percent + '%';
        App.elements.learnProgressText.textContent = `${App.currentQueueIndex + 1}/${Math.ceil(total / 4)}`;
    }

    /**
     * 显示当前步骤
     */
    function showCurrentStep() {
        // 隐藏所有模式
        App.elements.modeA.classList.add('hidden');
        App.elements.modeB.classList.add('hidden');
        App.elements.modeC.classList.add('hidden');
        App.elements.modeD.classList.add('hidden');
        App.elements.wordDetail.classList.add('hidden');
        App.elements.learnComplete.classList.add('hidden');
        
        // 根据步骤显示对应内容
        switch (App.currentStep) {
            case 1:
                showModeA();
                break;
            case 2:
                showModeB();
                break;
            case 3:
                showModeC();
                break;
            case 4:
                showModeD();
                break;
            case 5:
                showWordDetail();
                break;
        }
    }

    /**
     * 模式A: 显示英文，选择中文
     */
    function showModeA() {
        const word = App.currentWord;
        App.elements.modeA.classList.remove('hidden');
        App.elements.modeAWord.textContent = word.english;
        
        // 设置发音按钮
        const speakBtn = App.elements.modeA.querySelector('.speak-btn');
        speakBtn.setAttribute('data-text', word.english);
        
        // 自动朗读
        if (App.settings.autoTTS) {
            speak(word.english);
        }
        
        // 生成选项
        const options = generateOptions(word, 'chinese', 4);
        App.elements.modeAOptions.innerHTML = options.map((opt, i) => `
            <button class="option-item" data-index="${i}" data-correct="${opt.isCorrect}">
                ${opt.text}
            </button>
        `).join('');
        
        // 绑定选项事件
        App.elements.modeAOptions.querySelectorAll('.option-item').forEach(btn => {
            btn.addEventListener('click', function() {
                handleAnswer(this, parseInt(this.dataset.correct) === 1);
            });
        });
    }

    /**
     * 模式B: 显示中文，选择英文
     */
    function showModeB() {
        const word = App.currentWord;
        App.elements.modeB.classList.remove('hidden');
        App.elements.modeBWord.textContent = word.chinese;
        
        // 生成选项
        const options = generateOptions(word, 'english', 4);
        App.elements.modeBOptions.innerHTML = options.map((opt, i) => `
            <button class="option-item" data-index="${i}" data-correct="${opt.isCorrect}">
                ${opt.text}
            </button>
        `).join('');
        
        App.elements.modeBOptions.querySelectorAll('.option-item').forEach(btn => {
            btn.addEventListener('click', function() {
                handleAnswer(this, parseInt(this.dataset.correct) === 1);
            });
        });
    }

    /**
     * 模式C: 显示英文，选择定义
     */
    function showModeC() {
        const word = App.currentWord;
        App.elements.modeC.classList.remove('hidden');
        App.elements.modeCWord.textContent = word.english;
        
        // 设置发音按钮
        const speakBtn = App.elements.modeC.querySelector('.speak-btn');
        speakBtn.setAttribute('data-text', word.english);
        
        // 自动朗读
        if (App.settings.autoTTS) {
            speak(word.english);
        }
        
        // 生成选项
        const options = generateOptions(word, 'definition', 4);
        App.elements.modeCOptions.innerHTML = options.map((opt, i) => `
            <button class="option-item" data-index="${i}" data-correct="${opt.isCorrect}">
                ${opt.text || '(无定义)'}
            </button>
        `).join('');
        
        App.elements.modeCOptions.querySelectorAll('.option-item').forEach(btn => {
            btn.addEventListener('click', function() {
                handleAnswer(this, parseInt(this.dataset.correct) === 1);
            });
        });
    }

    /**
     * 模式D: 显示定义，选择英文
     */
    function showModeD() {
        const word = App.currentWord;
        App.elements.modeD.classList.remove('hidden');
        App.elements.modeDWord.textContent = word.definition || '(无定义)';
        
        // 生成选项
        const options = generateOptions(word, 'english', 4);
        App.elements.modeDOptions.innerHTML = options.map((opt, i) => `
            <button class="option-item" data-index="${i}" data-correct="${opt.isCorrect}">
                ${opt.text}
            </button>
        `).join('');
        
        App.elements.modeDOptions.querySelectorAll('.option-item').forEach(btn => {
            btn.addEventListener('click', function() {
                handleAnswer(this, parseInt(this.dataset.correct) === 1);
            });
        });
    }

    /**
     * 显示单词详情
     */
    function showWordDetail() {
        const word = App.currentWord;
        App.elements.wordDetail.classList.remove('hidden');
        
        App.elements.detailWord.textContent = word.english;
        App.elements.detailTrans.textContent = word.chinese;
        App.elements.detailDef.textContent = word.definition || '(无定义)';
        App.elements.detailSentence.textContent = word.sentence || '(无例句)';
        
        // 设置发音按钮
        const speakBtn = App.elements.wordDetail.querySelector('.speak-btn');
        speakBtn.setAttribute('data-text', word.english);
        
        // 更新按钮文字
        const nextBtn = document.getElementById('btn-next-learn');
        nextBtn.textContent = '继续 →';
    }

    /**
     * 生成选项
     */
    function generateOptions(currentWord, type, count) {
        const allWords = DataManager.getWords();
        const correctAnswer = currentWord[type];
        const options = [{ text: correctAnswer, isCorrect: 1 }];
        
        // 获取其他单词的对应字段
        const otherWords = allWords.filter(w => w.id !== currentWord.id);
        const shuffled = shuffleArray(otherWords);
        
        for (let i = 0; i < count - 1 && i < shuffled.length; i++) {
            const optText = shuffled[i][type];
            if (optText && optText !== correctAnswer) {
                options.push({ text: optText, isCorrect: 0 });
            } else if (i + 1 < shuffled.length) {
                // 如果重复，继续找下一个
                const nextText = shuffled[i + 1][type];
                if (nextText) {
                    options.push({ text: nextText, isCorrect: 0 });
                }
            }
        }
        
        // 确保有足够选项
        while (options.length < count && otherWords.length >= count) {
            const randomWord = otherWords[Math.floor(Math.random() * otherWords.length)];
            const optText = randomWord[type];
            if (optText && optText !== correctAnswer && !options.find(o => o.text === optText)) {
                options.push({ text: optText, isCorrect: 0 });
            }
        }
        
        return shuffleArray(options);
    }

    /**
     * 处理答案
     */
    function handleAnswer(element, isCorrect) {
        // 禁用所有选项
        const parent = element.parentElement;
        parent.querySelectorAll('.option-item').forEach(btn => {
            btn.disabled = true;
            if (btn.dataset.correct === '1') {
                btn.classList.add('correct');
            }
        });
        
        if (isCorrect) {
            element.classList.add('correct');
            App.todayCorrect++;
            
            // 更新单词状态
            if (App.isNewWord) {
                App.currentWord.correctCount++;
                App.currentWord.lastStep = App.currentStep + 1;
                
                // 如果是复习词
            } else {
                App.currentWord.correctCount++;
            }
            
            // 检查是否掌握（连续答对12次）
            if (App.currentWord.correctCount >= 12) {
                App.currentWord.mastered = true;
                App.currentWord.addedToNotebook = false;
            }
            
            DataManager.updateWord(App.currentWord.id, {
                correctCount: App.currentWord.correctCount,
                lastStep: App.currentWord.lastStep,
                learned: true,
                mastered: App.currentWord.mastered,
                addedToNotebook: App.currentWord.addedToNotebook
            });
            
            // 延迟后进入下一步
            setTimeout(() => {
                goToNextStep();
            }, 800);
            
        } else {
            element.classList.add('wrong');
            
            // 错误处理
            App.currentWord.totalErrors++;
            App.currentWord.correctCount = 0; // 重置连续正确次数
            
            // 错误3次以上加入生词本
            if (App.currentWord.totalErrors >= 3 && !App.currentWord.mastered) {
                App.currentWord.addedToNotebook = true;
            }
            
            // 如果是新词，从当前步骤重新开始
            if (App.isNewWord) {
                App.currentWord.lastStep = App.currentStep; // 保持当前步骤
            }
            
            DataManager.updateWord(App.currentWord.id, {
                correctCount: 0,
                totalErrors: App.currentWord.totalErrors,
                lastStep: App.currentWord.lastStep,
                addedToNotebook: App.currentWord.addedToNotebook
            });
            
            showToast('答错了，下次继续努力！');
            
            // 延迟后重新显示当前步骤
            setTimeout(() => {
                showCurrentStep();
            }, 1000);
        }
        
        // 更新进度
        const progress = DataManager.getProgress();
        progress.todayCorrect++;
        progress.todayTotal++;
        DataManager.saveProgress(progress);
    }

    /**
     * 进入下一步
     */
    function goToNextStep() {
        // 更新统计
        if (App.isNewWord) {
            App.todayLearned++;
        } else {
            App.todayReviewed++;
        }
        
        // 更新进度
        App.currentQueueIndex++;
        
        // 确定下一个单词
        if (App.currentQueueIndex >= App.newWordsQueue.length + App.reviewWordsQueue.length) {
            // 学习完成
            showLearnComplete();
            return;
        }
        
        // 交替选择新词和复习词
        if (App.currentQueueIndex < App.newWordsQueue.length) {
            App.isNewWord = true;
            App.currentWord = App.newWordsQueue[App.currentQueueIndex];
            App.currentStep = App.currentWord.lastStep || 1;
        } else {
            const reviewIndex = App.currentQueueIndex - App.newWordsQueue.length;
            if (reviewIndex < App.reviewWordsQueue.length) {
                App.isNewWord = false;
                App.currentWord = App.reviewWordsQueue[reviewIndex];
                App.currentStep = 1;
            } else {
                showLearnComplete();
                return;
            }
        }
        
        updateLearnProgress();
        showCurrentStep();
    }

    /**
     * 显示学习完成
     */
    function showLearnComplete() {
        App.elements.modeA.classList.add('hidden');
        App.elements.modeB.classList.add('hidden');
        App.elements.modeC.classList.add('hidden');
        App.elements.modeD.classList.add('hidden');
        App.elements.wordDetail.classList.add('hidden');
        App.elements.learnComplete.classList.remove('hidden');
        
        App.elements.completeLearned.textContent = App.todayLearned;
        App.elements.completeReviewed.textContent = App.todayReviewed;
        App.elements.completeCorrect.textContent = App.todayCorrect;
        
        // 保存进度
        const progress = DataManager.getProgress();
        progress.newWordsToday = App.todayLearned;
        progress.reviewWordsToday = App.todayReviewed;
        DataManager.saveProgress(progress);
    }

    /**
     * 退出学习
     */
    function quitLearn() {
        if (confirm('确定要退出学习吗？当前进度不会保存。')) {
            goBack();
        }
    }

    // ========================================
    // 语音合成 (TTS)
    // ========================================
    function speak(text) {
        if (!('speechSynthesis' in window)) {
            console.warn('浏览器不支持语音合成');
            return;
        }
        
        // 取消之前的朗读
        speechSynthesis.cancel();
        
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.rate = 0.9;
        utterance.pitch = 1;
        
        // 尝试获取英文语音
        const voices = speechSynthesis.getVoices();
        const englishVoice = voices.find(v => v.lang.startsWith('en'));
        if (englishVoice) {
            utterance.voice = englishVoice;
        }
        
        speechSynthesis.speak(utterance);
    }

    // ========================================
    // 工具函数
    // ========================================
    
    /**
     * 数组打乱
     */
    function shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    /**
     * 显示Toast提示
     */
    function showToast(message) {
        App.elements.toast.textContent = message;
        App.elements.toast.classList.remove('hidden');
        
        setTimeout(() => {
            App.elements.toast.classList.add('hidden');
        }, 2000);
    }

    // ========================================
    // 应用初始化
    // ========================================
    function init() {
        // 初始化元素
        initElements();
        
        // 绑定事件
        bindEvents();
        
        // 加载设置
        App.settings = DataManager.getSettings();
        
        // 检查每日重置
        DataManager.checkDailyReset();
        
        // 预加载语音
        if ('speechSynthesis' in window) {
            speechSynthesis.getVoices();
            speechSynthesis.onvoiceschanged = () => {
                speechSynthesis.getVoices();
            };
        }
        
        console.log('化学单词通 已初始化');
    }

    // DOM加载完成后初始化
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
