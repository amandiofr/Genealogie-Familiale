// ══════════════════════════════════════════════════════════════
//  RÉACTIONS — barre d'emojis sur anecdotes, événements, trésors, recettes
// ══════════════════════════════════════════════════════════════

const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
const _normEmoji = e => e.replace(/\uFE0F/g, '');

let _reactPickerEl = null;
let _reactPickerBtn = null;

function _closeReactPicker() {
  _reactPickerEl?.remove();
  _reactPickerEl = null;
  _reactPickerBtn?.classList.remove('active');
  _reactPickerBtn = null;
}

function openReactPicker(btn, source, id, myReaction) {
  event.stopPropagation();
  if (_reactPickerBtn === btn) { _closeReactPicker(); return; }
  _closeReactPicker();
  _reactPickerBtn = btn;
  btn.classList.add('active');

  const picker = document.createElement('div');
  picker.className = 'react-picker';
  picker.innerHTML = REACTION_EMOJIS.map(emoji => {
    const isMine = _normEmoji(emoji) === _normEmoji(myReaction || '');
    return `<button class="react-picker-btn${isMine ? ' react-mine' : ''}"
      onclick="event.stopPropagation();_closeReactPicker();toggleReactionEmoji('${source}',${id},'${encodeHTML(emoji)}',${isMine})"
    >${emoji}</button>`;
  }).join('');
  document.body.appendChild(picker);
  _reactPickerEl = picker;

  const rect = btn.getBoundingClientRect();
  picker.style.left = (rect.left + rect.width / 2 - picker.offsetWidth / 2) + 'px';
  picker.style.top  = (rect.top - picker.offsetHeight - 6) + 'px';

  // Fermer si clic ailleurs
  setTimeout(() => document.addEventListener('click', _closeReactPicker, { once: true }), 0);
}

async function toggleReactionEmoji(source, id, emoji, wasMine) {
  // Trouver le conteneur à rafraîchir
  const containerId = `react-${source}-${id}`;
  const el = document.getElementById(containerId) ||
             document.getElementById(`react-${source}-detail-${id}`);
  const targetId = el?.id;
  if (!targetId) return;
  const compact = !targetId.includes('-detail-');
  try {
    if (wasMine) {
      await api('DELETE', `api/reactions.php?source=${source}&id=${id}`);
    } else {
      await api('POST', 'api/reactions.php', { source, source_id: id, emoji: _normEmoji(emoji) });
    }
    await loadReactions(source, id, targetId, compact);
  } catch(e) { toast(e.message, 'error'); }
}

async function loadReactions(source, id, containerId, compact = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  // Si aucun prénom sélectionné, ne pas afficher la barre
  if (!authorName) { el.innerHTML = ''; return; }
  // Nettoyer tout tooltip orphelin avant de remplacer le contenu
  document.querySelectorAll('.react-tooltip').forEach(t => t.remove());
  let data = [];
  try {
    data = await api('GET', `api/reactions.php?source=${source}&id=${id}`);
  } catch {}
  el.innerHTML = _renderReactionBar(source, id, data, compact);
  _bindReactionTooltips(el);
}

// compact=true : carte liste (seulement les emojis existants + bouton picker)
// compact=false : fiche détail (tous les emojis toujours visibles)
function _renderReactionBar(source, id, data, compact) {
  const byEmoji = {};
  data.forEach(r => { byEmoji[_normEmoji(r.emoji)] = r; });
  const myReaction = data.find(r => r.mine);

  if (compact) {
    const myReaction = data.find(r => r.mine)?.emoji || '';
    const existing = REACTION_EMOJIS
      .filter(emoji => byEmoji[_normEmoji(emoji)])
      .map(emoji => {
        const r = byEmoji[_normEmoji(emoji)];
        return `<button class="react-btn${r.mine ? ' react-mine' : ''}"
          data-source="${source}" data-id="${id}" data-emoji="${encodeHTML(emoji)}"
          data-tooltip="${encodeHTML(r.users.join(', '))}"
          onclick="event.stopPropagation();toggleReaction('${source}',${id},this)"
        >${emoji}<span class="react-count">${r.count}</span></button>`;
      }).join('');

    const addBtn = `<button class="react-add-btn"
      onclick="openReactPicker(this,'${source}',${id},'${encodeHTML(myReaction)}')"
    ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>`;

    return `<div class="react-bar">${existing}${addBtn}</div>`;
  } else {
    // Fiche détail : réactions existantes + bouton 🙂
    const myReaction = data.find(r => r.mine)?.emoji || '';
    const existing = REACTION_EMOJIS
      .filter(emoji => byEmoji[_normEmoji(emoji)])
      .map(emoji => {
        const r = byEmoji[_normEmoji(emoji)];
        return `<button class="react-btn${r.mine ? ' react-mine' : ''}"
          data-source="${source}" data-id="${id}" data-emoji="${encodeHTML(emoji)}"
          data-tooltip="${encodeHTML(r.users.join(', '))}"
          onclick="event.stopPropagation();toggleReaction('${source}',${id},this)"
        >${emoji}<span class="react-count">${r.count}</span></button>`;
      }).join('');
    const addBtn = `<button class="react-add-btn"
      onclick="event.stopPropagation();openReactPicker(this,'${source}',${id},'${encodeHTML(myReaction)}')"
    ><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg></button>`;
    return `<div class="react-bar">${existing}${addBtn}</div>`;
  }
}

async function toggleReaction(source, id, btn) {
  const wasMine = btn.classList.contains('react-mine');
  const emoji   = btn.getAttribute('data-emoji');
  const containerId = btn.closest('.react-bar')?.parentElement?.id;
  if (!containerId) return;
  try {
    if (wasMine) {
      await api('DELETE', `api/reactions.php?source=${source}&id=${id}`);
    } else {
      await api('POST', 'api/reactions.php', { source, source_id: id, emoji: _normEmoji(emoji) });
    }
    await loadReactions(source, id, containerId, false);
  } catch(e) { toast(e.message, 'error'); }
}

function _bindReactionTooltips(container) {
  container.querySelectorAll('.react-btn[data-tooltip]').forEach(btn => {
    const tip = btn.getAttribute('data-tooltip');
    if (!tip) return;
    let tooltipEl = null;
    function showTip() {
      if (tooltipEl) return;
      tooltipEl = document.createElement('div');
      tooltipEl.className = 'react-tooltip';
      tooltipEl.textContent = tip;
      tooltipEl.style.visibility = 'hidden';
      document.body.appendChild(tooltipEl);
      requestAnimationFrame(() => {
        if (!tooltipEl) return;
        const rect = btn.getBoundingClientRect();
        tooltipEl.style.left = (rect.left + rect.width / 2 - tooltipEl.offsetWidth / 2) + 'px';
        tooltipEl.style.top  = (rect.top - tooltipEl.offsetHeight - 6) + 'px';
        tooltipEl.style.visibility = 'visible';
      });
    }
    function hideTip() { tooltipEl?.remove(); tooltipEl = null; }
    btn.addEventListener('mouseenter', showTip);
    btn.addEventListener('mouseleave', hideTip);
    let longPress;
    btn.addEventListener('touchstart', () => { longPress = setTimeout(showTip, 500); }, { passive: true });
    btn.addEventListener('touchend',   () => { clearTimeout(longPress); setTimeout(hideTip, 1500); }, { passive: true });
  });
}
