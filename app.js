// ===========================
// SUPABASE CONFIG
// ===========================
const SUPABASE_URL = 'https://nsudwdzkyhkvssylmefe.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_fiQaSo72oxx9ylCnufJJAg_JdozGy22';

const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ===========================
// STATE
// ===========================
const DIFF_LABELS = {
  1: { label: '1 · Fàcil',  dot: '🟢' },
  2: { label: '2 · Normal', dot: '🟡' },
  3: { label: '3 · Difícil',dot: '🟠' },
  4: { label: '4 · Extrem', dot: '🔴' },
};

let cards      = [];
let sortCol    = null;
let sortDir    = 1;
let selectedDiff    = null;
let editDiff        = null;
let editingCardId   = null;
let examScore  = 0;
let currentExamCard = null;
let searchQuery = '';

// ===========================
// SYNC STATUS UI
// ===========================
function setStatus(state) {
  const el = document.getElementById('syncStatus');
  const map = {
    connecting: '⏳ Connectant...',
    ok:         '🟢 Connectat',
    saving:     '💾 Guardant...',
    error:      '🔴 Error de connexió',
  };
  el.textContent = map[state] || '';
  el.className = 'sync-status sync-' + state;
}

// ===========================
// LOAD CARDS FROM SUPABASE
// ===========================
async function loadCards() {
  setStatus('connecting');
  showLoading(true);

  const { data, error } = await db
    .from('cartes')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error carregant cartes:', error);
    setStatus('error');
    showLoading(false);
    return;
  }

  cards = data;
  setStatus('ok');
  showLoading(false);
  render();
}

function showLoading(show) {
  document.getElementById('loadingState').style.display = show ? 'block' : 'none';
  document.getElementById('wordsTable').style.display  = show ? 'none'  : '';
}

// ===========================
// REAL-TIME SUBSCRIPTION
// ===========================
function subscribeRealtime() {
  db.channel('cartes-changes')
    .on('postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'cartes' },
      (payload) => {
        // Avoid duplicates (from our own insert)
        if (!cards.find(c => c.id === payload.new.id)) {
          cards.push(payload.new);
          render();
        }
      }
    )
    .on('postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'cartes' },
      (payload) => {
        const idx = cards.findIndex(c => c.id === payload.new.id);
        if (idx !== -1) { cards[idx] = payload.new; render(); }
      }
    )
    .on('postgres_changes',
      { event: 'DELETE', schema: 'public', table: 'cartes' },
      (payload) => {
        cards = cards.filter(c => c.id !== payload.old.id);
        render();
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') setStatus('ok');
    });
}

// ===========================
// SAVE CARD TO SUPABASE
// ===========================
async function saveCardToDb(catala, argenti, dificultat) {
  setStatus('saving');
  const { data, error } = await db
    .from('cartes')
    .insert([{ catala, argenti, dificultat }])
    .select()
    .single();

  if (error) {
    console.error('Error guardant carta:', error);
    setStatus('error');
    return null;
  }

  setStatus('ok');
  return data;
}

// ===========================
// UPDATE CARD IN SUPABASE
// ===========================
async function updateCardInDb(id, catala, argenti, dificultat) {
  setStatus('saving');
  const { data, error } = await db
    .from('cartes')
    .update({ catala, argenti, dificultat })
    .eq('id', id)
    .select()
    .single();

  if (error) { console.error('Error editant carta:', error); setStatus('error'); return null; }
  setStatus('ok');
  return data;
}

// ===========================
// DELETE CARD FROM SUPABASE
// ===========================
async function deleteCardFromDb(id) {
  setStatus('saving');
  const { error } = await db.from('cartes').delete().eq('id', id);
  if (error) { console.error('Error esborrant carta:', error); setStatus('error'); return false; }
  setStatus('ok');
  return true;
}

