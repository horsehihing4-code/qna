// 데이터 저장소
let data = {
    subjects: [
        { id: 'korean', name: '국어', icon: '📖' },
        { id: 'english', name: '영어', icon: '🔤' },
        { id: 'math', name: '수학', icon: '📐' },
        { id: 'science', name: '과학', icon: '🔬' }
    ],
    questions: {} // { subjectId: [questions] }
};

// 현재 선택된 교과목
let currentSubject = 'korean';
let currentQuestionId = null;

// 로컬 스토리지에서 데이터 로드
function loadData() {
    const savedData = localStorage.getItem('qnaData');
    if (savedData) {
        const parsed = JSON.parse(savedData);
        data.questions = parsed.questions || {};
    }
    // 각 교과목에 대한 질문 배열 초기화
    data.subjects.forEach(subject => {
        if (!data.questions[subject.id]) {
            data.questions[subject.id] = [];
        }
    });
}

// 로컬 스토리지에 데이터 저장
function saveData() {
    localStorage.setItem('qnaData', JSON.stringify({
        questions: data.questions
    }));
}

// DOM 요소
const subjectTabs = document.querySelectorAll('.subject-tab');
const listView = document.getElementById('list-view');
const detailView = document.getElementById('detail-view');
const emptyState = document.getElementById('empty-state');
const questionForm = document.getElementById('question-form');
const questionsContainer = document.getElementById('questions-container');
const backBtn = document.getElementById('back-btn');
const questionDetail = document.getElementById('question-detail');

// 초기화
loadData();
initSubjectTabs();
renderQuestions();

// 교과목 탭 초기화
function initSubjectTabs() {
    subjectTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const subjectId = tab.dataset.subject;
            switchSubject(subjectId);
        });
    });
}

// 교과목 전환
function switchSubject(subjectId) {
    currentSubject = subjectId;
    
    // 탭 활성화 상태 업데이트
    subjectTabs.forEach(tab => {
        if (tab.dataset.subject === subjectId) {
            tab.classList.add('active', 'bg-gradient-to-r', 'from-indigo-600', 'to-purple-600', 'text-white', 'shadow-lg');
            tab.classList.remove('bg-white', 'text-gray-700', 'border-gray-300');
        } else {
            tab.classList.remove('active', 'bg-gradient-to-r', 'from-indigo-600', 'to-purple-600', 'text-white', 'shadow-lg');
            tab.classList.add('bg-white', 'text-gray-700', 'border', 'border-gray-300');
        }
    });
    
    // 목록 뷰로 전환
    showListView();
    renderQuestions();
}

// 목록 뷰 표시
function showListView() {
    listView.classList.remove('hidden');
    detailView.classList.add('hidden');
    emptyState.classList.add('hidden');
}

// 상세 뷰 표시
function showDetailView(questionId) {
    currentQuestionId = questionId;
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');
    emptyState.classList.add('hidden');
    renderQuestionDetail(questionId);
}

// 뒤로가기 버튼
backBtn.addEventListener('click', () => {
    showListView();
});

// 질문 등록
questionForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const title = document.getElementById('question-title').value.trim();
    const content = document.getElementById('question-content').value.trim();

    if (!title || !content) {
        await Swal.fire({
            icon: 'warning',
            title: '입력 오류',
            text: '제목과 내용을 모두 입력해주세요.',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
        });
        return;
    }

    const newQuestion = {
        id: Date.now().toString(),
        title: title,
        content: content,
        createdAt: new Date().toISOString(),
        answers: []
    };

    data.questions[currentSubject].push(newQuestion);
    saveData();
    renderQuestions();
    questionForm.reset();

    await Swal.fire({
        icon: 'success',
        title: '질문 등록 완료!',
        text: '질문이 성공적으로 등록되었습니다.',
        confirmButtonColor: '#6366f1',
        confirmButtonText: '확인',
        timer: 2000,
        timerProgressBar: true
    });
});

