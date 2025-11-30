// Firebase 초기화 (firebase-config.js가 먼저 로드되어야 함)
let db = null;
let firebaseReady = false;

// Firebase 초기화 함수
async function initializeFirebase() {
    return new Promise((resolve, reject) => {
        // Firebase SDK가 로드될 때까지 대기
        const checkFirebase = setInterval(() => {
            if (typeof firebase !== 'undefined' && firebaseConfig) {
                clearInterval(checkFirebase);
                
                try {
                    // Firebase 초기화
                    firebase.initializeApp(firebaseConfig);
                    db = firebase.firestore();
                    firebaseReady = true;
                    console.log('Firebase 초기화 완료');
                    resolve();
                } catch (error) {
                    console.error('Firebase 초기화 오류:', error);
                    reject(error);
                }
            }
        }, 100);
        
        // 10초 후 타임아웃
        setTimeout(() => {
            clearInterval(checkFirebase);
            reject(new Error('Firebase SDK 로드 타임아웃'));
        }, 10000);
    });
}

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

// Firestore에서 데이터 로드
async function loadData() {
    try {
        if (!firebaseReady) {
            await initializeFirebase();
        }
        
        // 각 교과목의 질문 데이터 로드
        for (const subject of data.subjects) {
            const questionsRef = db.collection('questions').doc(subject.id).collection('items');
            const querySnapshot = await questionsRef.orderBy('createdAt', 'desc').get();
            
            data.questions[subject.id] = [];
            querySnapshot.forEach((docSnap) => {
                const questionData = docSnap.data();
                questionData.id = docSnap.id;
                // Timestamp를 ISO 문자열로 변환
                if (questionData.createdAt && questionData.createdAt.toDate) {
                    questionData.createdAt = questionData.createdAt.toDate().toISOString();
                }
                // answers 배열의 createdAt도 변환
                if (questionData.answers) {
                    questionData.answers = questionData.answers.map(answer => {
                        if (answer.createdAt && answer.createdAt.toDate) {
                            answer.createdAt = answer.createdAt.toDate().toISOString();
                        }
                        return answer;
                    });
                }
                data.questions[subject.id].push(questionData);
            });
        }
        
        console.log('Firebase에서 데이터 로드 완료');
    } catch (error) {
        console.error('데이터 로드 오류:', error);
        // 오류 발생 시 빈 배열로 초기화
        data.subjects.forEach(subject => {
            if (!data.questions[subject.id]) {
                data.questions[subject.id] = [];
            }
        });
        
        await Swal.fire({
            icon: 'error',
            title: '데이터 로드 실패',
            text: 'Firebase 연결에 실패했습니다. firebase-config.js 파일을 확인해주세요.',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
        });
    }
}

// 질문을 Firestore에 저장
async function saveQuestionToFirestore(question) {
    try {
        if (!firebaseReady) {
            await initializeFirebase();
        }
        
        const questionRef = db.collection('questions').doc(currentSubject).collection('items').doc(question.id);
        await questionRef.set({
            title: question.title,
            content: question.content,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            answers: question.answers || []
        });
        
        // 로컬 데이터도 업데이트
        if (!data.questions[currentSubject]) {
            data.questions[currentSubject] = [];
        }
        const existingIndex = data.questions[currentSubject].findIndex(q => q.id === question.id);
        if (existingIndex >= 0) {
            data.questions[currentSubject][existingIndex] = question;
        } else {
            data.questions[currentSubject].push(question);
        }
        
        return true;
    } catch (error) {
        console.error('질문 저장 오류:', error);
        throw error;
    }
}

// 답변을 Firestore에 저장
async function saveAnswerToFirestore(questionId, answer) {
    try {
        if (!firebaseReady) {
            await initializeFirebase();
        }
        
        const questionRef = db.collection('questions').doc(currentSubject).collection('items').doc(questionId);
        const questionSnap = await questionRef.get();
        
        if (questionSnap.exists) {
            const questionData = questionSnap.data();
            const answers = questionData.answers || [];
            
            // serverTimestamp()는 배열 내부에서 지원되지 않으므로
            // 클라이언트에서 생성한 타임스탬프를 Timestamp 객체로 변환
            const answerTimestamp = firebase.firestore.Timestamp.fromDate(new Date(answer.createdAt));
            
            answers.push({
                id: answer.id,
                content: answer.content,
                createdAt: answerTimestamp
            });
            
            await questionRef.update({
                answers: answers
            });
            
            // 로컬 데이터도 업데이트
            const localQuestion = data.questions[currentSubject].find(q => q.id === questionId);
            if (localQuestion) {
                if (!localQuestion.answers) {
                    localQuestion.answers = [];
                }
                localQuestion.answers.push(answer);
            }
            
            return true;
        }
        return false;
    } catch (error) {
        console.error('답변 저장 오류:', error);
        throw error;
    }
}

