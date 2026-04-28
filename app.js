// ===========================
// DATA & STATE
// ===========================
const STORAGE_KEY = 'catala_workbook_cards';

const DIFF_LABELS = {
  1: { label: '1 · Fàcil', dot: '🟢' },
  2: { label: '2 · Normal', dot: '🟡' },
  3: { label: '3 · Difícil', dot: '🟠' },
  4: { label: '4 · Extrem', dot: '🔴' },
};

let cards = [];
let sortCol = null;
let sortDir = 1; // 1 = asc, -1 = desc
let selectedDiff = null;
let examScore = 0;
let currentExamCard = null;
let searchQuery = '';

// ===========================
// PERSISTENCE
// ===========================
function loadCards() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    cards = raw ? JSON.parse(raw) : getDefaultCards();
  } catch {
    cards = getDefaultCards();
  }
  saveCards();
}

function saveCards() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cards));
}

function getDefaultCards() {
  return [
    { id: uid(), catala: 'gràcies', argenti: 'gracias', dificultat: 1 },
    { id: uid(), catala: 'bon dia', argenti: 'buen día', dificultat: 1 },
    { id: uid(), catala: 'adéu', argenti: 'chau', dificultat: 1 },
    { id: uid(), catala: 'maco/maca', argenti: 'lindo/linda', dificultat: 2 },
    { id: uid(), catala: 'ara', argenti: 'ahora', dificultat: 1 },
    { id: uid(), catala: 'sempre', argenti: 'siempre', dificultat: 2 },
    { id: uid(), catala: 'treballar', argenti: 'trabajar', dificultat: 3 },
    { id: uid(), catala: 'enyorança', argenti: 'nostalgia profunda', dificultat: 4 },
  ];
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ===========================
// RENDER TABLE
// ===========================
function getFilteredSortedCards() {
  let result = [...cards];

  // Filter by search
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      c => c.catala.toLowerCase().includes(q) || c.argenti.toLowerCase().includes(q)
    );
  }

  // Sort
  if (sortCol) {
    result.sort((a, b) => {
      let av = a[sortCol];
      let bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return 1 * sortDir;
      return 0;
    });
  }

  return result;
}

function renderTable() {
  const tbody = document.getElementById('wordsBody');
  const emptyState = document.getElementById('emptyState');
  const data = getFilteredSortedCards();

  tbody.innerHTML = '';

  if (data.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  emptyState.style.display = 'none';

  data.forEach(card => {
    const tr = document.createElement('tr');
    tr.dataset.id = card.id;

    const diff = DIFF_LABELS[card.dificultat];

    tr.innerHTML = `
      <td class="td-catala">${escHtml(card.catala)}</td>
      <td class="td-argenti">${escHtml(card.argenti)}</td>
      <td><span class="diff-badge diff-${card.dificultat}">${diff.dot} ${diff.label}</span></td>
      <td><button class="btn-delete" data-id="${card.id}" title="Eliminar">🗑</button></td>
    `;

    tbody.appendChild(tr);
  });

  // Delete buttons
  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', () => deleteCard(btn.dataset.id));
  });
}

function renderStats() {
  document.getElementById('totalCards').textContent = cards.length;
  document.getElementById('easyCards').textContent = cards.filter(c => c.dificultat === 1).length;
  document.getElementById('medCards').textContent = cards.filter(c => c.dificultat === 2).length;
  document.getElementById('hardCards').textContent = cards.filter(c => c.dificultat === 3).length;
  document.getElementById('extremCards').textContent = cards.filter(c => c.dificultat === 4).length;
}

function render() {
  renderTable();
  renderStats();
}

// ===========================
// SORT
// ===========================
document.querySelectorAll('th.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if (sortCol === col) {
      sortDir *= -1;
    } else {
      sortCol = col;
      sortDir = 1;
    }

    // Update icons
    document.querySelectorAll('th.sortable').forEach(t => {
      t.classList.remove('active');
      t.querySelector('.sort-icon').textContent = '↕';
    });
    th.classList.add('active');
    th.querySelector('.sort-icon').textContent = sortDir === 1 ? '↑' : '↓';

    renderTable();
  });
});

// ===========================
// SEARCH
// ===========================
document.getElementById('searchInput').addEventListener('input', e => {
  searchQuery = e.target.value.trim();
  renderTable();
});

// ===========================
// ADD CARD MODAL
// ===========================
const addModal = document.getElementById('addModal');
const openAddBtn = document.getElementById('openAddBtn');
const closeAddBtn = document.getElementById('closeAddBtn');
const saveCardBtn = document.getElementById('saveCardBtn');
const formError = document.getElementById('formError');

openAddBtn.addEventListener('click', openAddModal);
closeAddBtn.addEventListener('click', closeAddModal);
addModal.addEventListener('click', e => { if (e.target === addModal) closeAddModal(); });

function openAddModal() {
  addModal.classList.add('open');
  selectedDiff = null;
  document.getElementById('inputCatala').value = '';
  document.getElementById('inputArgenti').value = '';
  formError.textContent = '';
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('inputCatala').focus();
}

function closeAddModal() {
  addModal.classList.remove('open');
}

// Difficulty selector
document.getElementById('difficultySelector').addEventListener('click', e => {
  const btn = e.target.closest('.diff-btn');
  if (!btn) return;
  selectedDiff = parseInt(btn.dataset.val);
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
});

