const SUPABASE_URL = "https://csytpjewmhknhcxuhfes.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_4TdUVL7OG0kDlKTgjmIzcA_s1BXVSlR";

const supabaseClient = supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEY
);

async function checkLogin() {
    const {
        data: { session }
    } = await supabaseClient.auth.getSession();

    if (!session) {
        window.location.href = "login.html";
        return;
    }

    console.log("ログイン中:", session.user.email);
}

checkLogin();

const storageKeys = {
    matches: 'practiceApp_matches',
    tasks: 'practiceApp_tasks',
    memos: 'practiceApp_memos',
    practice: 'practiceApp_practice',
};

const sections = document.querySelectorAll('.page-section');
const tabButtons = document.querySelectorAll('.tab-button');
const matchForm = document.getElementById('matchForm');
const memoForm = document.getElementById('memoForm');
const practiceForm = document.getElementById('practiceForm');
const totalSets = document.getElementById('totalSets');
const pointInputs = document.getElementById('pointInputs');
const matchList = document.getElementById('matchList');
const taskList = document.getElementById('taskList');
const memoList = document.getElementById('memoList');
const practiceList = document.getElementById('practiceList');
const matchSubmitButton = document.getElementById('matchSubmitButton');
const matchCancelButton = document.getElementById('matchCancelButton');
const taskFormatFilter = document.getElementById('taskFormatFilter');
const memoFormatFilter = document.getElementById('memoFormatFilter');
const practiceFormatFilter = document.getElementById('practiceFormatFilter');
const memoSubmitButton = document.getElementById('memoSubmitButton');
const memoCancelButton = document.getElementById('memoCancelButton');
const practiceSubmitButton = document.getElementById('practiceSubmitButton');
const practiceCancelButton = document.getElementById('practiceCancelButton');
const latestWinRate = document.getElementById('latestWinRate');
const totalMatches = document.getElementById('totalMatches');
const winrateFilter = document.getElementById('winrateFilter');

let matches = [];
let tasks = [];
let memos = [];
let practicePlans = [];
let editingMatchIndex = null;
let editingMemoIndex = null;
let editingPracticeIndex = null;

//試合のセット数に応じて点数入力欄を自動生成する関数
function updatePointInputs() {
    const sets = parseInt(totalSets.value, 10) || 0;
    pointInputs.innerHTML = '';
    if (sets === 0) return;

    for (let i = 1; i <= sets; i += 1) {
        const label = document.createElement('label');
        label.textContent = `セット${i}の点数`;
        const input = document.createElement('input');
        input.type = 'text';
        input.placeholder = '例: 11-8';
        input.className = 'point-input';
        input.pattern = '\\d+-\\d+';
        label.appendChild(input);
        pointInputs.appendChild(label);
    }
}

totalSets.addEventListener('input', updatePointInputs);

const ctx = document.getElementById('winrateChart').getContext('2d');
const winrateChart = new Chart(ctx, {
    type: 'line',
    data: {
        labels: [],
        datasets: [{
            label: '勝率 (%)',
            data: [],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37,99,235,0.2)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
        }],
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            y: {
                min: 0,
                max: 100,
                ticks: {
                    callback: value => `${value}%`,
                },
            },
        },
    },
});

function showSection(sectionId) {
    sections.forEach(section => section.classList.toggle('active', section.id === sectionId));
    tabButtons.forEach(button => button.classList.toggle('active', button.dataset.section === sectionId));
}

function loadStorage(key) {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
}

function saveStorage(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
}

