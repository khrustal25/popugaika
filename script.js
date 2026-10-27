(() => {
  const STORAGE_SPECIES = 'popugaika-selected-species'
  const STORAGE_BEGINNER = 'popugaika-beginner-progress'
  const STORAGE_CHAT = 'popugaika-chat-history'
  const STORAGE_TRAINING = 'popugaika-training-progress'

  const app = document.getElementById('app')
  const selectedBar = document.getElementById('selected-bar')

  const TITLE_FORMS = {
    budgie: 'волнистом попугае',
    cockatiel: 'корелле',
    lovebird: 'неразлучнике',
    ringneck: 'ожереловом попугае',
    'african-grey': 'жако',
    macaw: 'ара',
    cockatoo: 'какаду',
    amazon: 'амазоне',
    conure: 'пирруре',
    rosella: 'розелле',
    quaker: 'квакере',
    eclectus: 'эклектусе',
  }

  const STATUS_LABEL = {
    safe: 'Можно',
    caution: 'С осторожностью',
    unsafe: 'Нельзя',
    unknown: 'Информация уточняется',
  }

  function loadJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key)
      if (raw == null || raw === '') return fallback
      const parsed = JSON.parse(raw)
      return parsed === undefined ? fallback : parsed
    } catch {
      try {
        localStorage.removeItem(key)
      } catch {
        /* ignore */
      }
      return fallback
    }
  }

  function saveJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      /* ignore quota / private mode */
    }
  }

  function getSelectedId() {
    const id = loadJSON(STORAGE_SPECIES, null)
    if (id == null || id === '') return null
    if (typeof id !== 'string') {
      saveJSON(STORAGE_SPECIES, null)
      return null
    }
    if (window.getSpecies && !window.getSpecies(id)) {
      saveJSON(STORAGE_SPECIES, null)
      return null
    }
    return id
  }

  function setSelectedId(id) {
    saveJSON(STORAGE_SPECIES, id)
    updateSelectedBar()
    updateNavActive()
  }

  function getSelected() {
    const id = getSelectedId()
    return id && window.getSpecies ? window.getSpecies(id) : null
  }

  function escapeHtml(str) {
    return String(str)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
  }

  function badge(status) {
    return `<span class="badge badge-${status}">${STATUS_LABEL[status] || STATUS_LABEL.unknown}</span>`
  }

  function softBadge(text, tone = 'mint') {
    return `<span class="badge badge-${tone}">${escapeHtml(text)}</span>`
  }

  function banner(html, tone = 'mint') {
    return `<div class="banner banner-${tone}">${html}</div>`
  }

  /** Родительский раздел для кнопки «← Назад» (предсказуемее, чем history.back) */
  function getParentHash() {
    const { parts } = parseRoute()
    if (!parts.length) return '#/'
    const [a, b, c] = parts
    if (a === 'species') return '#/catalog'
    if (a === 'nutrition' && b) return '#/nutrition'
    if (a === 'care' && b) return '#/care'
    if (a === 'behavior' && b) return '#/behavior'
    if (a === 'training' && b === 'mistakes' && c) return '#/training/mistakes'
    if (a === 'training' && b === 'body' && c) return '#/training/body'
    if (a === 'training' && b) return '#/training'
    if (a === 'health' && b === 'symptoms' && c) return '#/health/symptoms'
    if (a === 'health' && b === 'safety' && c) return '#/health/safety'
    if (a === 'health' && b) return '#/health'
    if (a === 'catalog' || a === 'my-bird' || a === 'guide' || a === 'beginner' || a === 'chat') return '#/'
    if (a === 'nutrition' || a === 'care' || a === 'behavior' || a === 'health' || a === 'training') return '#/guide'
    return '#/'
  }

  function pageHeader(title, subtitle, actionsHtml = '') {
    return `
      <div class="page-header">
        <div class="header-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="back">← Назад</button>
          <a class="btn btn-ghost btn-sm" href="#/" data-link>На главную</a>
          ${actionsHtml}
        </div>
        <div class="page-header-copy">
          <h1>${title}</h1>
          ${subtitle ? `<p>${subtitle}</p>` : ''}
        </div>
      </div>`
  }

  function imgTag(src, alt, className = '', options = {}) {
    const classes = [className, options.speciesId ? `parrot-photo parrot-photo--${options.speciesId}` : '']
      .filter(Boolean)
      .join(' ')
    const styles = []
    if (options.objectPosition) styles.push(`object-position:${options.objectPosition}`)
    if (options.objectFit) styles.push(`object-fit:${options.objectFit}`)
    const style = styles.length ? ` style="${styles.join(';')}"` : ''
    const loading = options.eager ? 'eager' : 'lazy'
    const fetchPriority = options.eager ? ' fetchpriority="high"' : ''
    return `<img src="${src}" alt="${escapeHtml(alt)}" loading="${loading}" decoding="async"${fetchPriority} class="${classes}"${style} onerror="this.onerror=null;this.src='images/favicon.svg';this.style.objectFit='contain';this.style.padding='2rem';this.style.background='linear-gradient(135deg,#DDF7E8,#c8efd8)'" />`
  }

  function speciesPhoto(species, className = '') {
    if (!species) return ''
    return imgTag(species.image, species.imageAlt || species.name, className, {
      speciesId: species.id,
      objectPosition: species.imagePosition || undefined,
      objectFit: species.imageFit || undefined,
    })
  }

  function emojiIcon(emoji, label = '', tone = 'mint') {
    return `
      <div class="emoji-icon emoji-icon-${tone}" aria-hidden="true">
        <span class="emoji-icon-glyph">${emoji || '🦜'}</span>
        ${label ? `<span class="emoji-icon-label">${escapeHtml(label)}</span>` : ''}
      </div>`
  }

  function parseRoute() {
    const raw = location.hash.replace(/^#/, '') || '/'
    const withoutQuery = raw.split('?')[0]
    const clean = withoutQuery.startsWith('/') ? withoutQuery : `/${withoutQuery}`
    const parts = clean.split('/').filter(Boolean)
    return { path: clean === '/' ? '/' : `/${parts.join('/')}`, parts }
  }

  function navigate(to) {
    if (!to.startsWith('#')) to = `#${to.startsWith('/') ? to : `/${to}`}`
    if (location.hash === to) render()
    else location.hash = to
  }

  function updateSelectedBar() {
    const selected = getSelected()
    if (!selected) {
      selectedBar.hidden = true
      selectedBar.textContent = ''
      return
    }
    selectedBar.hidden = false
    selectedBar.innerHTML = `Сейчас выбран вид: <strong>${escapeHtml(selected.name)}</strong>`
  }

  function updateNavActive() {
    const { parts } = parseRoute()
    const section = parts[0] || 'home'
    const map = {
      home: 'home',
      catalog: 'home',
      species: 'my-bird',
      'my-bird': 'my-bird',
      nutrition: 'nutrition',
      chat: 'chat',
      guide: 'guide',
      care: 'guide',
      behavior: 'guide',
      health: 'guide',
      training: 'guide',
      beginner: 'home',
    }
    const active = map[section] || 'home'
    document.querySelectorAll('[data-nav]').forEach((el) => {
      el.classList.toggle('active', el.getAttribute('data-nav') === active)
    })
  }

  /* ---------- Views ---------- */

  function renderHome() {
    const selected = getSelected()
    const cards = window.SPECIES.map(
      (s) => `
      <article class="card species-card" data-select-species="${s.id}">
        ${speciesPhoto(s)}
        <div class="body">
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
          <button type="button" class="btn btn-secondary btn-block btn-sm mt-2" data-select-species="${s.id}">Подробнее</button>
        </div>
      </article>`,
    ).join('')

    return `
      <section class="hero">
        <div>
          <div class="hero-badge"><span>🦜</span> Попугайка</div>
          <h1>Твой попугай заслуживает лучшего!</h1>
          <p>Узнай всё о питании, уходе и поведении своего пернатого друга</p>
          <div class="hero-actions">
            <a class="btn btn-sun" href="#/catalog" data-link>Выбрать попугая →</a>
            <a class="btn btn-ghost" href="#/beginner" data-link>Я только завёл попугая! 🐣</a>
          </div>
          ${
            selected
              ? `<p style="margin-top:1rem;opacity:.9">Сейчас выбран: <a href="#/species/${selected.id}" data-link><strong>${escapeHtml(selected.name)}</strong></a></p>`
              : ''
          }
        </div>
        <div class="hero-photo">${imgTag('images/parrots/hero.jpg', 'Яркий сине-жёлтый ара', 'parrot-photo parrot-photo--hero', { eager: true, objectPosition: '50% 24%' })}</div>
      </section>

      <div class="section-title">
        <div>
          <h2>Кто живёт у тебя дома?</h2>
          <p>Выбери вид — и справочник подстроится под твою птицу</p>
        </div>
        <a class="btn btn-ghost hide-mobile" href="#/catalog" data-link>Весь каталог</a>
      </div>
      <div class="grid-3">${cards}</div>`
  }

  function renderCatalog() {
    const cards = window.SPECIES.map(
      (s) => `
      <article class="card species-card" data-select-species="${s.id}">
        ${speciesPhoto(s)}
        <div class="body">
          <h3>${escapeHtml(s.name)}</h3>
          <p>${escapeHtml(s.description)}</p>
          <button type="button" class="btn btn-secondary btn-block btn-sm mt-2" data-select-species="${s.id}">Подробнее</button>
        </div>
      </article>`,
    ).join('')

    return `
      ${pageHeader('Каталог попугаев', 'Выбери вид, чтобы получать подсказки именно для своей птицы')}
      <div class="grid-3">${cards}</div>`
  }

  function renderSpecies(id) {
    const species = window.getSpecies(id)
    if (!species) return renderNotFound()
    setSelectedId(species.id)

    const sections = [
      { href: '#/nutrition', title: 'Питание', emoji: '🥦', desc: 'Что можно и нельзя' },
      { href: '#/care', title: 'Уход и содержание', emoji: '🏡', desc: 'Клетка, сон, гигиена' },
      { href: '#/behavior', title: 'Поведение', emoji: '🦜', desc: 'Почему так делает' },
      { href: '#/health', title: 'Здоровье', emoji: '❤️', desc: 'На что обратить внимание' },
      { href: '#/training', title: 'Приручение', emoji: '🧠', desc: 'Давай дружить!' },
      { href: '#/nutrition?category=branches', title: 'Безопасные растения и ветки', emoji: '🌿', desc: 'Что можно грызть' },
      { href: '#/chat', title: 'Перышко 🪶', emoji: '🪶', desc: 'Умный помощник по уходу' },
    ]

    return `
      ${pageHeader(
        `Всё о ${TITLE_FORMS[species.id] || species.name}`,
        species.description,
        `<a class="btn btn-ghost btn-sm" href="#/catalog" data-link>Сменить попугая</a>`,
      )}
      <div class="grid-2 mb-2">
        <div class="detail-hero">${speciesPhoto(species)}</div>
        <div class="card panel">
          <h2 style="margin:0;font-family:var(--font-display)">${escapeHtml(species.name)}</h2>
          <div class="species-meta">
            ${softBadge(`Размер: ${species.size}`)}
            ${softBadge(`Живёт: ${species.lifespan}`, 'sun')}
            ${softBadge(`Шум: ${species.noiseLevel}`, 'orange')}
          </div>
          <ul>${species.features.map((f) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
          <p class="muted tiny">Выбранный вид сохраняется на этом устройстве.</p>
        </div>
      </div>
      <div class="stack">
        ${sections
          .map(
            (s) => `
          <a class="card feature-link" href="${s.href}" data-link>
            <div class="topic-ico">${s.emoji}</div>
            <div>
              <strong style="font-family:var(--font-display);font-size:1.1rem">${s.title}</strong>
              <div class="muted tiny">${s.desc}</div>
            </div>
          </a>`,
          )
          .join('')}
      </div>`
  }

  function renderMyBird() {
    const selected = getSelected()
    if (!selected) {
      return `
        ${pageHeader('Моя птичка', 'Выбери вид попугая, чтобы персонализировать справочник')}
        <div class="card empty">
          <div class="big">🦜</div>
          <h3>Попугай ещё не выбран</h3>
          <p class="muted">Открой каталог и нажми на карточку своего вида.</p>
          <a class="btn btn-primary mt-2" href="#/catalog" data-link>Выбрать попугая</a>
        </div>`
    }

    return `
      ${pageHeader(
        'Моя птичка',
        'Быстрый доступ к персональному разделу',
        `<button type="button" class="btn btn-ghost btn-sm" data-action="clear-species">Сменить</button>`,
      )}
      <a class="card species-card mb-2" href="#/species/${selected.id}" data-link style="display:block">
        ${speciesPhoto(selected)}
        <div class="body">
          <h3>${escapeHtml(selected.name)}</h3>
          <p>${escapeHtml(selected.description)}</p>
          <div class="muted" style="margin-top:.7rem;font-weight:800;color:var(--green)">Открыть раздел вида →</div>
        </div>
      </a>
      <div class="grid-2">
        <a class="btn btn-secondary" href="#/nutrition" data-link>Питание</a>
        <a class="btn btn-secondary" href="#/care" data-link>Уход</a>
        <a class="btn btn-secondary" href="#/behavior" data-link>Поведение</a>
        <a class="btn btn-secondary" href="#/chat" data-link>Перышко</a>
      </div>`
  }

  function getNutritionQuery() {
    const hash = location.hash
    const qIndex = hash.indexOf('?')
    if (qIndex === -1) return { category: null, q: '', status: null }
    const params = new URLSearchParams(hash.slice(qIndex + 1))
    return {
      category: params.get('category'),
      q: params.get('q') || '',
      status: params.get('status'),
    }
  }

  function setNutritionQuery(next) {
    const current = getNutritionQuery()
    const merged = { ...current, ...next }
    const params = new URLSearchParams()
    if (merged.category) params.set('category', merged.category)
    if (merged.q && merged.q.trim()) params.set('q', merged.q.trim())
    if (merged.status) params.set('status', merged.status)
    const qs = params.toString()
    location.hash = qs ? `#/nutrition?${qs}` : '#/nutrition'
  }

  function statusLabel(status) {
    const text = (window.STATUS_TEXT && window.STATUS_TEXT[status]) || STATUS_LABEL[status] || STATUS_LABEL.unknown
    return `${badge(status)} <span class="status-text">${escapeHtml(text)}</span>`
  }

  function nutritionListHref(overrides = {}) {
    const current = getNutritionQuery()
    const merged = { ...current, ...overrides }
    const params = new URLSearchParams()
    if (merged.category) params.set('category', merged.category)
    if (merged.q && merged.q.trim()) params.set('q', merged.q.trim())
    if (merged.status) params.set('status', merged.status)
    const qs = params.toString()
    return qs ? `#/nutrition?${qs}` : '#/nutrition'
  }

  function nutritionBackHref() {
    return nutritionListHref()
  }

  function foodDetailHref(foodId) {
    const { category, status, q } = getNutritionQuery()
    const params = new URLSearchParams()
    if (category) params.set('category', category)
    if (status) params.set('status', status)
    if (q) params.set('q', q)
    const qs = params.toString()
    return qs ? `#/nutrition/${foodId}?${qs}` : `#/nutrition/${foodId}`
  }

  function renderNutrition() {
    const selected = getSelected()
    const { category, q, status } = getNutritionQuery()
    const results = window.filterFoods({
      category,
      status,
      query: q,
      speciesId: selected?.id || null,
    })
    const activeCategory = window.FOOD_CATEGORIES.find((c) => c.id === category)
    const showCategories = !category && !q.trim() && !status

    const catChips = [
      `<button type="button" class="chip ${!category ? 'active' : ''}" data-food-cat="">Все категории</button>`,
      ...window.FOOD_CATEGORIES.map(
        (c) =>
          `<button type="button" class="chip ${category === c.id ? 'active' : ''}" data-food-cat="${c.id}">${c.emoji} ${c.title}</button>`,
      ),
    ].join('')

    const statusFilters = [
      { id: '', label: 'Все продукты' },
      { id: 'safe', label: 'Можно' },
      { id: 'caution', label: 'С осторожностью' },
      { id: 'unsafe', label: 'Нельзя' },
      { id: 'unknown', label: 'Информация уточняется' },
    ]
      .map(
        (f) =>
          `<button type="button" class="chip chip-status ${(!status && !f.id) || status === f.id ? 'active' : ''}" data-food-status="${f.id}">${f.label}</button>`,
      )
      .join('')

    const cats = showCategories
      ? `<div class="grid-cats mb-2">${window.FOOD_CATEGORIES.map(
          (c) => `
            <button type="button" class="card cat-tile" data-food-cat="${c.id}">
              <div class="emoji">${c.emoji}</div>
              <strong>${c.title}</strong>
              <span>${c.description}</span>
              <span class="cat-count">${window.getFoodsByCategory(c.id).length} продуктов</span>
            </button>`,
        ).join('')}</div>`
      : ''

    const cards = results
      .map((food) => {
        const foodStatus = window.getSpeciesFoodStatus(food, selected?.id || null)
        return `
          <a class="card food-card food-card-icon" href="${foodDetailHref(food.id)}" data-link>
            ${emojiIcon(food.emoji, food.name, foodStatus === 'unsafe' ? 'danger' : foodStatus === 'caution' ? 'sun' : 'mint')}
            <div class="body">
              <div class="food-card-top">
                <h3>${escapeHtml(food.name)}</h3>
                ${badge(foodStatus)}
              </div>
              <p class="status-caption">${escapeHtml((window.STATUS_TEXT && window.STATUS_TEXT[foodStatus]) || '')}</p>
              <p>${escapeHtml(food.canGive || food.notes || '')}</p>
            </div>
          </a>`
      })
      .join('')

    const emptyMessage = q.trim()
      ? `<div class="card empty nutrition-empty">
          <div class="big">🔍</div>
          <h3>Пока у нас нет информации об этом продукте</h3>
          <p class="muted">Попробуй другое написание или выбери категорию вручную.</p>
          <button type="button" class="btn btn-secondary mt-2" data-action="clear-food-search">Очистить поиск</button>
        </div>`
      : `<div class="card empty nutrition-empty">
          <div class="big">🥗</div>
          <h3>Ничего не найдено</h3>
          <p class="muted">Сними фильтры или выбери другую категорию.</p>
        </div>`

    return `
      ${pageHeader(
        'Что можно твоему попугаю?',
        selected
          ? `Рекомендации адаптированы под вид: <strong>${escapeHtml(selected.name)}</strong>`
          : 'Выбери вид птицы на главной — тогда статусы будут точнее',
      )}
      ${
        selected
          ? banner(`Сейчас смотрим питание для: <strong>${escapeHtml(selected.name)}</strong>. Можно <a href="#/catalog" data-link>сменить попугая</a>.`)
          : banner(
              'Вид не выбран. Статусы общие. Выбери птицу в <a href="#/catalog" data-link><strong>каталоге</strong></a>.',
              'sun',
            )
      }
      <div class="search search-food">
        <input type="search" id="food-search" placeholder="Что хочешь предложить своему попугаю?" value="${escapeHtml(q)}" autocomplete="off" />
        ${q ? '<button type="button" class="search-clear" data-action="clear-food-search" aria-label="Очистить поиск">✕</button>' : ''}
      </div>
      <div class="chips">${statusFilters}</div>
      <div class="chips">${catChips}</div>
      ${
        activeCategory || status || q
          ? `<div class="nutrition-toolbar">
              <div class="muted tiny">
                ${activeCategory ? `${activeCategory.emoji} ${escapeHtml(activeCategory.title)} · ` : ''}
                Найдено: <strong>${results.length}</strong>
              </div>
              <button type="button" class="btn btn-ghost btn-sm" data-action="reset-nutrition">Сбросить фильтры</button>
            </div>`
          : ''
      }
      ${cats}
      ${!showCategories ? `<div class="grid-3 food-grid">${cards || emptyMessage}</div>` : ''}
      ${showCategories ? `<div class="section-title"><div><h2>Или сразу все продукты</h2><p>Можно листать полный список</p></div></div><div class="grid-3 food-grid">${window.filterFoods({ speciesId: selected?.id || null }).map((food) => {
        const foodStatus = window.getSpeciesFoodStatus(food, selected?.id || null)
        return `
          <a class="card food-card food-card-icon" href="${foodDetailHref(food.id)}" data-link>
            ${emojiIcon(food.emoji, '', foodStatus === 'unsafe' ? 'danger' : foodStatus === 'caution' ? 'sun' : 'mint')}
            <div class="body">
              <div class="food-card-top">
                <h3>${food.emoji ? `${food.emoji} ` : ''}${escapeHtml(food.name)}</h3>
                ${badge(foodStatus)}
              </div>
              <p class="status-caption">${escapeHtml((window.STATUS_TEXT && window.STATUS_TEXT[foodStatus]) || '')}</p>
            </div>
          </a>`
      }).join('')}</div>` : ''}
    `
  }

  function renderFood(id) {
    const food = window.getFoodById(id)
    if (!food) return renderNotFound()
    const selected = getSelected()
    const status = window.getSpeciesFoodStatus(food, selected?.id || null)
    const category = window.FOOD_CATEGORIES.find((c) => c.id === food.category)
    const backHref = nutritionBackHref()

    return `
      <div class="food-detail animate-in">
        ${pageHeader(
          `${food.emoji || ''} ${escapeHtml(food.name)}`,
          category ? `${category.emoji} ${category.title}` : '',
          `<a class="btn btn-secondary btn-sm" href="${backHref}" data-link>Вернуться к продуктам</a>`,
        )}
        <div class="food-detail-iconwrap">${emojiIcon(food.emoji, food.name, status === 'unsafe' ? 'danger' : status === 'caution' ? 'sun' : 'mint')}</div>
        <div class="card panel status-panel mb-1">
          <div class="status-row">${statusLabel(status)}</div>
          <p class="mt-2" style="margin-bottom:0">
            ${
              selected
                ? `Информация для выбранного вида: <strong>${escapeHtml(selected.name)}</strong>`
                : `Вид не выбран — показан общий статус. <a href="#/catalog" data-link>Выбрать попугая</a>`
            }
          </p>
        </div>
        ${status === 'unknown' ? banner('Информация уточняется. Мы не подтверждаем безопасность без надёжных источников.') : ''}
        ${status === 'unsafe' ? banner('Опасно для птиц. Не давайте этот продукт и уберите его из зоны доступа.', 'danger') : ''}
        ${status === 'caution' ? banner('Есть ограничения. Внимательно прочитайте подготовку и предупреждения.', 'sun') : ''}
        <div class="stack">
          <div class="card panel"><h3>Можно ли давать?</h3><p>${escapeHtml(food.canGive || 'Информация уточняется')}</p></div>
          <div class="card panel"><h3>Как правильно подготовить?</h3><p>${escapeHtml(food.preparation || 'Информация уточняется')}</p></div>
          <div class="card panel"><h3>Как часто предлагать?</h3><p>${escapeHtml(food.frequency || 'Информация уточняется')}</p></div>
          <div class="card panel"><h3>На что обратить внимание?</h3><p>${escapeHtml(food.notes || '')}</p><p>${escapeHtml(food.warnings || '')}</p></div>
          <div class="card panel">
            <h3>Источники информации</h3>
            <ul>${(food.sources || []).map((s) => `<li>${escapeHtml(s)}</li>`).join('') || '<li>Информация уточняется</li>'}</ul>
            <p class="muted tiny">Дата проверки: ${escapeHtml(food.reviewedAt || '—')}</p>
          </div>
          <div class="card panel">
            <h3>Статус по видам попугаев</h3>
            <div class="stack" style="margin-top:.8rem">
              ${window.SPECIES.map((s) => {
                const st = food.suitableSpecies[s.id] || food.safetyStatus
                const highlight = selected && selected.id === s.id ? ' species-highlight' : ''
                return `
                  <div class="species-status-row${highlight}">
                    <span>${escapeHtml(s.name)}</span>
                    <span class="status-with-text">${badge(st)} <small>${escapeHtml((window.STATUS_TEXT && window.STATUS_TEXT[st]) || '')}</small></span>
                  </div>`
              }).join('')}
            </div>
          </div>
        </div>
        <div class="hero-actions mt-2">
          <a class="btn btn-primary" href="${backHref}" data-link>Вернуться к продуктам</a>
          <a class="btn btn-secondary" href="${peryshkoHref({ topic: 'nutrition', q: `Расскажи про продукт: ${food.name}` })}" data-link>Спросить Перышко об этом продукте</a>
          <a class="btn btn-ghost" href="#/catalog" data-link>Сменить попугая</a>
        </div>
      </div>`
  }

  function careTitleForSpecies(selected) {
    if (!selected) return 'Уход и содержание 🏡'
    const map = {
      budgie: 'Уход за волнистым попугаем',
      cockatiel: 'Уход за кореллой',
      lovebird: 'Уход за неразлучником',
      ringneck: 'Уход за ожереловым попугаем',
      'african-grey': 'Уход за жако',
      macaw: 'Уход за ара',
      cockatoo: 'Уход за какаду',
      amazon: 'Уход за амазоном',
      conure: 'Уход за пиррурой',
      rosella: 'Уход за розеллой',
      quaker: 'Уход за квакером',
      eclectus: 'Уход за эклектусом',
    }
    return map[selected.id] || `Уход за видом: ${selected.name}`
  }

  function getCareQuery() {
    const hash = location.hash
    const qIndex = hash.indexOf('?')
    if (qIndex === -1) return { q: '', wood: '' }
    const params = new URLSearchParams(hash.slice(qIndex + 1))
    return { q: params.get('q') || '', wood: params.get('wood') || '' }
  }

  function renderChecklist(checklist) {
    if (!checklist) return ''
    const done = new Set(loadJSON(checklist.storageKey, []))
    return `
      <div class="card panel care-checklist mb-1">
        <div class="checklist-head">
          <h3>${escapeHtml(checklist.title)}</h3>
          <button type="button" class="btn btn-ghost btn-sm" data-action="reset-checklist" data-checklist-key="${checklist.storageKey}">Сбросить чек-лист</button>
        </div>
        ${checklist.disclaimer ? `<p class="muted tiny">${escapeHtml(checklist.disclaimer)}</p>` : ''}
        <div class="stack" style="margin-top:.7rem">
          ${checklist.items
            .map((item) => {
              const isDone = done.has(item.id)
              return `
                <button type="button" class="check-item ${isDone ? 'done' : ''}" data-care-check="${checklist.storageKey}" data-care-item="${item.id}">
                  <span class="check-box">${isDone ? '✓' : ''}</span>
                  <span><strong>${escapeHtml(item.title)}</strong></span>
                </button>`
            })
            .join('')}
        </div>
      </div>`
  }

  function renderCareWoodsBlock(woodQuery) {
    const woods = window.searchCareWoods(woodQuery)
    return `
      <div class="card panel mb-1">
        <h3>Справочник веток и жердочек</h3>
        <div class="search search-food" style="margin-top:.7rem">
          <input type="search" id="care-wood-search" placeholder="Поиск по названию дерева…" value="${escapeHtml(woodQuery)}" />
          ${woodQuery ? '<button type="button" class="search-clear" data-action="clear-wood-search" aria-label="Очистить">✕</button>' : ''}
        </div>
        <div class="stack" style="margin-top:.8rem">
          ${
            woods.length
              ? woods
                  .map((w) => {
                    const st = w.safetyStatus
                    const stText = (window.CARE_STATUS_TEXT && window.CARE_STATUS_TEXT[st]) || ''
                    return `
                    <article class="card wood-card wood-card-icon">
                      ${emojiIcon(w.emoji || '🌳', '', st === 'unsafe' ? 'danger' : st === 'caution' ? 'sun' : st === 'unknown' ? 'gray' : 'mint')}
                      <div class="body">
                        <div class="food-card-top">
                          <h3>${escapeHtml(w.name)}</h3>
                          ${badge(st)}
                        </div>
                        <p class="status-caption">${escapeHtml(stText)}</p>
                        <p><strong>Кому подходит:</strong> ${escapeHtml(w.suitableFor)}</p>
                        <p><strong>Как подготовить:</strong> ${escapeHtml(w.preparation)}</p>
                        <p><strong>Ограничения:</strong> ${escapeHtml(w.limits)}</p>
                        <p class="muted tiny">Источники: ${escapeHtml((w.sources || []).join('; '))}. Проверено: ${escapeHtml(w.reviewedAt || '—')}</p>
                      </div>
                    </article>`
                  })
                  .join('')
              : `<div class="empty"><p>Ничего не найдено. Попробуй другое название.</p></div>`
          }
        </div>
      </div>`
  }

  function renderCareList() {
    const selected = getSelected()
    const { q } = getCareQuery()
    const searchResults = q.trim() ? window.searchCareContent(q) : []

    return `
      ${pageHeader(
        careTitleForSpecies(selected),
        'Всё, что нужно для счастливой и здоровой жизни твоего пернатого друга',
      )}
      ${
        selected
          ? banner(`Рекомендации адаптированы под: <strong>${escapeHtml(selected.name)}</strong>. Можно <a href="#/catalog" data-link>сменить попугая</a>.`)
          : banner(
              'Вид ещё не выбран. Выбери птицу в <a href="#/catalog" data-link><strong>каталоге</strong></a>, чтобы получать более точные подсказки.',
              'sun',
            )
      }
      <div class="search search-food">
        <input type="search" id="care-search" placeholder="Поиск по материалам ухода…" value="${escapeHtml(q)}" />
        ${q ? '<button type="button" class="search-clear" data-action="clear-care-search" aria-label="Очистить">✕</button>' : ''}
      </div>
      ${
        q.trim()
          ? `<div class="stack mb-2">
              ${
                searchResults.length
                  ? searchResults
                      .map(
                        (r) =>
                          `<a class="card panel" href="${r.href}" data-link><strong>${escapeHtml(r.title)}</strong></a>`,
                      )
                      .join('')
                  : `<div class="card empty"><h3>Ничего не найдено</h3><p class="muted">Попробуй другое слово.</p></div>`
              }
            </div>`
          : ''
      }
      <div class="grid-2 care-grid">
        ${window.CARE_SECTIONS.map(
          (s) => `
          <a class="card care-card care-card-icon" href="#/care/${s.id}" data-link>
            ${emojiIcon(s.emoji, '', 'mint')}
            <div class="body">
              <h3>${escapeHtml(s.title)}</h3>
              <p>${escapeHtml(s.description)}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Подробнее</span>
            </div>
          </a>`,
        ).join('')}
      </div>`
  }

  function renderCareArticle(id) {
    const article = window.getCareArticle(id)
    if (!article) return renderNotFound()
    const selected = getSelected()
    const { wood } = getCareQuery()
    const speciesHint =
      selected && article.speciesHints && article.speciesHints[selected.id]
        ? article.speciesHints[selected.id]
        : null

    return `
      <div class="care-detail animate-in">
        ${pageHeader(
          escapeHtml(article.title),
          selected ? careTitleForSpecies(selected) : 'Уход и содержание',
          `<a class="btn btn-secondary btn-sm" href="#/care" data-link>К разделам ухода</a>`,
        )}
        ${
          selected
            ? banner(`Сейчас выбран вид: <strong>${escapeHtml(selected.name)}</strong>. Рекомендации ниже учитывают общий уход и особенности вида, где это указано.`)
            : banner('Вид не выбран — показаны общие рекомендации. <a href="#/catalog" data-link>Выбрать попугая</a>', 'sun')
        }
        <div class="card panel mb-1"><p>${escapeHtml(article.intro)}</p></div>
        ${
          speciesHint
            ? `<div class="card panel tip-card mb-1"><h3>Для твоего вида</h3><p>${escapeHtml(speciesHint)}</p></div>`
            : ''
        }
        ${
          article.highlightCard
            ? `<div class="card panel highlight-card mb-1"><h3>${escapeHtml(article.highlightCard.title)}</h3><p>${escapeHtml(article.highlightCard.text)}</p></div>`
            : ''
        }
        ${
          article.subsections && article.subsections.length
            ? article.subsections
                .map(
                  (sub) => `
              <div class="card panel mb-1">
                <h3>${escapeHtml(sub.title)}</h3>
                <ul>${(sub.content || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
              </div>`,
                )
                .join('')
            : ''
        }
        ${
          article.cards
            ? `<div class="grid-2 mb-1">${article.cards
                .map(
                  (c) => `
                <div class="card care-method-card care-card-icon">
                  ${emojiIcon(c.emoji || article.emoji || '🦜', '', 'mint')}
                  <div class="body">
                    <h3>${escapeHtml(c.title)}</h3>
                    <p>${escapeHtml(c.text)}</p>
                  </div>
                </div>`,
                )
                .join('')}</div>`
            : ''
        }
        ${
          article.toyCategories
            ? `<div class="stack mb-1">${article.toyCategories
                .map(
                  (t) => `
                <div class="card care-toy-card care-card-icon">
                  ${emojiIcon(t.emoji || '🧸', '', 'sun')}
                  <div class="body">
                    <h3>${escapeHtml(t.title)}</h3>
                    <p>${escapeHtml(t.description)}</p>
                    <p><strong>Для чего:</strong> ${escapeHtml(t.purpose)}</p>
                    <p><strong>Каким видам:</strong> ${escapeHtml(t.species)}</p>
                    <p><strong>На что обратить внимание:</strong> ${escapeHtml(t.attention)}</p>
                  </div>
                </div>`,
                )
                .join('')}</div>`
            : ''
        }
        ${
          article.dangerBlock
            ? `<div class="card panel mb-1" style="border:1px solid #F2B8B8;background:#FFF8F8">
                <h3 style="color:#912018">${escapeHtml(article.dangerBlock.title)}</h3>
                <ul>${article.dangerBlock.items.map((i) => `<li style="color:#912018">${escapeHtml(i)}</li>`).join('')}</ul>
                <p class="muted tiny">${escapeHtml(article.dangerBlock.note || '')}</p>
              </div>`
            : ''
        }
        ${article.hasWoodDirectory ? renderCareWoodsBlock(wood) : ''}
        ${renderChecklist(article.checklist)}
        ${
          article.tip
            ? `<div class="card panel tip-card mb-1"><h3>Совет от Попугайки 💚</h3><p>${escapeHtml(article.tip)}</p></div>`
            : ''
        }
        ${
          article.warnings && article.warnings.length
            ? `<div class="card panel mb-1" style="border:1px solid #F2B8B8;background:#FFF8F8">
                <h3 style="color:#912018">Важные предупреждения</h3>
                <ul>${article.warnings.map((i) => `<li style="color:#912018">${escapeHtml(i)}</li>`).join('')}</ul>
              </div>`
            : ''
        }
        <p class="muted tiny">Источники: ${escapeHtml((article.sources || []).join('; '))}. Проверено: ${escapeHtml(article.reviewedAt || '—')}</p>
        <div class="hero-actions mt-2">
          <a class="btn btn-primary" href="#/care" data-link>Вернуться к уходу</a>
          <a class="btn btn-secondary" href="${peryshkoHref({ topic: 'care', q: `Уточни про уход: ${article.title}` })}" data-link>Уточнить у Перышка</a>
          <a class="btn btn-ghost" href="#/catalog" data-link>Сменить попугая</a>
        </div>
      </div>`
  }

  function behaviorTitleForSpecies(selected) {
    if (!selected) return 'Понимаем друг друга 🦜'
    const map = {
      budgie: 'Поведение волнистого попугая',
      cockatiel: 'Поведение кореллы',
      lovebird: 'Поведение неразлучника',
      ringneck: 'Поведение ожерелового попугая',
      'african-grey': 'Поведение жако',
      macaw: 'Поведение ара',
      cockatoo: 'Поведение какаду',
      amazon: 'Поведение амазона',
      conure: 'Поведение пирруры',
      rosella: 'Поведение розеллы',
      quaker: 'Поведение квакера',
      eclectus: 'Поведение эклектуса',
    }
    return map[selected.id] || `Поведение: ${selected.name}`
  }

  function getBehaviorQuery() {
    const hash = location.hash
    const qIndex = hash.indexOf('?')
    if (qIndex === -1) return { q: '' }
    return { q: new URLSearchParams(hash.slice(qIndex + 1)).get('q') || '' }
  }

  function renderBehaviorList() {
    const selected = getSelected()
    const { q } = getBehaviorQuery()
    const topics = window.searchBehaviorTopics ? window.searchBehaviorTopics(q) : window.BEHAVIOR_TOPICS

    return `
      ${pageHeader(
        behaviorTitleForSpecies(selected),
        'Узнай, что хочет сказать тебе твой пернатый друг',
      )}
      ${
        selected
          ? banner(`Подсказки учитывают выбранный вид: <strong>${escapeHtml(selected.name)}</strong>. Можно <a href="#/catalog" data-link>сменить попугая</a>.`)
          : banner(
              'Вид ещё не выбран. Выбери птицу в <a href="#/catalog" data-link><strong>каталоге</strong></a> — тогда появятся более точные пометки.',
              'sun',
            )
      }
      <div class="card panel mb-1">
        <h2 style="margin:0;font-family:var(--font-display);font-size:1.35rem">Почему мой попугай так делает?</h2>
        <p class="muted" style="margin:.45rem 0 0">Выбери поведение, которое тебя интересует, и узнай возможные причины</p>
      </div>
      <div class="search search-food">
        <input type="search" id="behavior-search" placeholder="Что делает твой попугай?" value="${escapeHtml(q)}" autocomplete="off" />
        ${q ? '<button type="button" class="search-clear" data-action="clear-behavior-search" aria-label="Очистить">✕</button>' : ''}
      </div>
      <p class="muted tiny mb-1">Например: кусается, кричит, шипит, боится, поднимает хохолок</p>
      ${
        q.trim() && !topics.length
          ? `<div class="card empty mb-2">
              <div class="big">🤔</div>
              <h3>Пока у нас нет ответа на этот вопрос</h3>
              <p class="muted">Попробуй другое описание поведения</p>
              <a class="btn btn-secondary mt-2" href="#/chat" data-link>Спросить Перышко</a>
              <p class="muted tiny mt-2">Перышко — локальный помощник. Он не обещает ответ на любой вопрос и не заменяет ветеринара.</p>
            </div>`
          : ''
      }
      <div class="grid-2 behavior-grid">
        ${topics
          .map(
            (t) => `
          <a class="card care-card care-card-icon behavior-card" href="#/behavior/${t.id}" data-link>
            ${emojiIcon(t.icon, '', 'mint')}
            <div class="body">
              <h3>${escapeHtml(t.title)}</h3>
              <p>${escapeHtml(t.summary)}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Узнать причину</span>
            </div>
          </a>`,
          )
          .join('')}
      </div>`
  }

  function renderBehaviorTopic(id) {
    const topic = window.getBehaviorTopic ? window.getBehaviorTopic(id) : window.BEHAVIOR_TOPICS.find((t) => t.id === id)
    if (!topic) return renderNotFound()
    const selected = getSelected()
    const speciesHint =
      selected && topic.speciesHints && topic.speciesHints[selected.id]
        ? topic.speciesHints[selected.id]
        : null
    const detailTitle = selected ? `${topic.icon || ''} ${topic.title}`.trim() + ` · ${selected.name}` : `${topic.icon || ''} ${topic.title}`.trim()

    const block = (title, items, tone = '') => {
      if (!items || !items.length) return ''
      const list = Array.isArray(items) ? items : [items]
      return `
        <div class="card panel mb-1 ${tone}">
          <h3>${escapeHtml(title)}</h3>
          <ul>${list.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
        </div>`
    }

    return `
      <div class="behavior-detail animate-in">
        ${pageHeader(
          escapeHtml(detailTitle),
          selected ? behaviorTitleForSpecies(selected) : 'Поведение попугаев',
          `<a class="btn btn-secondary btn-sm" href="#/behavior" data-link>К списку</a>`,
        )}
        ${banner('Это справочная информация о возможных причинах. Она не ставит диагноз и не заменяет осмотр птичьего ветеринара.')}
        ${
          speciesHint
            ? `<div class="card panel tip-card mb-1"><h3>Для твоего вида</h3><p>${escapeHtml(speciesHint)}</p></div>`
            : selected
              ? `<div class="card panel mb-1"><p class="muted" style="margin:0">Видоспецифичная пометка для этого поведения уточняется — ниже общие ориентиры.</p></div>`
              : ''
        }
        ${block('Что это может означать?', topic.means || topic.whatToDo)}
        ${block('Когда это нормально?', topic.whenNormal ? topic.whenNormal : topic.normal ? [topic.normal] : [])}
        ${block('На что обратить внимание?', topic.watchFor ? topic.watchFor : topic.stress || topic.health ? [topic.stress, topic.health].filter(Boolean) : [])}
        ${block('Как правильно реагировать?', topic.howToRespond || topic.whatToDo)}
        ${block('Когда нужна помощь специалиста?', topic.whenSpecialist || topic.warnings, 'warn-panel')}
        <p class="muted tiny">Источники: ${escapeHtml((topic.sources || []).join('; '))}. Проверено: ${escapeHtml(topic.reviewedAt || '—')}</p>
        <div class="hero-actions mt-2">
          <a class="btn btn-primary" href="#/behavior" data-link>Другие поведения</a>
          <a class="btn btn-secondary" href="${peryshkoHref({ topic: 'behavior', q: `Расскажи о поведении: ${topic.title}` })}" data-link>Задать вопрос о поведении</a>
          <a class="btn btn-ghost" href="#/chat" data-link>Спросить Перышко</a>
        </div>
      </div>`
  }

  function getTrainingProgress(speciesId) {
    if (!speciesId) return []
    const all = loadJSON(STORAGE_TRAINING, {})
    if (!all || typeof all !== 'object' || Array.isArray(all)) {
      saveJSON(STORAGE_TRAINING, {})
      return []
    }
    const list = all[speciesId]
    return Array.isArray(list) ? list.filter((id) => typeof id === 'string') : []
  }

  function setTrainingProgress(speciesId, lessonIds) {
    if (!speciesId) return
    const all = loadJSON(STORAGE_TRAINING, {})
    const safe = all && typeof all === 'object' && !Array.isArray(all) ? all : {}
    safe[speciesId] = Array.isArray(lessonIds) ? lessonIds.filter((id) => typeof id === 'string') : []
    saveJSON(STORAGE_TRAINING, safe)
  }

  function renderTrainingList() {
    const selected = getSelected()
    const lessons = window.TRAINING_LESSONS || window.TRAINING_TOPICS || []
    const done = new Set(getTrainingProgress(selected?.id))
    const doneCount = lessons.filter((l) => done.has(l.id)).length

    return `
      ${pageHeader('Давай дружить! 💚', 'Учимся понимать друг друга и постепенно завоёвываем доверие')}
      ${
        selected
          ? banner(`Прогресс сохраняется для вида: <strong>${escapeHtml(selected.name)}</strong>. Отметка означает, что ты изучил(а) материал, а не то, что птица «сдала экзамен».`)
          : banner(
              'Выбери попугая в <a href="#/catalog" data-link><strong>каталоге</strong></a>, чтобы сохранять прогресс уроков для своего вида.',
              'sun',
            )
      }
      <div class="card training-hero mb-1">
        ${imgTag('images/parrots/hero.jpg', 'Попугай — герой раздела приручения', 'training-hero-img parrot-photo parrot-photo--hero')}
        <div class="body">
          <h2 style="margin:0;font-family:var(--font-display)">Путь к дружбе</h2>
          <p class="muted" style="margin:.4rem 0 0">Без сроков «за неделю» и без принуждения</p>
        </div>
      </div>
      <div class="card panel progress-card mb-1">
        <div class="checklist-head">
          <h3 style="margin:0">Пройдено ${doneCount} из ${lessons.length} уроков</h3>
          ${
            selected
              ? `<button type="button" class="btn btn-ghost btn-sm" data-action="reset-training-progress">Сбросить прогресс</button>`
              : ''
          }
        </div>
        <div class="progress-bar" aria-hidden="true"><span style="width:${lessons.length ? Math.round((doneCount / lessons.length) * 100) : 0}%"></span></div>
        <p class="muted tiny" style="margin:.55rem 0 0">Птица не обязана освоить все навыки за фиксированное число дней.</p>
      </div>
      <div class="grid-2 mb-2">
        <a class="card care-card-icon panel" href="#/training/mistakes" data-link style="padding:1rem">
          ${emojiIcon('🚫', '', 'danger')}
          <h3 style="margin:.7rem 0 0;font-family:var(--font-display)">Чего лучше не делать?</h3>
          <p class="muted">Ошибки новичков</p>
        </a>
        <a class="card care-card-icon panel" href="#/training/body" data-link style="padding:1rem">
          ${emojiIcon('🦜', '', 'mint')}
          <h3 style="margin:.7rem 0 0;font-family:var(--font-display)">Язык тела</h3>
          <p class="muted">Учимся понимать сигналы</p>
        </a>
      </div>
      <div class="section-title"><div><h2>Пошаговые уроки</h2><p>Открывай по одному и отмечай изученное</p></div></div>
      <div class="stack">
        ${lessons
          .map((l) => {
            const isDone = done.has(l.id)
            return `
            <a class="card topic-card ${isDone ? 'lesson-done' : ''}" href="#/training/${l.id}" data-link>
              <div class="topic-ico" style="background:${isDone ? 'var(--mint)' : '#FFF3CD'}">${l.emoji || '📘'}</div>
              <div style="flex:1">
                <div class="food-card-top">
                  <h3>Урок ${l.number || ''}. ${escapeHtml(l.title)}</h3>
                  ${isDone ? softBadge('Изучено', 'mint') : ''}
                </div>
                <p>${escapeHtml(l.summary || l.intro || '')}</p>
              </div>
            </a>`
          })
          .join('')}
      </div>`
  }

  function renderTrainingLesson(id) {
    const lesson = window.getTrainingLesson
      ? window.getTrainingLesson(id)
      : (window.TRAINING_LESSONS || []).find((l) => l.id === id)
    if (!lesson) {
      // fallback old topics
      const topic = (window.TRAINING_TOPICS || []).find((t) => t.id === id)
      if (!topic) return renderNotFound()
      return renderTrainingTopicLegacy(topic)
    }
    const selected = getSelected()
    const done = new Set(getTrainingProgress(selected?.id))
    const isDone = done.has(lesson.id)

    return `
      <div class="training-detail animate-in">
        ${pageHeader(
          `Урок ${lesson.number}. ${escapeHtml(lesson.title)}`,
          'Приручение без принуждения',
          `<a class="btn btn-secondary btn-sm" href="#/training" data-link>К урокам</a>`,
        )}
        <div class="card panel mb-1"><p>${escapeHtml(lesson.intro)}</p></div>
        ${(lesson.sections || [])
          .map(
            (s) => `
          <div class="card panel mb-1">
            <h3>${escapeHtml(s.title)}</h3>
            <ul>${(s.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>`,
          )
          .join('')}
        ${
          lesson.tips && lesson.tips.length
            ? `<div class="card panel tip-card mb-1"><h3>Совет от Попугайки 💚</h3><ul>${lesson.tips.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`
            : ''
        }
        <div class="card panel mb-1">
          ${
            selected
              ? isDone
                ? `<p style="margin:0">Отлично! Ещё один шаг к дружбе 💚</p>
                   <button type="button" class="btn btn-ghost btn-sm mt-2" data-action="unmark-lesson" data-lesson-id="${lesson.id}">Снять отметку</button>`
                : `<button type="button" class="btn btn-primary" data-action="mark-lesson" data-lesson-id="${lesson.id}">Отметить как пройденный</button>
                   <p class="muted tiny mt-2">Отметка значит, что ты изучил(а) материал — не то, что попугай уже освоил навык.</p>`
              : `<p class="muted" style="margin:0">Чтобы сохранять прогресс, <a href="#/catalog" data-link>выбери вид попугая</a>.</p>`
          }
        </div>
        <p class="muted tiny">Источники: ${escapeHtml((lesson.sources || []).join('; '))}. Проверено: ${escapeHtml(lesson.reviewedAt || '—')}</p>
      </div>`
  }

  function renderTrainingTopicLegacy(topic) {
    return `
      ${pageHeader(`${topic.emoji || ''} ${escapeHtml(topic.title)}`)}
      <div class="card panel mb-1"><p>${escapeHtml(topic.intro)}</p></div>
      <div class="card panel mb-1"><h3>Шаги</h3><ol>${(topic.steps || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ol></div>
      <div class="card panel mb-1"><h3>Подсказки</h3><ul>${(topic.tips || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
      <p class="muted tiny">Источники: ${escapeHtml((topic.sources || []).join('; '))}</p>`
  }

  function renderTrainingMistakes() {
    return `
      ${pageHeader('Чего лучше не делать?', 'Ошибки новичков — без наказаний и принуждения')}
      <div class="grid-2">
        ${(window.TRAINING_MISTAKES || [])
          .map(
            (m) => `
          <a class="card care-card care-card-icon" href="#/training/mistakes/${m.id}" data-link>
            ${emojiIcon(m.emoji, '', 'danger')}
            <div class="body">
              <h3>${escapeHtml(m.title)}</h3>
              <p>${escapeHtml(m.summary)}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Подробнее</span>
            </div>
          </a>`,
          )
          .join('')}
      </div>
      <a class="btn btn-ghost mt-2" href="#/training" data-link>← К приручению</a>`
  }

  function renderTrainingMistake(id) {
    const m = window.getTrainingMistake ? window.getTrainingMistake(id) : null
    if (!m) return renderNotFound()
    return `
      ${pageHeader(escapeHtml(m.title), 'Ошибки новичков', `<a class="btn btn-secondary btn-sm" href="#/training/mistakes" data-link>К списку</a>`)}
      <div class="card panel mb-1"><p>${escapeHtml(m.summary)}</p></div>
      <div class="card panel mb-1 warn-panel"><h3>Почему это важно</h3><ul>${m.explanation.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
      <div class="card panel tip-card mb-1"><h3>Что лучше сделать</h3><ul>${m.better.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`
  }

  function renderTrainingBodyList() {
    return `
      ${pageHeader('Учимся понимать язык тела 🦜', 'Сигналы зависят от контекста — без универсальных ярлыков')}
      ${banner('Не используйте правила вроде «поднятый хохолок всегда означает радость». Смотрите на всю картину.', 'sun')}
      <div class="grid-2">
        ${(window.TRAINING_BODY_LANGUAGE || [])
          .map(
            (b) => `
          <a class="card care-card care-card-icon" href="#/training/body/${b.id}" data-link>
            ${emojiIcon(b.emoji, '', 'mint')}
            <div class="body">
              <h3>${escapeHtml(b.title)}</h3>
              <p>${escapeHtml(b.summary)}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Открыть</span>
            </div>
          </a>`,
          )
          .join('')}
      </div>
      <a class="btn btn-ghost mt-2" href="#/training" data-link>← К приручению</a>`
  }

  function renderTrainingBody(id) {
    const b = window.getTrainingBody ? window.getTrainingBody(id) : null
    if (!b) return renderNotFound()
    return `
      ${pageHeader(escapeHtml(b.title), 'Язык тела попугая', `<a class="btn btn-secondary btn-sm" href="#/training/body" data-link>К списку</a>`)}
      <div class="card panel mb-1"><p>${escapeHtml(b.summary)}</p></div>
      <div class="card panel mb-1"><h3>Что важно понимать</h3><ul>${b.points.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`
  }

  function healthTitleForSpecies(selected) {
    if (!selected) return 'Здоровье моего попугая ❤️'
    const map = {
      budgie: 'Здоровье волнистого попугая',
      cockatiel: 'Здоровье кореллы',
      lovebird: 'Здоровье неразлучника',
      ringneck: 'Здоровье ожерелового попугая',
      'african-grey': 'Здоровье жако',
      macaw: 'Здоровье ара',
      cockatoo: 'Здоровье какаду',
      amazon: 'Здоровье амазона',
      conure: 'Здоровье пирруры',
      rosella: 'Здоровье розеллы',
      quaker: 'Здоровье квакера',
      eclectus: 'Здоровье эклектуса',
    }
    return map[selected.id] || `Здоровье: ${selected.name}`
  }

  function urgencyBadge(level) {
    const u = window.HEALTH_URGENCY && window.HEALTH_URGENCY[level]
    if (!u) return ''
    const cls = u.color === 'red' ? 'badge-unsafe' : u.color === 'yellow' ? 'badge-caution' : 'badge-safe'
    return `<span class="badge ${cls}">${escapeHtml(u.label)}</span>`
  }

  function peryshkoHref({ topic, q } = {}) {
    const params = new URLSearchParams()
    if (topic) params.set('topic', topic)
    if (q) params.set('q', q)
    const s = params.toString()
    return s ? `#/chat?${s}` : '#/chat'
  }

  function healthChatHref(topic) {
    return peryshkoHref({ topic: 'health', q: topic || '' })
  }

  function renderHealthList() {
    const selected = getSelected()
    const sections = window.HEALTH_SECTIONS || window.HEALTH_TOPICS || []
    return `
      ${pageHeader(
        healthTitleForSpecies(selected),
        'Учимся замечать важные изменения и заботиться о здоровье пернатого друга',
      )}
      ${banner(
        'Справочная информация. Не ставит диагноз и не заменяет ветеринара, специализирующегося на птицах. Не назначайте лечение самостоятельно.',
        'danger',
      )}
      ${
        selected
          ? banner(`Раздел открыт с учётом вида: <strong>${escapeHtml(selected.name)}</strong>.`)
          : banner(
              'Вид ещё не выбран. Выбери птицу в <a href="#/catalog" data-link><strong>каталоге</strong></a>.',
              'sun',
            )
      }
      <div class="health-urgent-bar mb-1">
        <a class="btn btn-danger btn-block" href="#/health/emergency" data-link>🚨 Срочная помощь</a>
        <a class="btn btn-secondary btn-block" href="${healthChatHref('беспокоит здоровье попугая')}" data-link>Спросить Перышко 🪶</a>
      </div>
      <div class="grid-2 health-grid">
        ${sections
          .map(
            (s) => `
          <a class="card care-card care-card-icon" href="#/health/${s.id}" data-link>
            ${emojiIcon(s.emoji || '❤️', '', 'mint')}
            <div class="body">
              <h3>${escapeHtml(s.title)}</h3>
              <p>${escapeHtml(s.description || s.intro || '')}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Подробнее</span>
            </div>
          </a>`,
          )
          .join('')}
      </div>`
  }

  function renderHealthEmergency() {
    const data = window.HEALTH_EMERGENCY
    if (!data) return renderNotFound()
    return `
      <div class="health-detail animate-in">
        ${pageHeader(
          escapeHtml(data.title),
          'Экстренные ориентиры — список не исчерпывающий',
          `<a class="btn btn-secondary btn-sm" href="#/health" data-link>К здоровью</a>`,
        )}
        ${banner('При подобных состояниях немедленно свяжитесь с ветеринарной клиникой, оказывающей помощь птицам.', 'danger')}
        <div class="card panel warn-panel mb-1">
          <h3>Когда нельзя ждать</h3>
          <ul>${data.conditions.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          <p class="muted tiny">Список не полный. При сомнении звоните раньше.</p>
        </div>
        <div class="card panel tip-card mb-1">
          <h3>Что делать до обращения к врачу?</h3>
          <ul>${data.beforeHelp.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          <p class="muted tiny">Не задерживайте обращение ради выполнения пунктов приложения.</p>
        </div>
        <div class="card panel warn-panel mb-1">
          <h3>Чего делать нельзя</h3>
          <ul>${data.neverDo.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
        </div>
        <div class="hero-actions mt-2">
          <a class="btn btn-danger" href="https://www.google.com/search?q=%D0%B2%D0%B5%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D0%B0%D1%80+%D0%BE%D1%80%D0%BD%D0%B8%D1%82%D0%BE%D0%BB%D0%BE%D0%B3+%D0%BF%D1%82%D0%B8%D1%86%D1%8B" target="_blank" rel="noopener noreferrer">Найти ветеринара для птиц</a>
          <a class="btn btn-ghost" href="${healthChatHref('срочная помощь попугаю')}" data-link>Спросить Перышко</a>
        </div>
        <p class="muted tiny mt-2">Источники: ${escapeHtml((data.sources || []).join('; '))}. Проверено: ${escapeHtml(data.reviewedAt || '—')}</p>
      </div>`
  }

  function renderHealthSymptoms() {
    return `
      ${pageHeader('Что тебя беспокоит?', 'Карточки симптомов — без диагноза по одному признаку')}
      ${banner('Один симптом не равен диагнозу. При сомнении обратитесь к птичьему ветеринару.', 'danger')}
      <div class="grid-2">
        ${(window.HEALTH_SYMPTOMS || [])
          .map(
            (s) => `
          <a class="card care-card care-card-icon" href="#/health/symptoms/${s.id}" data-link>
            ${emojiIcon(s.emoji, '', s.urgency === 'urgent' ? 'danger' : s.urgency === 'attention' ? 'sun' : 'mint')}
            <div class="body">
              <div class="food-card-top"><h3>${escapeHtml(s.title)}</h3>${urgencyBadge(s.urgency)}</div>
              <p>${escapeHtml(s.why)}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Подробнее</span>
            </div>
          </a>`,
          )
          .join('')}
      </div>
      <a class="btn btn-ghost mt-2" href="#/health" data-link>← К здоровью</a>`
  }

  function renderHealthSymptom(id) {
    const s = window.getHealthSymptom ? window.getHealthSymptom(id) : null
    if (!s) return renderNotFound()
    return `
      <div class="health-detail animate-in">
        ${pageHeader(
          `${s.emoji || ''} ${escapeHtml(s.title)}`.trim(),
          'Справочная карточка симптома',
          `<a class="btn btn-secondary btn-sm" href="#/health/symptoms" data-link>К симптомам</a>`,
        )}
        <div class="mb-1">${urgencyBadge(s.urgency)}</div>
        ${s.urgency === 'urgent' ? banner('Срочно свяжитесь с клиникой, оказывающей помощь птицам.', 'danger') : banner('Нужна консультация птичьего ветеринара. Приложение не исключает заболевание.', 'sun')}
        <div class="card panel mb-1"><h3>Почему он требует внимания</h3><p>${escapeHtml(s.why)}</p></div>
        <div class="card panel mb-1"><h3>Какие дополнительные признаки важно заметить</h3><ul>${s.extra.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
        <div class="card panel mb-1"><h3>Насколько срочно нужен ветеринар</h3><p>${escapeHtml(s.howUrgent)}</p></div>
        <div class="card panel tip-card mb-1"><h3>Что безопасно сделать до помощи</h3><ul>${s.safeBefore.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
        <div class="card panel warn-panel mb-1"><h3>Чего делать нельзя</h3><ul>${s.never.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
        <div class="hero-actions mt-2">
          <a class="btn btn-primary" href="${healthChatHref(s.title)}" data-link>Спросить Перышко 🪶</a>
          <a class="btn btn-danger" href="#/health/emergency" data-link>Срочная помощь</a>
        </div>
      </div>`
  }

  function renderWeightCalc() {
    return `
      <div class="card panel weight-calc mb-1" id="weight-calc">
        <h3>Калькулятор изменения веса</h3>
        <p class="muted tiny">Только арифметика изменения. Не диагностика.</p>
        <div class="weight-fields">
          <label>Предыдущий вес (г)
            <input type="number" id="weight-prev" min="0.1" step="0.1" inputmode="decimal" placeholder="например 95" />
          </label>
          <label>Текущий вес (г)
            <input type="number" id="weight-curr" min="0.1" step="0.1" inputmode="decimal" placeholder="например 90" />
          </label>
        </div>
        <button type="button" class="btn btn-primary mt-2" data-action="calc-weight">Рассчитать</button>
        <div id="weight-result" class="weight-result muted" hidden></div>
        <p class="muted tiny mt-2">Расчёт показывает только изменение веса и не является диагностикой. При необъяснимом снижении веса обратитесь к ветеринару.</p>
      </div>`
  }

  function renderHealthSafetyList() {
    return `
      ${pageHeader('Опасности для попугая дома 🛡️', 'Профилактика травм и отравлений')}
      <div class="grid-2">
        ${(window.HEALTH_SAFETY || [])
          .map(
            (s) => `
          <a class="card care-card care-card-icon" href="#/health/safety/${s.id}" data-link>
            ${emojiIcon(s.emoji, '', 'sun')}
            <div class="body">
              <h3>${escapeHtml(s.title)}</h3>
              <p>${escapeHtml(s.risk)}</p>
              <span class="btn btn-secondary btn-sm btn-block mt-2">Подробнее</span>
            </div>
          </a>`,
          )
          .join('')}
      </div>
      <a class="btn btn-ghost mt-2" href="#/health" data-link>← К здоровью</a>`
  }

  function renderHealthSafetyItem(id) {
    const s = window.getHealthSafety ? window.getHealthSafety(id) : null
    if (!s) return renderNotFound()
    return `
      ${pageHeader(`${s.emoji} ${escapeHtml(s.title)}`, 'Безопасность дома', `<a class="btn btn-secondary btn-sm" href="#/health/safety" data-link>К списку</a>`)}
      <div class="card panel warn-panel mb-1"><h3>Риск</h3><p>${escapeHtml(s.risk)}</p></div>
      <div class="card panel tip-card mb-1"><h3>Профилактика</h3><ul>${s.prevention.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`
  }

  function renderHealthArticle(id) {
    if (id === 'symptoms') return renderHealthSymptoms()
    if (id === 'safety') return renderHealthSafetyList()
    if (id === 'emergency') return renderHealthEmergency()

    const article = window.getHealthArticle ? window.getHealthArticle(id) : null
    if (!article) {
      const legacy = (window.HEALTH_TOPICS || []).find((t) => t.id === id)
      if (!legacy) return renderNotFound()
      return `
        ${pageHeader(escapeHtml(legacy.title))}
        ${banner('Справочная информация. Не заменяет птичьего ветеринара.', 'danger')}
        <div class="card panel mb-1"><p>${escapeHtml(legacy.intro)}</p></div>
        <div class="card panel mb-1"><h3>На что обратить внимание</h3><ul>${legacy.points.map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>
        <p class="muted tiny">Источники: ${escapeHtml((legacy.sources || []).join('; '))}</p>`
    }

    return `
      <div class="health-detail animate-in">
        ${pageHeader(
          escapeHtml(article.title),
          healthTitleForSpecies(getSelected()),
          `<a class="btn btn-secondary btn-sm" href="#/health" data-link>К здоровью</a>`,
        )}
        <div class="mb-1">${urgencyBadge(article.urgency || 'info')}</div>
        ${article.redAlert ? banner('При признаках дыхательной недостаточности нужна экстренная помощь.', 'danger') : ''}
        ${banner('Информация справочная и не заменяет осмотр ветеринара, специализирующегося на птицах.', 'danger')}
        <div class="card panel mb-1"><p>${escapeHtml(article.intro)}</p></div>
        ${(article.blocks || [])
          .map(
            (b) => `
          <div class="card panel mb-1">
            <h3>${escapeHtml(b.title)}</h3>
            <ul>${(b.items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
          </div>`,
          )
          .join('')}
        ${article.hasWeightCalc ? renderWeightCalc() : ''}
        ${
          article.hasVetSearch
            ? `<div class="hero-actions mb-1">
                <a class="btn btn-primary" href="https://www.google.com/search?q=%D0%B2%D0%B5%D1%82%D0%B5%D1%80%D0%B8%D0%BD%D0%B0%D1%80+%D0%BE%D1%80%D0%BD%D0%B8%D1%82%D0%BE%D0%BB%D0%BE%D0%B3+%D0%BF%D1%82%D0%B8%D1%86%D1%8B+%D0%BA%D0%BB%D0%B8%D0%BD%D0%B8%D0%BA%D0%B0" target="_blank" rel="noopener noreferrer">Найти ветеринара для птиц</a>
              </div>`
            : ''
        }
        ${
          article.warning
            ? `<div class="card panel warn-panel mb-1"><h3>Важно</h3><p>${escapeHtml(article.warning)}</p></div>`
            : ''
        }
        <div class="hero-actions mt-2">
          <a class="btn btn-secondary" href="${healthChatHref(article.title)}" data-link>Спросить Перышко 🪶</a>
          <a class="btn btn-danger" href="#/health/emergency" data-link>Срочная помощь</a>
        </div>
        <p class="muted tiny">Источники: ${escapeHtml((article.sources || []).join('; '))}. Проверено: ${escapeHtml(article.reviewedAt || '—')}</p>
        <p class="muted tiny">Материал требует проверки ветеринарным специалистом по птицам перед использованием как клинической рекомендации.</p>
      </div>`
  }

  function renderHealthTopic(id) {
    return renderHealthArticle(id)
  }

  function renderGuide() {
    const q = (document.getElementById('guide-search')?.value || '').trim().toLowerCase()
    const sections = [
      {
        title: 'Уход и содержание',
        emoji: '🏡',
        href: '#/care',
        items: window.CARE_SECTIONS.map((s) => ({ title: s.title, href: `#/care/${s.id}` })),
      },
      {
        title: 'Поведение',
        emoji: '🦜',
        href: '#/behavior',
        items: window.BEHAVIOR_TOPICS.map((t) => ({ title: t.title, href: `#/behavior/${t.id}` })),
      },
      {
        title: 'Здоровье',
        emoji: '❤️',
        href: '#/health',
        items: [
          { title: 'Срочная помощь', href: '#/health/emergency' },
          ...(window.HEALTH_SECTIONS || window.HEALTH_TOPICS || []).map((t) => ({
            title: t.title,
            href: `#/health/${t.id}`,
          })),
        ],
      },
      {
        title: 'Приручение',
        emoji: '🧠',
        href: '#/training',
        items: [
          ...(window.TRAINING_LESSONS || []).map((t) => ({
            title: `Урок ${t.number}. ${t.title}`,
            href: `#/training/${t.id}`,
          })),
          { title: 'Чего лучше не делать?', href: '#/training/mistakes' },
          { title: 'Язык тела попугая', href: '#/training/body' },
        ],
      },
      {
        title: 'Питание',
        emoji: '🥦',
        href: '#/nutrition',
        items: [{ title: 'Энциклопедия продуктов', href: '#/nutrition' }],
      },
    ]

    const filtered = sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            !q ||
            item.title.toLowerCase().includes(q) ||
            section.title.toLowerCase().includes(q),
        ),
      }))
      .filter((section) => section.items.length > 0)

    return `
      ${pageHeader('Справочник', 'Уход, поведение, здоровье и приручение — в одном месте')}
      <div class="search">
        <input type="search" id="guide-search" placeholder="Поиск по справочнику…" value="${escapeHtml(document.getElementById('guide-search')?.value || '')}" />
      </div>
      ${
        filtered.length
          ? filtered
              .map(
                (section) => `
            <section class="mb-2">
              <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:.6rem">
                <h2 style="margin:0;font-family:var(--font-display)">${section.emoji} ${section.title}</h2>
                <a href="${section.href}" data-link style="font-weight:800;color:var(--green);font-size:.9rem">Открыть</a>
              </div>
              <div class="grid-2">
                ${section.items
                  .map(
                    (item) =>
                      `<a class="card panel" href="${item.href}" data-link style="font-weight:700">${escapeHtml(item.title)}</a>`,
                  )
                  .join('')}
              </div>
            </section>`,
              )
              .join('')
          : `<div class="card empty"><h3>Ничего не найдено</h3><p class="muted">Попробуй другое слово.</p></div>`
      }`
  }

  function getBeginnerProgress() {
    const progress = loadJSON(STORAGE_BEGINNER, {})
    if (!progress || typeof progress !== 'object' || Array.isArray(progress)) {
      saveJSON(STORAGE_BEGINNER, {})
      return {}
    }
    return progress
  }

  function renderBeginner() {
    const selected = getSelected()
    const progress = getBeginnerProgress()
    const picking = !selected || app.dataset.beginnerPick === '1'

    if (picking || !selected) {
      return `
        ${pageHeader('Первые шаги с твоим попугаем', 'Сначала выбери вид птицы — чек-лист подстроится под неё')}
        <div class="grid-3">
          ${window.SPECIES.map(
            (s) => `
            <button type="button" class="card species-card" data-beginner-species="${s.id}" style="border:none;padding:0;text-align:left">
              ${speciesPhoto(s)}
              <div class="body"><h3>${escapeHtml(s.name)}</h3></div>
            </button>`,
          ).join('')}
        </div>`
    }

    const done = new Set(progress[selected.id] || [])
    const total = window.BEGINNER_CHECKLIST.length
    const completed = done.size
    const percent = Math.round((completed / total) * 100)

    return `
      ${pageHeader(
        'Первые шаги с твоим попугаем',
        `Чек-лист для вида: ${escapeHtml(selected.name)}`,
        `<button type="button" class="btn btn-ghost btn-sm" data-action="beginner-pick">Сменить вид</button>`,
      )}
      <div class="card panel mb-2">
        <div class="progress">
          <div>
            <strong style="font-family:var(--font-display);font-size:1.15rem">Прогресс адаптации</strong>
            <div class="muted tiny">Выполнено ${completed} из ${total}</div>
          </div>
          <div style="font-family:var(--font-display);font-size:1.6rem;font-weight:900;color:var(--green)">${percent}%</div>
        </div>
        <div class="progress-bar"><span style="width:${percent}%"></span></div>
      </div>
      ${banner('Отмечай выполненные пункты — прогресс сохранится на этом устройстве.')}
      <div class="stack">
        ${window.BEGINNER_CHECKLIST.map((item) => {
          const isDone = done.has(item.id)
          return `
            <button type="button" class="check-item ${isDone ? 'done' : ''}" data-toggle-check="${item.id}">
              <span class="check-box">${isDone ? '✓' : ''}</span>
              <span>
                <strong style="font-family:var(--font-display);font-size:1.05rem;display:block">${escapeHtml(item.title)}</strong>
                <span class="muted tiny">${escapeHtml(item.description)}</span>
              </span>
            </button>`
        }).join('')}
      </div>
      <div class="hero-actions mt-2">
        <a class="btn btn-primary" href="#/species/${selected.id}" data-link>Открыть раздел вида</a>
        <a class="btn btn-secondary" href="#/training" data-link>Перейти к приручению</a>
      </div>`
  }

  function defaultChat() {
    const welcome =
      window.PeryshkoAI && window.PeryshkoAI.buildWelcome
        ? window.PeryshkoAI.buildWelcome(getSelected())
        : 'Привет! 🦜 Я Перышко — твой помощник по уходу за попугаями!\n\nЧто хочешь узнать сегодня? 💚'
    return [{ id: 'welcome', role: 'assistant', content: welcome }]
  }

  function ensureChatHistory() {
    let messages = loadJSON(STORAGE_CHAT, null)
    if (Array.isArray(messages)) {
      messages = messages.filter(
        (m) =>
          m &&
          typeof m === 'object' &&
          typeof m.content === 'string' &&
          (m.role === 'user' || m.role === 'assistant'),
      )
    }
    if (!Array.isArray(messages) || !messages.length) {
      messages = defaultChat()
      saveJSON(STORAGE_CHAT, messages)
      return messages
    }

    if (messages.length === 1 && messages[0].id === 'welcome' && window.PeryshkoAI) {
      const welcome = window.PeryshkoAI.buildWelcome(getSelected())
      if (messages[0].content !== welcome) {
        messages[0] = { ...messages[0], content: welcome }
        saveJSON(STORAGE_CHAT, messages)
      }
    }

    if (window.PeryshkoAI && window.PeryshkoAI.trimHistory) {
      return window.PeryshkoAI.trimHistory(messages)
    }
    return messages
  }

  function askLocal(message, speciesId) {
    if (window.PeryshkoAI && window.PeryshkoAI.searchLocalKnowledge) {
      return window.PeryshkoAI.searchLocalKnowledge(message, speciesId).text
    }
    const match = window.findDemoAnswer(message, speciesId)
    if (!match) {
      return 'Пока у меня нет проверенной информации по этому вопросу. Попробуй уточнить вопрос или посмотри материалы нашего справочника 💚'
    }
    return match.answer
  }

  function getChatQuery() {
    const hash = location.hash
    const qIndex = hash.indexOf('?')
    if (qIndex === -1) return { topic: '', q: '' }
    const params = new URLSearchParams(hash.slice(qIndex + 1))
    return { topic: params.get('topic') || '', q: params.get('q') || '' }
  }

  function renderChatMessage(m) {
    const isUser = m.role === 'user'
    const isTyping = !!m.typing
    const classes = ['msg', 'animate-msg', m.role || 'assistant']
    if (m.error) classes.push('error')
    if (isTyping) classes.push('typing')

    const avatar = isUser
      ? ''
      : `<div class="msg-avatar" aria-hidden="true"><img src="images/peryshko-avatar.png" alt="" /></div>`

    if (isTyping) {
      return `<div class="${classes.join(' ')}">${avatar}<div class="bubble" aria-live="polite"><span class="typing-dots" aria-hidden="true"><span></span><span></span><span></span></span> Перышко ищет в справочнике…</div></div>`
    }

    const metaBits = []
    if (m.error) {
      metaBits.push(`<button type="button" class="btn btn-ghost btn-sm" data-action="retry-chat">Повторить</button>`)
    }
    if (m.href) {
      metaBits.push(
        `<a class="btn btn-secondary btn-sm" href="${escapeHtml(m.href)}" data-link>${escapeHtml(m.hrefLabel || 'Открыть в справочнике')}</a>`,
      )
    }
    const clarifying = Array.isArray(m.clarifying) ? m.clarifying : []
    if (clarifying.length) {
      metaBits.push(`
        <div class="chat-chip-row" aria-label="Варианты уточнения">
          ${clarifying
            .map((q) => `<button type="button" class="chat-chip" data-chat-suggest="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
            .join('')}
        </div>`)
    }
    const related = Array.isArray(m.relatedQuestions) ? m.relatedQuestions : []
    if (related.length) {
      metaBits.push(`
        <div class="chat-related">
          <div class="chat-related-title">Может быть, тебе ещё интересно?</div>
          <div class="chat-chip-row">
            ${related
              .map((q) => `<button type="button" class="chat-chip chat-chip-soft" data-chat-suggest="${escapeHtml(q)}">${escapeHtml(q)}</button>`)
              .join('')}
          </div>
        </div>`)
    }

    return `<div class="${classes.join(' ')}">${avatar}<div class="bubble">${escapeHtml(m.content)}${
      metaBits.length ? `<div class="msg-meta">${metaBits.join('')}</div>` : ''
    }</div></div>`
  }

  function renderChat() {
    const selected = getSelected()
    const messages = ensureChatHistory()
    const chatQuery = getChatQuery()
    const healthMode = chatQuery.topic === 'health'
    const prefill = chatQuery.q || app.dataset.chatDraft || ''
    const busy = app.dataset.chatBusy === '1'
    const cfg = window.PERYSHKO_AI_CONFIG || {}
    const suggestions =
      window.PeryshkoAI && window.PeryshkoAI.getSuggestions
        ? window.PeryshkoAI.getSuggestions(chatQuery.topic)
        : window.DEMO_SUGGESTIONS || []

    const displayMessages = busy
      ? [...messages, { id: 'typing', role: 'assistant', typing: true }]
      : messages

    return `
      <div class="chat-wrap">
        <div class="chat-shell">
          <div class="header-actions chat-top-nav">
            <button type="button" class="btn btn-ghost btn-sm" data-action="back">← Назад</button>
            <a class="btn btn-ghost btn-sm" href="#/" data-link>На главную</a>
            <button type="button" class="btn btn-ghost btn-sm" data-action="clear-chat">Очистить историю</button>
          </div>
          <div class="chat-header">
            <div class="chat-header-avatar">
              <img src="images/peryshko-avatar.png" alt="Перышко — милый попугайчик" />
            </div>
            <div class="chat-header-text">
              <h1>${escapeHtml(cfg.assistantName || 'Перышко 🪶')}</h1>
              <p class="chat-sub">${escapeHtml(cfg.assistantSubtitle || 'Твой умный помощник по уходу за попугаями')}</p>
              <p class="chat-tag">${escapeHtml(cfg.assistantTagline || 'Всегда рядом, когда нужен совет 💚')}</p>
            </div>
          </div>

          ${
            cfg.showDemoBanner !== false
              ? `<div class="chat-demo-flag" role="status">📚 ${escapeHtml(
                  cfg.demoBannerText ||
                    'Ответы собраны из материалов справочника «Попугайка» — это не нейросеть',
                )}</div>`
              : ''
          }

          ${
            healthMode
              ? banner(
                  'Тема: здоровье. Перышко не ставит диагноз и не назначает лечение. При опасных симптомах сразу обращайтесь к птичьему ветеринару.',
                  'danger',
                )
              : ''
          }

          <div class="chat-species-bar">
            <span>
              ${
                selected
                  ? `Персонализация: спрашиваем о <strong>${escapeHtml(selected.shortName || selected.name)}</strong>`
                  : 'Вид не выбран — ответы общие. <a href="#/catalog" data-link><strong>Выбрать попугая</strong></a>'
              }
            </span>
            ${
              selected
                ? `<a class="btn btn-ghost btn-sm" href="#/catalog" data-link>Сменить</a>`
                : ''
            }
          </div>

          <div class="suggestions" aria-label="Готовые вопросы">
            ${suggestions
              .map(
                (s) =>
                  `<button type="button" data-chat-suggest="${escapeHtml(s)}" ${busy ? 'disabled' : ''}>${escapeHtml(s)}</button>`,
              )
              .join('')}
          </div>

          <div class="chat-box" id="chat-box" role="log" aria-live="polite" aria-relevant="additions">
            ${displayMessages.map(renderChatMessage).join('')}
          </div>

          <div class="chat-composer">
            <form class="chat-form" id="chat-form">
              <textarea id="chat-input" rows="1" placeholder="Напиши свой вопрос Перышку..." autocomplete="off">${escapeHtml(prefill)}</textarea>
              <button class="btn btn-primary" type="submit" ${busy ? 'disabled' : ''} aria-label="Отправить">➤</button>
            </form>
          </div>
        </div>
      </div>`
  }

  function renderNotFound() {
    return `
      <div class="page-header">
        <div class="header-actions">
          <button type="button" class="btn btn-ghost btn-sm" data-action="back">← Назад</button>
          <a class="btn btn-ghost btn-sm" href="#/" data-link>На главную</a>
        </div>
      </div>
      <div class="card empty">
        <div class="big">🦜</div>
        <h1 style="font-family:var(--font-display)">Страница не найдена</h1>
        <p class="muted">Кажется, эта веточка обломилась.</p>
        <div class="hero-actions" style="justify-content:center">
          <a class="btn btn-primary" href="#/" data-link>На главную</a>
          <a class="btn btn-secondary" href="#/catalog" data-link>Каталог попугаев</a>
          <a class="btn btn-ghost" href="#/guide" data-link>В справочник</a>
        </div>
      </div>`
  }

  function render() {
    const { parts } = parseRoute()
    updateSelectedBar()
    updateNavActive()

    let html = ''
    const root = parts[0]

    if (!root) html = renderHome()
    else if (root === 'catalog') html = renderCatalog()
    else if (root === 'species' && parts[1]) html = renderSpecies(parts[1])
    else if (root === 'my-bird') html = renderMyBird()
    else if (root === 'nutrition' && parts[1]) html = renderFood(parts[1])
    else if (root === 'nutrition') html = renderNutrition()
    else if (root === 'care' && parts[1]) html = renderCareArticle(parts[1])
    else if (root === 'care') html = renderCareList()
    else if (root === 'behavior' && parts[1]) html = renderBehaviorTopic(parts[1])
    else if (root === 'behavior') html = renderBehaviorList()
    else if (root === 'health' && parts[1] === 'symptoms' && parts[2]) html = renderHealthSymptom(parts[2])
    else if (root === 'health' && parts[1] === 'symptoms') html = renderHealthSymptoms()
    else if (root === 'health' && parts[1] === 'safety' && parts[2]) html = renderHealthSafetyItem(parts[2])
    else if (root === 'health' && parts[1] === 'safety') html = renderHealthSafetyList()
    else if (root === 'health' && parts[1] === 'emergency') html = renderHealthEmergency()
    else if (root === 'health' && parts[1]) html = renderHealthArticle(parts[1])
    else if (root === 'health') html = renderHealthList()
    else if (root === 'training' && parts[1] === 'mistakes' && parts[2]) html = renderTrainingMistake(parts[2])
    else if (root === 'training' && parts[1] === 'mistakes') html = renderTrainingMistakes()
    else if (root === 'training' && parts[1] === 'body' && parts[2]) html = renderTrainingBody(parts[2])
    else if (root === 'training' && parts[1] === 'body') html = renderTrainingBodyList()
    else if (root === 'training' && parts[1]) html = renderTrainingLesson(parts[1])
    else if (root === 'training') html = renderTrainingList()
    else if (root === 'guide') html = renderGuide()
    else if (root === 'beginner') html = renderBeginner()
    else if (root === 'chat') html = renderChat()
    else html = renderNotFound()

    app.innerHTML = html
    bindPageEvents()
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function bindPageEvents() {
    const foodSearch = document.getElementById('food-search')
    if (foodSearch) {
      let timer
      foodSearch.addEventListener('input', () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          setNutritionQuery({ q: foodSearch.value })
        }, 220)
      })
      foodSearch.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') setNutritionQuery({ q: '' })
      })
    }

    const careSearch = document.getElementById('care-search')
    if (careSearch) {
      let timer
      careSearch.addEventListener('input', () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const value = careSearch.value.trim()
          location.hash = value ? `#/care?q=${encodeURIComponent(value)}` : '#/care'
        }, 200)
      })
    }

    const woodSearch = document.getElementById('care-wood-search')
    if (woodSearch) {
      let timer
      woodSearch.addEventListener('input', () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const { parts } = parseRoute()
          const section = parts[1] || 'perches'
          const value = woodSearch.value.trim()
          location.hash = value
            ? `#/care/${section}?wood=${encodeURIComponent(value)}`
            : `#/care/${section}`
        }, 200)
      })
    }

    const behaviorSearch = document.getElementById('behavior-search')
    if (behaviorSearch) {
      let timer
      behaviorSearch.addEventListener('input', () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          const value = behaviorSearch.value.trim()
          location.hash = value ? `#/behavior?q=${encodeURIComponent(value)}` : '#/behavior'
        }, 200)
      })
    }

    const guideSearch = document.getElementById('guide-search')
    if (guideSearch) {
      let timer
      guideSearch.addEventListener('input', () => {
        clearTimeout(timer)
        timer = setTimeout(() => {
          // Re-render guide keeping input focus/value via DOM value already set
          app.innerHTML = renderGuide()
          bindPageEvents()
          const again = document.getElementById('guide-search')
          if (again) {
            again.focus()
            const len = again.value.length
            again.setSelectionRange(len, len)
          }
        }, 160)
      })
    }

    const chatForm = document.getElementById('chat-form')
    if (chatForm) {
      const input = document.getElementById('chat-input')
      const autosize = () => {
        if (!input) return
        input.style.height = 'auto'
        input.style.height = `${Math.min(input.scrollHeight, 140)}px`
      }
      chatForm.addEventListener('submit', (e) => {
        e.preventDefault()
        if (!input) return
        const value = input.value
        input.value = ''
        autosize()
        delete app.dataset.chatDraft
        sendChat(value)
      })
      if (input) {
        autosize()
        input.addEventListener('input', autosize)
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            chatForm.requestSubmit()
          }
        })
        if (getChatQuery().q || app.dataset.chatDraft) {
          const len = input.value.length
          input.focus()
          input.setSelectionRange(len, len)
        }
      }
      const box = document.getElementById('chat-box')
      if (box) box.scrollTop = box.scrollHeight
    }
  }

  async function sendChat(text) {
    const content = String(text || '').trim()
    if (!content || app.dataset.chatBusy === '1') return

    app.dataset.lastChatUser = content
    delete app.dataset.chatDraft

    let messages = ensureChatHistory()
    messages.push({ id: `u-${Date.now()}`, role: 'user', content, ts: Date.now() })
    if (window.PeryshkoAI && window.PeryshkoAI.trimHistory) {
      messages = window.PeryshkoAI.trimHistory(messages)
    }
    saveJSON(STORAGE_CHAT, messages)

    // Убираем prefill из URL после отправки, чтобы не дублировать при ререндере
    if (location.hash.includes('?')) {
      history.replaceState(null, '', `${location.pathname}${location.search}#/chat`)
    }

    app.dataset.chatBusy = '1'
    render()

    try {
      const result =
        window.PeryshkoAI && window.PeryshkoAI.ask
          ? await window.PeryshkoAI.ask({
              message: content,
              speciesId: getSelectedId(),
              history: messages,
              topic: getChatQuery().topic,
            })
          : { ok: true, text: askLocal(content, getSelectedId()) }

      let next = ensureChatHistory()
      next.push({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: result.text || 'Не удалось получить ответ. Попробуй ещё раз.',
        error: result.ok === false,
        href: result.href || null,
        hrefLabel: result.hrefLabel || null,
        relatedQuestions: result.relatedQuestions || [],
        clarifying: result.clarifying || [],
        kind: result.kind || null,
        ts: Date.now(),
      })
      if (window.PeryshkoAI && window.PeryshkoAI.trimHistory) {
        next = window.PeryshkoAI.trimHistory(next)
      }
      saveJSON(STORAGE_CHAT, next)
    } catch {
      let next = ensureChatHistory()
      next.push({
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: 'Не удалось получить ответ. Попробуй ещё раз чуть позже.',
        error: true,
        ts: Date.now(),
      })
      saveJSON(STORAGE_CHAT, next)
    } finally {
      delete app.dataset.chatBusy
      render()
    }
  }

  document.body.addEventListener('click', (e) => {
    const target = e.target.closest('[data-link], [data-select-species], [data-action], [data-food-cat], [data-food-status], [data-beginner-species], [data-toggle-check], [data-chat-suggest], [data-care-check]')
    if (!target) return

    if (target.hasAttribute('data-link')) {
      // let hash navigation happen; prevent full reload if href missing hash handling
      return
    }

    if (target.hasAttribute('data-select-species')) {
      e.preventDefault()
      const id = target.getAttribute('data-select-species')
      setSelectedId(id)
      navigate(`/species/${id}`)
      return
    }

    if (target.hasAttribute('data-beginner-species')) {
      e.preventDefault()
      setSelectedId(target.getAttribute('data-beginner-species'))
      delete app.dataset.beginnerPick
      render()
      return
    }

    if (target.hasAttribute('data-food-cat')) {
      e.preventDefault()
      const cat = target.getAttribute('data-food-cat') || null
      setNutritionQuery({ category: cat || null, q: getNutritionQuery().q })
      return
    }

    if (target.hasAttribute('data-food-status')) {
      e.preventDefault()
      const st = target.getAttribute('data-food-status') || null
      setNutritionQuery({ status: st || null })
      return
    }

    if (target.hasAttribute('data-toggle-check')) {
      e.preventDefault()
      const selected = getSelected()
      if (!selected) return
      const itemId = target.getAttribute('data-toggle-check')
      const progress = getBeginnerProgress()
      const current = new Set(Array.isArray(progress[selected.id]) ? progress[selected.id] : [])
      if (current.has(itemId)) current.delete(itemId)
      else current.add(itemId)
      progress[selected.id] = Array.from(current)
      saveJSON(STORAGE_BEGINNER, progress)
      render()
      return
    }

    if (target.hasAttribute('data-care-check')) {
      e.preventDefault()
      const key = target.getAttribute('data-care-check')
      const itemId = target.getAttribute('data-care-item')
      const current = new Set(loadJSON(key, []))
      if (current.has(itemId)) current.delete(itemId)
      else current.add(itemId)
      saveJSON(key, Array.from(current))
      render()
      return
    }

    if (target.hasAttribute('data-chat-suggest')) {
      e.preventDefault()
      sendChat(target.getAttribute('data-chat-suggest'))
      return
    }

    const action = target.getAttribute('data-action')
    if (action === 'back') {
      e.preventDefault()
      location.hash = getParentHash()
    } else if (action === 'clear-species') {
      e.preventDefault()
      setSelectedId(null)
      navigate('/catalog')
    } else if (action === 'clear-chat') {
      e.preventDefault()
      if (confirm('Очистить историю переписки с Перышком?')) {
        delete app.dataset.chatBusy
        delete app.dataset.lastChatUser
        delete app.dataset.chatDraft
        if (window.PeryshkoAI && window.PeryshkoAI.resetContext) window.PeryshkoAI.resetContext()
        saveJSON(STORAGE_CHAT, defaultChat())
        render()
      }
    } else if (action === 'retry-chat') {
      e.preventDefault()
      const last = app.dataset.lastChatUser
      if (last) sendChat(last)
    } else if (action === 'beginner-pick') {
      e.preventDefault()
      app.dataset.beginnerPick = '1'
      render()
    } else if (action === 'clear-food-search') {
      e.preventDefault()
      setNutritionQuery({ q: '' })
    } else if (action === 'reset-nutrition') {
      e.preventDefault()
      location.hash = '#/nutrition'
    } else if (action === 'clear-care-search') {
      e.preventDefault()
      location.hash = '#/care'
    } else if (action === 'clear-wood-search') {
      e.preventDefault()
      const { parts } = parseRoute()
      location.hash = `#/care/${parts[1] || 'perches'}`
    } else if (action === 'reset-checklist') {
      e.preventDefault()
      const key = target.getAttribute('data-checklist-key')
      if (key) {
        saveJSON(key, [])
        render()
      }
    } else if (action === 'clear-behavior-search') {
      e.preventDefault()
      location.hash = '#/behavior'
    } else if (action === 'mark-lesson') {
      e.preventDefault()
      const selected = getSelected()
      if (!selected) return
      const lessonId = target.getAttribute('data-lesson-id')
      const current = new Set(getTrainingProgress(selected.id))
      current.add(lessonId)
      setTrainingProgress(selected.id, Array.from(current))
      render()
    } else if (action === 'unmark-lesson') {
      e.preventDefault()
      const selected = getSelected()
      if (!selected) return
      const lessonId = target.getAttribute('data-lesson-id')
      const current = new Set(getTrainingProgress(selected.id))
      current.delete(lessonId)
      setTrainingProgress(selected.id, Array.from(current))
      render()
    } else if (action === 'reset-training-progress') {
      e.preventDefault()
      const selected = getSelected()
      if (!selected) return
      if (confirm('Сбросить прогресс уроков для выбранного вида?')) {
        setTrainingProgress(selected.id, [])
        render()
      }
    } else if (action === 'calc-weight') {
      e.preventDefault()
      const prevEl = document.getElementById('weight-prev')
      const currEl = document.getElementById('weight-curr')
      const out = document.getElementById('weight-result')
      if (!prevEl || !currEl || !out) return
      const prev = Number(prevEl.value)
      const curr = Number(currEl.value)
      if (!Number.isFinite(prev) || !Number.isFinite(curr) || prev <= 0 || curr <= 0) {
        out.hidden = false
        out.className = 'weight-result warn-panel'
        out.innerHTML = '<strong>Проверьте числа.</strong> Вес должен быть больше нуля.'
        return
      }
      const diff = curr - prev
      const percent = (diff / prev) * 100
      const sign = diff > 0 ? '+' : ''
      out.hidden = false
      out.className = 'weight-result tip-card'
      out.innerHTML = `
        <strong>Изменение:</strong> ${sign}${diff.toFixed(1)} г<br />
        <strong>В процентах:</strong> ${sign}${percent.toFixed(1)} %<br />
        <span class="muted tiny">Это не диагноз. При необъяснимом снижении веса обратитесь к ветеринару.</span>`
    }
  })

  window.addEventListener('hashchange', render)

  // Boot
  if (!location.hash) location.hash = '#/'
  updateSelectedBar()
  render()
})()