// ===========================
// RENDER TABLE
// ===========================
function getFilteredSortedCards() {
  let result = [...cards];

  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    result = result.filter(
      c => c.catala.toLowerCase().includes(q) || c.argenti.toLowerCase().includes(q)
    );
  }

  if (sortCol) {
    result.sort((a, b) => {
      let av = a[sortCol];
      let bv = b[sortCol];
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return -1 * sortDir;
      if (av > bv) return  1 * sortDir;
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
      <td><button class="btn-edit" data-id="${card.id}" title="Editar carta">✏️</button></td>
    `;
    tbody.appendChild(tr);
  });

  tbody.querySelectorAll('.btn-edit').forEach(btn => {
    btn.addEventListener('click', () => openEditModal(btn.dataset.id));
  });
}

function renderStats() {
  document.getElementById('totalCards').textContent  = cards.length;
  document.getElementById('easyCards').textContent   = cards.filter(c => c.dificultat === 1).length;
  document.getElementById('medCards').textContent    = cards.filter(c => c.dificultat === 2).length;
  document.getElementById('hardCards').textContent   = cards.filter(c => c.dificultat === 3).length;
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
    if (sortCol === col) { sortDir *= -1; } else { sortCol = col; sortDir = 1; }

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
const addModal   = document.getElementById('addModal');
const formError  = document.getElementById('formError');
const saveCardBtn = document.getElementById('saveCardBtn');

document.getElementById('openAddBtn').addEventListener('click', openAddModal);
document.getElementById('closeAddBtn').addEventListener('click', closeAddModal);
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

document.getElementById('difficultySelector').addEventListener('click', e => {
  const btn = e.target.closest('.diff-btn');
  if (!btn) return;
  selectedDiff = parseInt(btn.dataset.val);
  document.querySelectorAll('.diff-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
});

saveCardBtn.addEventListener('click', async () => {
  const catala  = document.getElementById('inputCatala').value.trim();
  const argenti = document.getElementById('inputArgenti').value.trim();

  if (!catala)       { formError.textContent = '⚠️ Escriu la paraula en català.'; return; }
  if (!argenti)      { formError.textContent = '⚠️ Escriu la paraula en argentí.'; return; }
  if (!selectedDiff) { formError.textContent = '⚠️ Selecciona una dificultat.'; return; }

  formError.textContent = '';
  saveCardBtn.disabled = true;
  saveCardBtn.textContent = 'Guardant...';

  const newCard = await saveCardToDb(catala, argenti, selectedDiff);

  saveCardBtn.disabled = false;
  saveCardBtn.textContent = 'Guardar carta 💾';

  if (!newCard) {
    formError.textContent = '❌ Error guardant. Torna-ho a provar.';
    return;
  }

  // Add locally immediately (real-time will also fire but we deduplicate)
  if (!cards.find(c => c.id === newCard.id)) {
    cards.push(newCard);
    render();
  }

  closeAddModal();

  // Flash new row
  setTimeout(() => {
    const newRow = document.querySelector(`tr[data-id="${newCard.id}"]`);
    if (newRow) {
      newRow.style.background = 'var(--accent-light)';
      setTimeout(() => { newRow.style.background = ''; }, 900);
    }
  }, 50);
});

document.getElementById('inputCatala').addEventListener('keydown', e => {
  if (e.key === 'Enter') document.getElementById('inputArgenti').focus();
});
document.getElementById('inputArgenti').addEventListener('keydown', e => {
  if (e.key === 'Enter') saveCardBtn.click();
});

// ===========================
// EDIT CARD MODAL
// ===========================
const editModal      = document.getElementById('editModal');
const editFormError  = document.getElementById('editFormError');
const updateCardBtn  = document.getElementById('updateCardBtn');
const deleteCardBtn  = document.getElementById('deleteCardBtn');

document.getElementById('closeEditBtn').addEventListener('click', closeEditModal);
editModal.addEventListener('click', e => { if (e.target === editModal) closeEditModal(); });

function openEditModal(id) {
  const card = cards.find(c => c.id === id);
  if (!card) return;
  editingCardId = id;
  editDiff = card.dificultat;

  document.getElementById('editCatala').value  = card.catala;
  document.getElementById('editArgenti').value = card.argenti;
  editFormError.textContent = '';

  document.querySelectorAll('.edit-diff-btn').forEach(b => {
    b.classList.toggle('selected', parseInt(b.dataset.val) === editDiff);
  });

  editModal.classList.add('open');
  document.getElementById('editCatala').focus();
}

function closeEditModal() {
  editModal.classList.remove('open');
  editingCardId = null;
}

document.getElementById('editDifficultySelector').addEventListener('click', e => {
  const btn = e.target.closest('.edit-diff-btn');
  if (!btn) return;
  editDiff = parseInt(btn.dataset.val);
  document.querySelectorAll('.edit-diff-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
});

updateCardBtn.addEventListener('click', async () => {
  const catala  = document.getElementById('editCatala').value.trim();
  const argenti = document.getElementById('editArgenti').value.trim();

  if (!catala)   { editFormError.textContent = '⚠️ Escriu la paraula en català.'; return; }
  if (!argenti)  { editFormError.textContent = '⚠️ Escriu la paraula en argentí.'; return; }
  if (!editDiff) { editFormError.textContent = '⚠️ Selecciona una dificultat.'; return; }

  editFormError.textContent = '';
  updateCardBtn.disabled = true;
  updateCardBtn.textContent = 'Guardant...';

  const updated = await updateCardInDb(editingCardId, catala, argenti, editDiff);

  updateCardBtn.disabled = false;
  updateCardBtn.textContent = 'Guardar canvis 💾';

  if (!updated) { editFormError.textContent = '❌ Error guardant. Torna-ho a provar.'; return; }

  const idx = cards.findIndex(c => c.id === editingCardId);
  if (idx !== -1) { cards[idx] = updated; render(); }

  closeEditModal();
});

deleteCardBtn.addEventListener('click', async () => {
  if (!confirm('Segur que vols eliminar aquesta carta?')) return;

  deleteCardBtn.disabled = true;
  deleteCardBtn.textContent = 'Esborrant...';

  const ok = await deleteCardFromDb(editingCardId);

  deleteCardBtn.disabled = false;
  deleteCardBtn.textContent = '🗑 Eliminar carta';

  if (!ok) { editFormError.textContent = '❌ Error esborrant. Torna-ho a provar.'; return; }

  cards = cards.filter(c => c.id !== editingCardId);
  render();
  closeEditModal();
});

// ===========================
// EXAM MODAL
// ===========================
const examModal   = document.getElementById('examModal');
const revealBtn   = document.getElementById('revealBtn');
const correctBtn  = document.getElementById('correctBtn');
const wrongBtn    = document.getElementById('wrongBtn');
const answerReveal = document.getElementById('answerReveal');
const examEmpty   = document.getElementById('examEmpty');

document.getElementById('openExamBtn').addEventListener('click', openExamModal);
document.getElementById('closeExamBtn').addEventListener('click', closeExamModal);
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

  currentExamCard = cards[Math.floor(Math.random() * cards.length)];

  const showCatala = Math.random() < 0.5;
  document.getElementById('examLang').textContent = showCatala ? 'Català 🇪🇸' : 'Argentí 🇦🇷';
  document.getElementById('examWord').textContent  = showCatala ? currentExamCard.catala  : currentExamCard.argenti;
  document.getElementById('revealWord').textContent = showCatala ? currentExamCard.argenti : currentExamCard.catala;

  const diff = DIFF_LABELS[currentExamCard.dificultat];
  document.getElementById('examDiff').innerHTML =
    `<span class="diff-badge diff-${currentExamCard.dificultat}">${diff.dot} ${diff.label}</span>`;
}

revealBtn.addEventListener('click', () => {
  revealBtn.style.display = 'none';
  answerReveal.style.display = 'block';
});

correctBtn.addEventListener('click', () => { examScore += 1; updateExamScore(true);  loadNextExamCard(); });
wrongBtn.addEventListener('click',   () => { examScore -= 1; updateExamScore(false); loadNextExamCard(); });

function updateExamScore(correct) {
  const scoreEl = document.getElementById('examScore');
  scoreEl.textContent = examScore;

  if      (correct === true)  scoreEl.style.color = 'var(--green)';
  else if (correct === false) scoreEl.style.color = 'var(--red)';
  else                        scoreEl.style.color = 'var(--accent)';

  scoreEl.classList.remove('score-pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('score-pop');

  setTimeout(() => {
    if      (examScore > 0) scoreEl.style.color = 'var(--green)';
    else if (examScore < 0) scoreEl.style.color = 'var(--red)';
    else                    scoreEl.style.color = 'var(--accent)';
  }, 400);
}

// ===========================
// KEYBOARD SHORTCUTS
// ===========================
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { closeAddModal(); closeEditModal(); closeExamModal(); }
  if (examModal.classList.contains('open') && currentExamCard) {
    if (e.key === ' ' && revealBtn.style.display !== 'none') { e.preventDefault(); revealBtn.click(); }
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
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===========================
// INIT
// ===========================
loadCards();
subscribeRealtime();