function updateMatchList() {
    matchList.innerHTML = '';
    matches.slice().reverse().forEach((match, reversedIndex) => {
        const actualIndex = matches.length - 1 - reversedIndex;
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>${match.date} - ${match.result === 'win' ? '勝ち' : match.result === 'lose' ? '負け' : '引き分け'}</strong>
            <div>対戦校: ${match.opponentSchool || '―'}</div>
            <div>対戦相手: ${match.opponentName || '―'}</div>
            <div>試合形式: ${match.format === 'double' ? 'ダブルス' : 'シングルス'}</div>
            <div>${match.format === 'double' ? `戦型: 自分=${match.doubleRubberTypes?.self || '―'} / パートナー=${match.doubleRubberTypes?.partner || '―'}` : `戦型: ${match.rubberType || '―'}`}</div>
            <div>セット数: ${match.totalSets || '―'}</div>
            <div>各セット点数: ${match.pointScore || '―'}</div>
            <div>${match.format === 'double' ? 'ダブルスの反省/課題' : 'シングルスの反省/課題'}: ${match.note || 'なし'}</div>
            <div class="item-actions">
                <button type="button" class="edit-button" data-action="edit-match" data-index="${actualIndex}">編集</button>
            </div>
        `;
        matchList.appendChild(li);
    });
}

function updateTaskList() {
    taskList.innerHTML = '';
    const filteredTasks = tasks.filter(task => {
        if (!taskFormatFilter) return true;
        const selectedFormat = taskFormatFilter.value;
        if (selectedFormat === 'all') return true;
        return task.format === selectedFormat;
    });

    if (filteredTasks.length === 0) {
        taskList.innerHTML = '<li>まだ課題や反省点はありません。</li>';
        return;
    }
    filteredTasks.slice().reverse().forEach(task => {
        const li = document.createElement('li');
        const formatLabel = task.format === 'double' ? 'ダブルス' : 'シングルス';
        li.innerHTML = `<strong>${task.date}</strong><div>${formatLabel}の反省/課題</div><div>${task.text}</div>`;
        taskList.appendChild(li);
    });
}

function updateMemoList() {
    memoList.innerHTML = '';
    const filteredMemos = memos.filter(item => {
        if (!memoFormatFilter) return true;
        const selectedFormat = memoFormatFilter.value;
        if (selectedFormat === 'all') return true;
        return item.format === selectedFormat;
    });

    if (filteredMemos.length === 0) {
        memoList.innerHTML = '<li>メモがありません。</li>';
        return;
    }
    filteredMemos.slice().reverse().forEach((item, reversedIndex) => {
        const actualIndex = memos.length - 1 - reversedIndex;
        const li = document.createElement('li');
        const formatLabel = item.format === 'double' ? 'ダブルス' : 'シングルス';
        li.innerHTML = `
            <strong>${item.date}</strong>
            <div>${formatLabel}</div>
            <div>${item.text}</div>
            <div class="item-actions">
                <button type="button" class="edit-button" data-action="edit-memo" data-index="${actualIndex}">編集</button>
            </div>
        `;
        memoList.appendChild(li);
    });
}

function updatePracticeList() {
    practiceList.innerHTML = '';
    const filteredPracticePlans = practicePlans.filter(item => {
        if (!practiceFormatFilter) return true;
        const selectedFormat = practiceFormatFilter.value;
        if (selectedFormat === 'all') return true;
        return item.format === selectedFormat;
    });

    if (filteredPracticePlans.length === 0) {
        practiceList.innerHTML = '<li>練習予定がありません。</li>';
        return;
    }
    filteredPracticePlans.slice().reverse().forEach((item, reversedIndex) => {
        const actualIndex = practicePlans.length - 1 - reversedIndex;
        const li = document.createElement('li');
        const formatLabel = item.format === 'double' ? 'ダブルス' : 'シングルス';
        li.innerHTML = `
            <strong>${item.date}</strong>
            <div>${formatLabel}</div>
            <div>${item.text}</div>
            <div class="item-actions">
                <button type="button" class="edit-button" data-action="edit-practice" data-index="${actualIndex}">編集</button>
            </div>
        `;
        practiceList.appendChild(li);
    });
}

function getFilteredMatches() {
    if (!winrateFilter) return matches;
    const selectedFormat = winrateFilter.value;
    if (selectedFormat === 'all') return matches;
    return matches.filter(match => match.format === selectedFormat);
}

function updateWinrate() {
    const filteredMatches = getFilteredMatches();
    const total = filteredMatches.length;
    const winCount = filteredMatches.filter(match => match.result === 'win').length;
    const rate = total > 0 ? Math.round((winCount / total) * 100) : 0;
    latestWinRate.textContent = `${rate}%`;
    totalMatches.textContent = total;

    const labels = [];
    const dataset = [];
    let wins = 0;
    filteredMatches.forEach((match, index) => {
        if (match.result === 'win') wins += 1;
        labels.push(match.date || `試合 ${index + 1}`);
        dataset.push(Math.round((wins / (index + 1)) * 100));
    });

    winrateChart.data.labels = labels;
    winrateChart.data.datasets[0].data = dataset;
    winrateChart.update();
}

function toggleMatchEditMode(editing = false) {
    matchSubmitButton.textContent = editing ? '編集を保存' : '記録を保存';
    matchCancelButton.classList.toggle('hidden', !editing);
}

function toggleMemoEditMode(editing = false) {
    memoSubmitButton.textContent = editing ? '編集を保存' : 'メモを保存';
    memoCancelButton.classList.toggle('hidden', !editing);
}

function togglePracticeEditMode(editing = false) {
    practiceSubmitButton.textContent = editing ? '編集を保存' : '予定を保存';
    practiceCancelButton.classList.toggle('hidden', !editing);
}

function resetMatchForm() {
    matchForm.reset();
    pointInputs.innerHTML = '';
    updateMatchFormByFormat('single');
    editingMatchIndex = null;
    toggleMatchEditMode(false);
}

function resetMemoForm() {
    memoForm.reset();
    editingMemoIndex = null;
    toggleMemoEditMode(false);
}

function resetPracticeForm() {
    practiceForm.reset();
    editingPracticeIndex = null;
    togglePracticeEditMode(false);
}

function updateMatchFormByFormat(format = 'single') {
    const isDouble = format === 'double';
    document.getElementById('rubberTypeLabel').classList.toggle('hidden', isDouble);
    document.getElementById('doubleRubberTypeFields').classList.toggle('hidden', !isDouble);
    const noteLabel = document.getElementById('matchNoteLabel');
    const noteTitle = noteLabel.querySelector('span');
    const noteTextarea = noteLabel.querySelector('textarea');
    noteTitle.textContent = isDouble ? 'ダブルスの反省/課題' : 'シングルスの反省/課題';
    noteTextarea.placeholder = isDouble ? 'ダブルスでの反省点や課題を入力' : 'シングルスでの反省点や課題を入力';
}

function populateMatchForm(match) {
    document.getElementById('matchDate').value = match.date || '';
    document.getElementById('opponentSchool').value = match.opponentSchool || '';
    document.getElementById('opponentName').value = match.opponentName || '';
    document.getElementById('rubberType').value = match.rubberType || '';
    document.getElementById('doubleRubberTypeSelf').value = match.doubleRubberTypes?.self || '';
    document.getElementById('doubleRubberTypePartner').value = match.doubleRubberTypes?.partner || '';
    document.getElementById('matchResult').value = match.result || 'win';
    document.getElementById('matchFormat').value = match.format === 'double' ? 'double' : 'single';
    updateMatchFormByFormat(document.getElementById('matchFormat').value);
    document.getElementById('totalSets').value = match.totalSets || '';
    updatePointInputs();
    const pointValues = (match.pointScore || '').split(',').map(value => value.trim());
    pointInputs.querySelectorAll('.point-input').forEach((input, index) => {
        input.value = pointValues[index] || '';
    });
    document.getElementById('matchNote').value = match.note || '';
}

function refreshAll() {
    updateMatchList();
    updateTaskList();
    updateMemoList();
    updatePracticeList();
    updateWinrate();
}

function addTask(text, source = null, sourceId = null, date = null, format = 'single') {
    if (!text.trim()) return;
    const task = {
        date: date || new Date().toLocaleDateString(),
        text: text.trim(),
        format,
    };
    if (source && sourceId != null) {
        task.source = source;
        task.sourceId = sourceId;
    }
    tasks.push(task);
    saveStorage(storageKeys.tasks, tasks);
}

function findTaskIndexByMatchId(matchId) {
    return tasks.findIndex(task => task.source === 'match' && task.sourceId === matchId);
}

function updateMatchTask(matchId, note, date, format = 'single') {
    const taskIndex = findTaskIndexByMatchId(matchId);
    const trimmedNote = note.trim();
    if (taskIndex === -1) {
        if (trimmedNote) {
            addTask(trimmedNote, 'match', matchId, date, format);
        }
        return;
    }

    if (!trimmedNote) {
        tasks.splice(taskIndex, 1);
    } else {
        tasks[taskIndex].text = trimmedNote;
        tasks[taskIndex].date = date || tasks[taskIndex].date;
        tasks[taskIndex].format = format;
    }
    saveStorage(storageKeys.tasks, tasks);
}

function init() {
    matches = loadStorage(storageKeys.matches);
    tasks = loadStorage(storageKeys.tasks);
    memos = loadStorage(storageKeys.memos);
    practicePlans = loadStorage(storageKeys.practice);
    refreshAll();
}

tabButtons.forEach(button => {
    button.addEventListener('click', () => {
        showSection(button.dataset.section);
    });
});

if (taskFormatFilter) {
    taskFormatFilter.addEventListener('change', updateTaskList);
}

if (memoFormatFilter) {
    memoFormatFilter.addEventListener('change', updateMemoList);
}

if (practiceFormatFilter) {
    practiceFormatFilter.addEventListener('change', updatePracticeList);
}

if (winrateFilter) {
    winrateFilter.addEventListener('change', updateWinrate);
}

document.getElementById('matchFormat').addEventListener('change', event => {
    updateMatchFormByFormat(event.target.value);
});

matchForm.addEventListener('submit', event => {
    event.preventDefault();
    const date = document.getElementById('matchDate').value;
    const opponentSchool = document.getElementById('opponentSchool').value.trim();
    const opponentName = document.getElementById('opponentName').value.trim();
    const rubberType = document.getElementById('rubberType').value;
    const result = document.getElementById('matchResult').value;
    const format = document.getElementById('matchFormat').value;
    const doubleRubberTypes = format === 'double' ? {
        self: document.getElementById('doubleRubberTypeSelf').value,
        partner: document.getElementById('doubleRubberTypePartner').value,
    } : null;
    const totalSetsVal = document.getElementById('totalSets').value;

    const pointInputsList = pointInputs.querySelectorAll('.point-input');
    const pointScore = [];
    pointInputsList.forEach(input => {
        const score = input.value.trim();
        if (score) pointScore.push(score);
    });
    const pointScoreStr = pointScore.join(', ');
    const note = document.getElementById('matchNote').value.trim();

    const matchData = {
        date,
        opponentSchool,
        opponentName,
        rubberType,
        result,
        format,
        doubleRubberTypes,
        totalSets: totalSetsVal,
        pointScore: pointScoreStr,
        note,
    };

    if (editingMatchIndex !== null) {
        matches[editingMatchIndex] = matchData;
        updateMatchTask(editingMatchIndex, note, date, format);
    } else {
        matches.push(matchData);
        const newMatchId = matches.length - 1;
        if (note) addTask(note, 'match', newMatchId, date, format);
    }

    saveStorage(storageKeys.matches, matches);
    resetMatchForm();
    refreshAll();
    showSection('matches');
});

memoForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = document.getElementById('memoText').value.trim();
    const format = memoFormatFilter ? memoFormatFilter.value : 'all';
    if (!text) return;

    if (editingMemoIndex !== null) {
        memos[editingMemoIndex].text = text;
        memos[editingMemoIndex].format = format === 'all' ? 'single' : format;
    } else {
        memos.push({ date: new Date().toLocaleDateString(), text, format: format === 'all' ? 'single' : format });
    }

    saveStorage(storageKeys.memos, memos);
    resetMemoForm();
    refreshAll();
    showSection('memo');
});

practiceForm.addEventListener('submit', event => {
    event.preventDefault();
    const text = document.getElementById('practiceText').value.trim();
    const format = practiceFormatFilter ? practiceFormatFilter.value : 'all';
    if (!text) return;

    if (editingPracticeIndex !== null) {
        practicePlans[editingPracticeIndex].text = text;
        practicePlans[editingPracticeIndex].format = format === 'all' ? 'single' : format;
    } else {
        practicePlans.push({ date: new Date().toLocaleDateString(), text, format: format === 'all' ? 'single' : format });
    }

    saveStorage(storageKeys.practice, practicePlans);
    resetPracticeForm();
    refreshAll();
    showSection('practice');
});

matchList.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    if (action === 'edit-match' && Number.isFinite(index)) {
        const match = matches[index];
        if (!match) return;
        editingMatchIndex = index;
        populateMatchForm(match);
        toggleMatchEditMode(true);
        showSection('matches');
    }
});

memoList.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    if (action === 'edit-memo' && Number.isFinite(index)) {
        const item = memos[index];
        if (!item) return;
        editingMemoIndex = index;
        document.getElementById('memoText').value = item.text;
        toggleMemoEditMode(true);
        showSection('memo');
    }
});

practiceList.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    const action = button.dataset.action;
    const index = Number(button.dataset.index);
    if (action === 'edit-practice' && Number.isFinite(index)) {
        const item = practicePlans[index];
        if (!item) return;
        editingPracticeIndex = index;
        document.getElementById('practiceText').value = item.text;
        togglePracticeEditMode(true);
        showSection('practice');
    }
});

matchCancelButton.addEventListener('click', resetMatchForm);
memoCancelButton.addEventListener('click', resetMemoForm);
practiceCancelButton.addEventListener('click', resetPracticeForm);


init();