// 질문 목록 렌더링
function renderQuestions() {
    const questions = data.questions[currentSubject] || [];
    questionsContainer.innerHTML = '';

    if (questions.length === 0) {
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    // 최신 질문이 위에 오도록 정렬
    questions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    questions.forEach(question => {
        const questionCard = createQuestionListItem(question);
        questionsContainer.appendChild(questionCard);
    });
}

// 질문 목록 아이템 생성 (클릭 가능)
function createQuestionListItem(question) {
    const card = document.createElement('div');
    card.className = 'bg-white border-2 border-gray-200 rounded-2xl p-6 cursor-pointer transition-all duration-300 hover:border-indigo-400 hover:shadow-xl transform hover:-translate-y-1';
    card.dataset.questionId = question.id;

    const date = new Date(question.createdAt);
    const dateStr = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    const answerCount = (question.answers || []).length;
    const preview = question.content.length > 150 
        ? question.content.substring(0, 150) + '...' 
        : question.content;

    card.innerHTML = `
        <div class="flex justify-between items-start mb-3 flex-wrap gap-2">
            <h3 class="text-xl font-bold text-gray-800 flex-1">${escapeHtml(question.title)}</h3>
            <span class="text-sm text-gray-500 whitespace-nowrap">${dateStr}</span>
        </div>
        <p class="text-gray-600 mb-4 line-clamp-2">${escapeHtml(preview)}</p>
        <div class="flex justify-end">
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-indigo-100 text-indigo-700 font-semibold text-sm">
                💬 답변 ${answerCount}개
            </span>
        </div>
    `;

    // 클릭 시 상세 페이지로 이동
    card.addEventListener('click', () => {
        showDetailView(question.id);
    });

    return card;
}

// 질문 상세 페이지 렌더링
function renderQuestionDetail(questionId) {
    const questions = data.questions[currentSubject];
    const question = questions.find(q => q.id === questionId);
    
    if (!question) {
        showListView();
        return;
    }

    currentQuestionId = questionId;

    const date = new Date(question.createdAt);
    const dateStr = date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    questionDetail.innerHTML = `
        <div class="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-6 mb-6 border border-indigo-100">
            <div class="flex justify-between items-start mb-4 flex-wrap gap-3">
                <h2 class="text-3xl font-bold text-gray-800 flex-1">${escapeHtml(question.title)}</h2>
                <span class="text-sm text-gray-500 whitespace-nowrap">${dateStr}</span>
            </div>
            <div class="text-gray-700 text-lg leading-relaxed whitespace-pre-wrap">
                ${escapeHtml(question.content).replace(/\n/g, '<br>')}
            </div>
        </div>

        <div class="answers-section">
            <h3 class="text-2xl font-bold text-gray-800 mb-4">답변 <span class="text-indigo-600">(${(question.answers || []).length})</span></h3>
            
            <div class="bg-gray-50 rounded-2xl p-6 mb-6 border border-gray-200">
                <textarea 
                    id="answer-input" 
                    placeholder="답변을 입력하세요..." 
                    rows="5"
                    class="w-full px-4 py-3 rounded-xl border-2 border-gray-300 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none transition-all resize-none mb-4"
                ></textarea>
                <button 
                    id="submit-answer-btn" 
                    class="w-full md:w-auto px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-700 hover:to-purple-700 transform hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                    💬 답변 등록
                </button>
            </div>

            <div id="answers-list" class="space-y-4">
                <!-- 답변 목록이 여기에 표시됩니다 -->
            </div>
        </div>
    `;

    // 답변 등록 버튼 이벤트
    const submitBtn = document.getElementById('submit-answer-btn');
    const answerInput = document.getElementById('answer-input');
    
    submitBtn.addEventListener('click', async () => {
        const answerContent = answerInput.value.trim();
        
        if (!answerContent) {
            await Swal.fire({
                icon: 'warning',
                title: '입력 오류',
                text: '답변 내용을 입력해주세요.',
                confirmButtonColor: '#6366f1',
                confirmButtonText: '확인'
            });
            return;
        }

        await addAnswer(questionId, answerContent);
        answerInput.value = '';
    });

    // Enter 키로도 답변 등록 가능 (Shift+Enter는 줄바꿈)
    answerInput.addEventListener('keydown', async (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            const answerContent = answerInput.value.trim();
            
            if (answerContent) {
                await addAnswer(questionId, answerContent);
                answerInput.value = '';
            }
        }
    });

    // 답변 목록 렌더링
    renderAnswers(question.answers || []);
}

// 답변 추가
async function addAnswer(questionId, content) {
    const questions = data.questions[currentSubject];
    const question = questions.find(q => q.id === questionId);
    
    if (question) {
        if (!question.answers) {
            question.answers = [];
        }
        
        const newAnswer = {
            id: Date.now().toString(),
            content: content,
            createdAt: new Date().toISOString()
        };
        
        question.answers.push(newAnswer);
        saveData();
        
        // 답변 목록 업데이트
        renderAnswers(question.answers);
        
        // 질문 목록도 업데이트 (답변 개수 반영)
        renderQuestions();

        // 성공 알림
        await Swal.fire({
            icon: 'success',
            title: '답변 등록 완료!',
            text: '답변이 성공적으로 등록되었습니다.',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인',
            timer: 2000,
            timerProgressBar: true
        });
    }
}

// 답변 목록 렌더링
function renderAnswers(answers) {
    const answersList = document.getElementById('answers-list');
    answersList.innerHTML = '';

    if (answers.length === 0) {
        answersList.innerHTML = `
            <div class="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-300">
                <p class="text-gray-500 text-lg">아직 답변이 없습니다. 첫 번째 답변을 작성해보세요! ✨</p>
            </div>
        `;
        return;
    }

    // 최신 답변이 위에 오도록 정렬
    answers.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    answers.forEach(answer => {
        const answerCard = document.createElement('div');
        answerCard.className = 'bg-white border-l-4 border-indigo-500 rounded-xl p-5 shadow-md hover:shadow-lg transition-all duration-300';
        
        const date = new Date(answer.createdAt);
        const dateStr = date.toLocaleString('ko-KR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        answerCard.innerHTML = `
            <div class="text-gray-700 leading-relaxed mb-3 whitespace-pre-wrap">
                ${escapeHtml(answer.content).replace(/\n/g, '<br>')}
            </div>
            <div class="text-right">
                <span class="text-sm text-gray-500">${dateStr}</span>
            </div>
        `;
        
        answersList.appendChild(answerCard);
    });
}

// XSS 방지를 위한 HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