// 실시간 업데이트 리스너 설정
function setupRealtimeListeners() {
    if (!firebaseReady) {
        initializeFirebase().then(() => {
            setupRealtimeListeners();
        });
        return;
    }
    
    data.subjects.forEach(subject => {
        const questionsRef = db.collection('questions').doc(subject.id).collection('items');
        
        questionsRef.orderBy('createdAt', 'desc').onSnapshot((snapshot) => {
            if (subject.id === currentSubject) {
                data.questions[subject.id] = [];
                snapshot.forEach((docSnap) => {
                    const questionData = docSnap.data();
                    questionData.id = docSnap.id;
                    if (questionData.createdAt && questionData.createdAt.toDate) {
                        questionData.createdAt = questionData.createdAt.toDate().toISOString();
                    }
                    if (questionData.answers) {
                        questionData.answers = questionData.answers.map(answer => {
                            if (answer.createdAt && answer.createdAt.toDate) {
                                answer.createdAt = answer.createdAt.toDate().toISOString();
                            }
                            return answer;
                        });
                    }
                    data.questions[subject.id].push(questionData);
                });
                renderQuestions();
            }
        });
    });
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
(async () => {
    await loadData();
    initSubjectTabs();
    renderQuestions();
    
    // 실시간 업데이트 리스너 설정
    setupRealtimeListeners();
    
    // 글자 수 카운터 설정
    setupCharacterCounters();
})();

// 글자 수 카운터 설정
function setupCharacterCounters() {
    const titleInput = document.getElementById('question-title');
    const contentInput = document.getElementById('question-content');
    const titleCount = document.getElementById('title-count');
    const contentCount = document.getElementById('content-count');
    
    if (titleInput && titleCount) {
        titleInput.addEventListener('input', () => {
            titleCount.textContent = titleInput.value.length;
            if (titleInput.value.length > 200) {
                titleCount.classList.add('text-red-500', 'font-bold');
            } else {
                titleCount.classList.remove('text-red-500', 'font-bold');
            }
        });
    }
    
    if (contentInput && contentCount) {
        contentInput.addEventListener('input', () => {
            contentCount.textContent = contentInput.value.length;
            if (contentInput.value.length > 5000) {
                contentCount.classList.add('text-red-500', 'font-bold');
            } else {
                contentCount.classList.remove('text-red-500', 'font-bold');
            }
        });
    }
}

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

    // 입력 검증
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

    // 제목 길이 검증 (보안 규칙과 일치)
    if (title.length > 200) {
        await Swal.fire({
            icon: 'warning',
            title: '제목 길이 초과',
            text: '제목은 200자 이하여야 합니다. (현재: ' + title.length + '자)',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
        });
        return;
    }

    // 내용 길이 검증 (보안 규칙과 일치)
    if (content.length > 5000) {
        await Swal.fire({
            icon: 'warning',
            title: '내용 길이 초과',
            text: '내용은 5000자 이하여야 합니다. (현재: ' + content.length + '자)',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
        });
        return;
    }

    try {
        const questionId = Date.now().toString();
        const newQuestion = {
            id: questionId,
            title: title,
            content: content,
            createdAt: new Date().toISOString(),
            answers: []
        };

        await saveQuestionToFirestore(newQuestion);
        renderQuestions();
        questionForm.reset();
        
        // 글자 수 카운터 리셋
        const titleCount = document.getElementById('title-count');
        const contentCount = document.getElementById('content-count');
        if (titleCount) titleCount.textContent = '0';
        if (contentCount) contentCount.textContent = '0';

        await Swal.fire({
            icon: 'success',
            title: '질문 등록 완료!',
            text: '질문이 성공적으로 등록되었습니다.',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인',
            timer: 2000,
            timerProgressBar: true
        });
    } catch (error) {
        console.error('질문 등록 오류:', error);
        let errorMessage = '질문 등록 중 오류가 발생했습니다.';
        
        // Firestore 오류 메시지 처리
        if (error.code === 'permission-denied') {
            errorMessage = '권한이 없습니다. Firestore 보안 규칙을 확인해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        await Swal.fire({
            icon: 'error',
            title: '등록 실패',
            text: errorMessage,
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
        });
    }
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
    // 답변 내용 길이 검증
    if (content.length > 5000) {
        await Swal.fire({
            icon: 'warning',
            title: '답변 길이 초과',
            text: '답변은 5000자 이하여야 합니다. (현재: ' + content.length + '자)',
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
        });
        return;
    }

    try {
        const newAnswer = {
            id: Date.now().toString(),
            content: content,
            createdAt: new Date().toISOString()
        };
        
        await saveAnswerToFirestore(questionId, newAnswer);
        
        // 답변 목록 업데이트
        const question = data.questions[currentSubject].find(q => q.id === questionId);
        if (question) {
            renderAnswers(question.answers || []);
        }
        
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
    } catch (error) {
        console.error('답변 등록 오류:', error);
        let errorMessage = '답변 등록 중 오류가 발생했습니다.';
        
        // Firestore 오류 메시지 처리
        if (error.code === 'permission-denied') {
            errorMessage = '권한이 없습니다. Firestore 보안 규칙을 확인해주세요.';
        } else if (error.message) {
            errorMessage = error.message;
        }
        
        await Swal.fire({
            icon: 'error',
            title: '등록 실패',
            text: errorMessage,
            confirmButtonColor: '#6366f1',
            confirmButtonText: '확인'
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