saveCardBtn.addEventListener('click', () => {
  const catala = document.getElementById('inputCatala').value.trim();
  const argenti = document.getElementById('inputArgenti').value.trim();

  if (!catala) { formError.textContent = '⚠️ Escriu la paraula en català.'; return; }
  if (!argenti) { formError.textContent = '⚠️ Escriu la paraula en argentí.'; return; }
  if (!selectedDiff) { formError.textContent = '⚠️ Selecciona una dificultat.'; return; }

  formError.textContent = '';

  const newCard = { id: uid(), catala, argenti, dificultat: selectedDiff };
  cards.push(newCard);
  saveCards();
  render();
  closeAddModal();

  // Flash new row
  setTimeout(() => {
    const newRow = document.querySelector(`tr[data-id="${newCard.id}"]`);
    if (newRow) {
      newRow.style.background = 'var(--accent-light)';
      setTimeout(() => { newRow.style.background = ''; }, 800);
    }
  }, 50);
});

// Enter key in inputs
document.getElementById('inputCatala').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('inputArgenti').focus();
});
document.getElementById('inputArgenti').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveCardBtn.click();
});

// ===========================
// DELETE CARD
// ===========================
function deleteCard(id) {
  if (!confirm('Eliminar aquesta carta?')) return;
  cards = cards.filter(c => c.id !== id);
  saveCards();
  render();
}

// ===========================
// EXAM MODAL
// ===========================
const examModal = document.getElementById('examModal');
const openExamBtn = document.getElementById('openExamBtn');
const closeExamBtn = document.getElementById('closeExamBtn');
const revealBtn = document.getElementById('revealBtn');
const correctBtn = document.getElementById('correctBtn');
const wrongBtn = document.getElementById('wrongBtn');
const answerReveal = document.getElementById('answerReveal');
const examEmpty = document.getElementById('examEmpty');

openExamBtn.addEventListener('click', openExamModal);
closeExamBtn.addEventListener('click', closeExamModal);
examModal.addEventListener('click', e => { if (e.target === examModal) closeExamModal(); });

function openExamModal() {
  examScore = 0;
  updateExamScore();
  examModal.classList.add('open');
  loadNextExamCard();
}

function closeExamModal() {
  examModal.classList.remove('open');
}

function loadNextExamCard() {
  answerReveal.style.display = 'none';
  revealBtn.style.display = 'block';

  if (cards.length === 0) {
    document.getElementById('examCard').style.display = 'none';
    revealBtn.style.display = 'none';
    examEmpty.style.display = 'block';
    return;
  }

  examEmpty.style.display = 'none';
  document.getElementById('examCard').style.display = 'block';

  // Pick random card
  currentExamCard = cards[Math.floor(Math.random() * cards.length)];

  // Pick random direction (show catala or argenti)
  const showCatala = Math.random() < 0.5;
  const shownLang = showCatala ? 'Català 🇪🇸' : 'Argentí 🇦🇷';
  const shownWord = showCatala ? currentExamCard.catala : currentExamCard.argenti;
  const hiddenWord = showCatala ? currentExamCard.argenti : currentExamCard.catala;

  document.getElementById('examLang').textContent = shownLang;
  document.getElementById('examWord').textContent = shownWord;
  document.getElementById('revealWord').textContent = hiddenWord;

  const diff = DIFF_LABELS[currentExamCard.dificultat];
  document.getElementById('examDiff').innerHTML = `<span class="diff-badge diff-${currentExamCard.dificultat}">${diff.dot} ${diff.label}</span>`;
}

revealBtn.addEventListener('click', () => {
  revealBtn.style.display = 'none';
  answerReveal.style.display = 'block';
});

correctBtn.addEventListener('click', () => {
  examScore += 1;
  updateExamScore(true);
  loadNextExamCard();
});

wrongBtn.addEventListener('click', () => {
  examScore -= 1;
  updateExamScore(false);
  loadNextExamCard();
});

function updateExamScore(correct) {
  const scoreEl = document.getElementById('examScore');
  scoreEl.textContent = examScore;

  if (correct === true) {
    scoreEl.style.color = 'var(--green)';
  } else if (correct === false) {
    scoreEl.style.color = 'var(--red)';
  } else {
    scoreEl.style.color = 'var(--accent)';
  }

  scoreEl.classList.remove('score-pop');
  void scoreEl.offsetWidth; // reflow
  scoreEl.classList.add('score-pop');

  setTimeout(() => {
    if (examScore > 0) scoreEl.style.color = 'var(--green)';
    else if (examScore < 0) scoreEl.style.color = 'var(--red)';
    else scoreEl.style.color = 'var(--accent)';
  }, 400);
}

// ===========================
// KEYBOARD SHORTCUTS
// ===========================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeAddModal();
    closeExamModal();
  }
  // Exam shortcuts
  if (examModal.classList.contains('open') && currentExamCard) {
    if (e.key === ' ' && revealBtn.style.display !== 'none') {
      e.preventDefault();
      revealBtn.click();
    }
    if (answerReveal.style.display !== 'none') {
      if (e.key === 'ArrowRight' || e.key === 'Enter') correctBtn.click();
      if (e.key === 'ArrowLeft') wrongBtn.click();
    }
  }
});

// ===========================
// UTILS
// ===========================
function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ===========================
// INIT
// ===========================
loadCards();
render();
