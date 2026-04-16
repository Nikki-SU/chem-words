/**
 * ========================================
 * 数据管理器 - data-manager.js
 * 负责所有数据的本地存储和读取
 * ========================================
 */

const DataManager = {
    // 存储键名
    KEYS: {
        WORDS: 'flashcard_words',
        PROGRESS: 'flashcard_progress',
        SETTINGS: 'flashcard_settings',
        NOTEBOOK: 'flashcard_notebook',
        STATS: 'flashcard_stats'
    },

    /**
     * 获取所有词汇
     */
    getWords() {
        try {
            const data = localStorage.getItem(this.KEYS.WORDS);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error('获取词汇失败:', e);
            return [];
        }
    },

    /**
     * 保存词汇列表
     */
    saveWords(words) {
        try {
            localStorage.setItem(this.KEYS.WORDS, JSON.stringify(words));
            return true;
        } catch (e) {
            console.error('保存词汇失败:', e);
            return false;
        }
    },

    /**
     * 导入词汇
     * @param {string} text - 词书文本，每行格式：英文|中文|定义|例句
     */
    importWords(text) {
        // 尝试检测是否为JSON格式
        try {
            const json = JSON.parse(text);
            if (Array.isArray(json)) {
                return this.importJSON(json);
            }
        } catch (e) {
            // 不是JSON，继续按TXT处理
        }
        
        // TXT格式：每行一个单词，用|分隔
        const lines = text.trim().split('\n');
        const words = [];
        const errors = [];

        lines.forEach((line, index) => {
            line = line.trim();
            if (!line) return;

            // 分割每行的内容
            const parts = line.split('|').map(p => p.trim());
            
            if (parts.length >= 2) {
                words.push({
                    id: this.generateId(),
                    english: parts[0] || '',
                    chinese: parts[1] || '',
                    definition: parts[2] || '',
                    sentence: parts[3] || '',
                    // 学习进度
                    correctCount: 0,        // 连续正确次数
                    totalErrors: 0,         // 累计错误次数
                    learned: false,          // 是否学过
                    mastered: false,         // 是否已掌握
                    lastMode: 0,             // 最后学习的模式 (1-4)
                    lastStep: 0,             // 最后学习的步骤 (1-4)
                    addedToNotebook: false,  // 是否已加入生词本
                    createdAt: Date.now()
                });
            } else if (parts.length === 1 && parts[0]) {
                // 只有英文的情况
                errors.push(`第${index + 1}行: "${parts[0]}" - 缺少中文翻译`);
            }
        });

        // 保存到本地
        if (words.length > 0) {
            this.saveWords(words);
        }

        return {
            success: words.length,
            errors: errors
        };
    },
    
    /**
     * 导入JSON格式词汇
     */
    importJSON(jsonArray) {
        const words = [];
        const errors = [];

        jsonArray.forEach((item, index) => {
            if (!item.en && !item.english) {
                errors.push(`第${index + 1}项: 缺少英文单词`);
                return;
            }

            words.push({
                id: this.generateId(),
                english: item.en || item.english || '',
                chinese: item.cn || item.chinese || '',
                definition: item.defCn || item.definition || '',
                sentence: item.ex || item.example || item.sentence || '',
                // 学习进度
                correctCount: 0,
                totalErrors: 0,
                learned: false,
                mastered: false,
                lastMode: 0,
                lastStep: 0,
                addedToNotebook: false,
                createdAt: Date.now()
            });
        });

        // 保存到本地
        if (words.length > 0) {
            this.saveWords(words);
        }

        return {
            success: words.length,
            errors: errors
        };
    },

    /**
     * 生成唯一ID
     */
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
    },

    /**
     * 获取学习进度
     */
    getProgress() {
        try {
            const data = localStorage.getItem(this.KEYS.PROGRESS);
            return data ? JSON.parse(data) : {
                newWordsToday: 0,
                reviewWordsToday: 0,
                lastLearnDate: null,
                todayCorrect: 0,
                todayTotal: 0
            };
        } catch (e) {
            return {
                newWordsToday: 0,
                reviewWordsToday: 0,
                lastLearnDate: null,
                todayCorrect: 0,
                todayTotal: 0
            };
        }
    },

    /**
     * 保存学习进度
     */
    saveProgress(progress) {
        try {
            localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify(progress));
            return true;
        } catch (e) {
            console.error('保存进度失败:', e);
            return false;
        }
    },

    /**
     * 获取设置
     */
    getSettings() {
        try {
            const data = localStorage.getItem(this.KEYS.SETTINGS);
            return data ? JSON.parse(data) : {
                newWordsPerDay: 30,
                reviewWordsPerDay: 30,
                autoTTS: true
            };
        } catch (e) {
            return {
                newWordsPerDay: 30,
                reviewWordsPerDay: 30,
                autoTTS: true
            };
        }
    },

    /**
     * 保存设置
     */
    saveSettings(settings) {
        try {
            localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
            return true;
        } catch (e) {
            console.error('保存设置失败:', e);
            return false;
        }
    },

    /**
     * 获取生词本
     */
    getNotebook() {
        const words = this.getWords();
        // 生词本：累计错误3次以上的单词
        return words.filter(w => w.totalErrors >= 3 && !w.mastered);
    },

    /**
     * 更新单词状态
     */
    updateWord(wordId, updates) {
        const words = this.getWords();
        const index = words.findIndex(w => w.id === wordId);
        
        if (index !== -1) {
            words[index] = { ...words[index], ...updates };
            this.saveWords(words);
            return true;
        }
        return false;
    },

    /**
     * 获取待学习的新词
     */
    getNewWords(count) {
        const words = this.getWords();
        // 获取未学习的单词
        return words.filter(w => !w.learned).slice(0, count);
    },

    /**
     * 获取待复习的单词
     */
    getReviewWords(count) {
        const words = this.getWords();
        // 获取已学习但未掌握的单词
        return words.filter(w => w.learned && !w.mastered).slice(0, count);
    },

    /**
     * 获取统计信息
     */
    getStats() {
        const words = this.getWords();
        const progress = this.getProgress();
        const notebook = this.getNotebook();

        return {
            total: words.length,
            learned: words.filter(w => w.learned).length,
            mastered: words.filter(w => w.mastered).length,
            notebookCount: notebook.length,
            todayLearned: progress.todayCorrect,
            todayTotal: progress.todayTotal
        };
    },

    /**
     * 重置所有进度
     */
    resetProgress() {
        const words = this.getWords();
        words.forEach(w => {
            w.correctCount = 0;
            w.totalErrors = 0;
            w.learned = false;
            w.mastered = false;
            w.lastMode = 0;
            w.lastStep = 0;
            w.addedToNotebook = false;
        });
        this.saveWords(words);
        localStorage.setItem(this.KEYS.PROGRESS, JSON.stringify({
            newWordsToday: 0,
            reviewWordsToday: 0,
            lastLearnDate: null,
            todayCorrect: 0,
            todayTotal: 0
        }));
    },

    /**
     * 清空词书
     */
    clearWords() {
        localStorage.removeItem(this.KEYS.WORDS);
        this.resetProgress();
    },

    /**
     * 检查是否需要重置每日进度
     */
    checkDailyReset() {
        const progress = this.getProgress();
        const today = new Date().toDateString();
        
        if (progress.lastLearnDate !== today) {
            progress.newWordsToday = 0;
            progress.reviewWordsToday = 0;
            progress.todayCorrect = 0;
            progress.todayTotal = 0;
            progress.lastLearnDate = today;
            this.saveProgress(progress);
        }
    },

    /**
     * 获取示例词书数据
     */
    getSampleWords() {
        return `hydrogen|氢|最轻的元素，符号H| hydrogen is the lightest element.
oxygen|氧|生命必需的气体，符号O| oxygen is essential for life.
carbon|碳|生命的基础元素，符号C| carbon forms the basis of organic chemistry.
nitrogen|氮|空气中78%的气体，符号N| nitrogen makes up 78% of the air.
chlorine|氯|黄绿色有毒气体，符号Cl| chlorine is used for water purification.
sodium|钠|碱金属元素，符号Na| sodium is a highly reactive alkali metal.
potassium|钾|重要的碱金属，符号K| potassium is essential for plant growth.
calcium|钙|构成骨骼的主要元素，符号Ca| calcium is important for bone health.
magnesium|镁|轻质金属元素，符号Mg| magnesium burns with a bright white light.
iron|铁|最常用的金属，符号Fe| iron is the most commonly used metal.
copper|铜|良好的导电金属，符号Cu| copper is an excellent conductor of electricity.
zinc|锌|蓝白色金属，符号Zn| zinc is used to galvanize steel.
silver|银|贵金属，符号Ag| silver has the highest electrical conductivity.
gold|金|贵金属，符号Au| gold is a precious metal used in jewelry.
mercury|汞|常温下唯一的液态金属| mercury is the only metal that is liquid at room temperature.
lead|铅|重金属，符号Pb| lead is a dense heavy metal.
sulfur|硫|黄色非金属元素，符号S| sulfur has a characteristic yellow color.
phosphorus|磷|生命必需元素，符号P| phosphorus is essential for life.
silicon|硅|半导体材料，符号Si| silicon is used in computer chips.
boron|硼|类金属元素，符号B| boron is used in glass and ceramics.
aluminum|铝|轻质金属，符号Al| aluminum is a lightweight metal.
fluorine|氟|最活泼的非金属，符号F| fluorine is the most reactive element.`;
    }
};

// 导出供外部使用
window.DataManager = DataManager;
