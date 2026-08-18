/* ── 配置 ─────────────────────────────────────── */
// 是否使用本地代理（解决 iframe 嵌入限制）
const USE_PROXY = false;
// 代理服务器地址（如果 USE_PROXY=true）
const PROXY_BASE = 'http://localhost:8080/proxy';

function resolveUrl(url) {
  if (!USE_PROXY || !url) return url;
  let cleanUrl = url.trim();
  if (!cleanUrl.startsWith('http')) {
    cleanUrl = 'https://' + cleanUrl;
  }
  return PROXY_BASE + cleanUrl;
}

/* ── Default Models ────────────────────────────── */
// openInNewWindow: true 表示强制在新窗口打开
const DEFAULT_MODELS = [
  { id: 'deepseek',   name: 'DeepSeek',   url: 'https://chat.deepseek.com',     icon: '🔍', openInNewWindow: false },
  { id: 'doubao',     name: '豆包',        url: 'https://www.doubao.com',        icon: '🫘', openInNewWindow: false },
  { id: 'glm',        name: 'GLM (智谱)',  url: 'https://chatglm.cn',            icon: '🧠', openInNewWindow: false },
  { id: 'kimi',       name: 'Kimi',        url: 'https://kimi.moonshot.cn',      icon: '🌙', openInNewWindow: false },
  { id: 'claude',     name: 'Claude',      url: 'https://claude.ai',             icon: '🟠', openInNewWindow: false },
  { id: 'gpt',        name: 'ChatGPT',     url: 'https://chatgpt.com',           icon: '💬', openInNewWindow: false },
  { id: 'gemini',     name: 'Gemini',      url: 'https://gemini.google.com',     icon: '🔷', openInNewWindow: false },
  { id: 'grok',       name: 'Grok',        url: 'https://grok.x.ai',             icon: '🤖', openInNewWindow: false },
  { id: 'minimax',    name: 'MiniMax',    url: 'https://agent.minimaxi.com/',    icon: '🎮', openInNewWindow: true },
  { id: 'qianwen',    name: '通义千问',   url: 'https://www.qianwen.com/',      icon: '🔮', openInNewWindow: true },
];

/* ── State ─────────────────────────────────────── */
let models = [];
let activeId = null;
let sidebarCollapsed = false;
let editingId = null;
let deletingId = null;
let currentActiveUrl = '';

/* ── DOM refs ──────────────────────────────────── */
const sidebar          = document.getElementById('sidebar');
const toggleBtn        = document.getElementById('toggleSidebar');
const navList          = document.getElementById('navList');
const searchInput      = document.getElementById('searchInput');
const modelCount       = document.getElementById('modelCount');
const iframe           = document.getElementById('contentFrame');
const emptyState       = document.getElementById('emptyState');
const modalOverlay     = document.getElementById('modalOverlay');
const modalTitle       = document.getElementById('modalTitle');
const confirmAddBtn    = document.getElementById('confirmAdd');
const openAddModal     = document.getElementById('openAddModal');
const closeModalBtn    = document.getElementById('closeModal');
const cancelAddBtn     = document.getElementById('cancelAdd');
const modelName        = document.getElementById('modelName');
const modelUrl         = document.getElementById('modelUrl');
const modelIcon        = document.getElementById('modelIcon');
const modelNewWindow   = document.getElementById('modelNewWindow');
const deleteModalOverlay = document.getElementById('deleteModalOverlay');
const deleteModelName  = document.getElementById('deleteModelName');
const closeDeleteBtn   = document.getElementById('closeDeleteModal');
const cancelDeleteBtn  = document.getElementById('cancelDelete');
const confirmDeleteBtn = document.getElementById('confirmDelete');
const proxyStatus      = document.getElementById('proxyStatus');
const iframeBlocked    = document.getElementById('iframeBlocked');
const openInNewTabBtn  = document.getElementById('openInNewTab');

/* ── Init ──────────────────────────────────────── */
function init() {
  const stored = localStorage.getItem('dsh_models');
  if (stored) {
    models = JSON.parse(stored);
    // 确保所有模型都有 openInNewWindow 属性
    models.forEach(m => {
      if (m.openInNewWindow === undefined) {
        const def = DEFAULT_MODELS.find(d => d.id === m.id);
        m.openInNewWindow = def ? def.openInNewWindow : false;
      }
    });
  } else {
    models = JSON.parse(JSON.stringify(DEFAULT_MODELS));
    save();
  }
  const storedCollapsed = localStorage.getItem('dsh_collapsed');
  if (storedCollapsed === 'true') toggleSidebar();
  
  const proxyEnabled = localStorage.getItem('dsh_proxy') === 'true';
  if (proxyEnabled !== USE_PROXY) {
    toggleProxy();
  }
  updateProxyStatus();
  
  render();
  bindEvents();
  
  // 默认打开第一个模型
  if (models.length > 0) {
    setTimeout(() => activateModel(models[0].id), 300);
  }
}

function save() {
  localStorage.setItem('dsh_models', JSON.stringify(models));
}

/* ── Render ────────────────────────────────────── */
function render(filter = '') {
  const q = filter.toLowerCase().trim();
  const filtered = q ? models.filter(m => m.name.toLowerCase().includes(q) || m.url.toLowerCase().includes(q)) : models;

  navList.innerHTML = '';

  const itemsEl = document.createElement('div');
  itemsEl.className = 'nav-group-items';
  itemsEl.style.maxHeight = filtered.length * 52 + 'px';

  filtered.forEach(m => {
    const item = document.createElement('div');
    item.className = 'nav-item' + (m.id === activeId ? ' active' : '');
    item.dataset.id = m.id;
    // 计算上下移动按钮的显示状态
    const index = filtered.indexOf(m);
    const canMoveUp = index > 0;
    const canMoveDown = index < filtered.length - 1;
    item.innerHTML = `
      <span class="icon">${escapeHtml(m.icon || '🤖')}</span>
      <span class="name">${escapeHtml(m.name)}</span>
      <div class="btn-group">
        <button class="move-up-btn${canMoveUp ? '' : ' disabled'}" title="上移" data-move-up="${m.id}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 10V2M3 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="move-down-btn${canMoveDown ? '' : ' disabled'}" title="下移" data-move-down="${m.id}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 2v8M3 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="edit-btn" title="编辑" data-edit="${m.id}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M8.5 2.5l1 1M2.5 8.5l-1 1h2l1-1M9.5 1.5c.6-.6 1.5-.6 2 0 .6.6.6 1.5 0 2L4.5 10.5l-3 1 1-3L9.5 1.5z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="open-btn" title="在新窗口打开" data-open="${m.id}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M9 3h2v2M9 1L5 5M4 10H2a1 1 0 01-1-1V3a1 1 0 011-1h3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <button class="delete-btn" title="删除" data-delete="${m.id}">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M3 3l6 6M9 3l-6 6M2.5 2h7M4.5 2V1.5h3V2M4 5v4M8 5v4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
    `;
    itemsEl.appendChild(item);
  });

  navList.appendChild(itemsEl);
  modelCount.textContent = `${models.length} 个模型`;
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

/* ── Activate model ────────────────────────────── */
function activateModel(id) {
  const m = models.find(m => m.id === id);
  if (!m) return;
  
  activeId = id;
  currentActiveUrl = m.url;
  render(searchInput.value);

  // 如果模型设置为强制新窗口打开
  if (m.openInNewWindow) {
    window.open(m.url, '_blank');
    return;
  }

  // 否则尝试 iframe
  emptyState.style.display = 'none';
  iframe.src = resolveUrl(m.url);
  iframe.classList.add('visible');
  iframeBlocked.style.display = 'none';
}

/* ── Show iframe blocked state ─────────────────── */
function showIframeBlocked() {
  iframeBlocked.style.display = 'flex';
}

/* ── Open model in new tab ─────────────────────── */
function openInNewTab(id) {
  const m = models.find(m => m.id === id);
  if (m) {
    window.open(m.url, '_blank');
  }
}

/* ── Open Edit Modal ───────────────────────────── */
function openEditModal(id) {
  const m = models.find(m => m.id === id);
  if (!m) return;
  editingId = id;
  modalTitle.textContent = '编辑模型';
  confirmAddBtn.textContent = '保存';
  modelName.value = m.name;
  modelUrl.value = m.url;
  modelIcon.value = m.icon || '';
  modelNewWindow.checked = m.openInNewWindow === true;
  modalOverlay.classList.add('open');
  setTimeout(() => modelName.focus(), 100);
}

/* ── Open Add Modal ────────────────────────────── */
function openAddModalFn() {
  editingId = null;
  modalTitle.textContent = '添加新模型';
  confirmAddBtn.textContent = '添加';
  modelName.value = '';
  modelUrl.value = '';
  modelIcon.value = '';
  modelNewWindow.checked = false;
  modalOverlay.classList.add('open');
  setTimeout(() => modelName.focus(), 100);
}

/* ── Close Modals ──────────────────────────────── */
function closeAllModals() {
  modalOverlay.classList.remove('open');
  deleteModalOverlay.classList.remove('open');
  editingId = null;
}

/* ── Save Model (Add or Edit) ──────────────────── */
function saveModel() {
  const name = modelName.value.trim();
  let url = modelUrl.value.trim();
  const icon = modelIcon.value.trim() || '🤖';
  const openInNewWindow = modelNewWindow.checked;

  if (!name || !url) return;
  if (!url.startsWith('http')) {
    url = 'https://' + url;
  }

  if (editingId) {
    const idx = models.findIndex(m => m.id === editingId);
    if (idx !== -1) {
      models[idx].name = name;
      models[idx].url = url;
      models[idx].icon = icon;
      models[idx].openInNewWindow = openInNewWindow;
    }
  } else {
    const id = 'custom_' + Date.now();
    models.push({ id, name, url, icon, openInNewWindow });
    if (openInNewWindow) {
      window.open(url, '_blank');
    } else {
      activateModel(id);
    }
  }

  save();
  render(searchInput.value);
  closeAllModals();
}

/* ── Open Delete Confirm ───────────────────────── */
function openDeleteModal(id) {
  const m = models.find(m => m.id === id);
  if (!m) return;
  deletingId = id;
  deleteModelName.textContent = m.name;
  deleteModalOverlay.classList.add('open');
}

/* ── Confirm Delete ────────────────────────────── */
function confirmDeleteModel() {
  if (!deletingId) return;
  models = models.filter(m => m.id !== deletingId);
  if (activeId === deletingId) {
    activeId = null;
    iframe.src = '';
    iframe.classList.remove('visible');
    emptyState.style.display = '';
    iframeBlocked.style.display = 'none';
  }
  save();
  render(searchInput.value);
  closeAllModals();
  deletingId = null;
}

/* ── Toggle sidebar ────────────────────────────── */
function toggleSidebar() {
  sidebarCollapsed = !sidebarCollapsed;
  sidebar.classList.toggle('collapsed', sidebarCollapsed);
  localStorage.setItem('dsh_collapsed', sidebarCollapsed);
}

/* ── Proxy mode ────────────────────────────────── */
function toggleProxy() {
  window.__USE_PROXY = !window.__USE_PROXY;
  localStorage.setItem('dsh_proxy', window.__USE_PROXY);
  updateProxyStatus();
}

function updateProxyStatus() {
  if (!proxyStatus) return;
  const enabled = window.__USE_PROXY || false;
  proxyStatus.textContent = enabled ? '代理: ON' : '代理: OFF';
  proxyStatus.classList.toggle('active', enabled);
  proxyStatus.title = enabled ? '点击关闭代理模式' : '点击开启代理模式（需先启动代理服务器）';
}

/* ── Move model up ─────────────────────────────── */
function moveModelUp(id) {
  const idx = models.findIndex(m => m.id === id);
  console.log('moveModelUp called for:', id, 'current idx:', idx);
  if (idx <= 0) {
    console.log('Cannot move up, already at top');
    return;
  }
  // 交换位置
  [models[idx - 1], models[idx]] = [models[idx], models[idx - 1]];
  console.log('Moved up, new order:', models.map(m => m.name));
  save();
  render(searchInput.value);
}

/* ── Move model down ───────────────────────────── */
function moveModelDown(id) {
  const idx = models.findIndex(m => m.id === id);
  console.log('moveModelDown called for:', id, 'current idx:', idx, 'length:', models.length);
  if (idx < 0 || idx >= models.length - 1) {
    console.log('Cannot move down');
    return;
  }
  // 交换位置
  [models[idx], models[idx + 1]] = [models[idx + 1], models[idx]];
  console.log('Moved down, new order:', models.map(m => m.name));
  save();
  render(searchInput.value);
}

/* ── Events ────────────────────────────────────── */
function bindEvents() {
  toggleBtn.addEventListener('click', toggleSidebar);
  if (proxyStatus) {
    proxyStatus.addEventListener('click', toggleProxy);
  }

  navList.addEventListener('click', e => {
    console.log('Click event:', e.target.tagName, e.target.className, 'dataset:', e.target.dataset);
    
    const moveUpBtn = e.target.closest('[data-move-up]');
    console.log('moveUpBtn found:', moveUpBtn);
    if (moveUpBtn) {
      e.stopPropagation();
      console.log('Moving up:', moveUpBtn.dataset.moveUp);
      moveModelUp(moveUpBtn.dataset.moveUp);
      return;
    }
    const moveDownBtn = e.target.closest('[data-move-down]');
    console.log('moveDownBtn found:', moveDownBtn);
    if (moveDownBtn) {
      e.stopPropagation();
      console.log('Moving down:', moveDownBtn.dataset.moveDown);
      moveModelDown(moveDownBtn.dataset.moveDown);
      return;
    }
    const editBtn = e.target.closest('[data-edit]');
    if (editBtn) {
      e.stopPropagation();
      openEditModal(editBtn.dataset.edit);
      return;
    }
    const openBtn = e.target.closest('[data-open]');
    if (openBtn) {
      e.stopPropagation();
      openInNewTab(openBtn.dataset.open);
      return;
    }
    const deleteBtn = e.target.closest('[data-delete]');
    if (deleteBtn) {
      e.stopPropagation();
      openDeleteModal(deleteBtn.dataset.delete);
      return;
    }
    const item = e.target.closest('.nav-item');
    if (item) activateModel(item.dataset.id);
  });

  searchInput.addEventListener('input', e => render(e.target.value));

  openAddModal.addEventListener('click', openAddModalFn);
  closeModalBtn.addEventListener('click', closeAllModals);
  cancelAddBtn.addEventListener('click', closeAllModals);
  confirmAddBtn.addEventListener('click', saveModel);

  closeDeleteBtn.addEventListener('click', closeAllModals);
  cancelDeleteBtn.addEventListener('click', closeAllModals);
  confirmDeleteBtn.addEventListener('click', confirmDeleteModel);

  modalOverlay.addEventListener('click', e => {
    if (e.target === modalOverlay) closeAllModals();
  });
  deleteModalOverlay.addEventListener('click', e => {
    if (e.target === deleteModalOverlay) closeAllModals();
  });

  if (openInNewTabBtn) {
    openInNewTabBtn.addEventListener('click', () => {
      if (currentActiveUrl) {
        window.open(currentActiveUrl, '_blank');
      }
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeAllModals();
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
    }
  });

  [modelName, modelUrl, modelIcon].forEach(el => {
    el.addEventListener('keydown', e => {
      if (e.key === 'Enter') saveModel();
    });
  });
}

/* ── Start ─────────────────────────────────────── */
window.__USE_PROXY = false;
init();
