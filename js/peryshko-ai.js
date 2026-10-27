/**
 * Перышко — локальный помощник по справочнику «Попугайка».
 * Поиск по ключевым словам, синонимам и темам. Без внешних нейросетей.
 */
;(() => {
  const STORAGE_CONTEXT = 'popugaika-peryshko-context'

  const EMERGENCY_MARKERS = [
    'затрудненн', 'затруднённ', 'тяжело дыш', 'тяжелое дыха', 'не дыш', 'задых',
    'хрип', 'открытый клюв', 'открытым клювом', 'судорог', 'конвульс', 'кровотеч',
    'кровь из', 'отравлен', 'токсич', 'травм', 'перелом', 'резкая слабост',
    'резкой слабост', 'не держитс', 'не удержива', 'лежит на дне', 'на дне клетки',
    'не может сидеть', 'отказ от еды', 'отказался от еды', 'совсем не ест', 'не ест совсем',
  ]

  const DEFAULT_SUGGESTIONS = [
    '🍎 Что можно есть моему попугаю?',
    '🦜 Почему он кусается?',
    '🌿 Какие веточки безопасны?',
    '💚 Как приручить попугая?',
    '🧸 Какие игрушки подходят?',
    '❤️ Как понять, что птица заболела?',
  ]

  const HEALTH_SUGGESTIONS = [
    'Попугай тяжело дышит',
    'Отказывается от еды',
    'Когда срочно к ветеринару?',
    'Изменился помёт',
    '❤️ Как понять, что птица заболела?',
  ]

  const FOLLOWUP_MARKERS = [
    'а сколько', 'а как часто', 'а можно', 'а ему', 'а ей', 'а банан', 'а яблок',
    'а морков', 'сколько давать', 'как часто', 'а что насчёт', 'а насчет',
    'подробнее', 'а ещё', 'а еще', 'продолж', 'а это',
  ]

  const VAGUE_MARKERS = [
    'странно себя', 'странно ведёт', 'странно ведет', 'что-то не так', 'плохо себя',
    'непонятно ведёт', 'изменил поведение', 'ведёт себя странно', 'ведет себя странно',
    'что с ним', 'что с ней', 'помоги с попугаем',
  ]

  let dialogContext = loadContext()

  function cfg() {
    return window.PERYSHKO_AI_CONFIG || {}
  }

  function kb() {
    return window.PERYSHKO_KNOWLEDGE || { TOPICS: [], SYNONYMS: {}, STOP_WORDS: new Set(), SPECIES_ALIASES: {}, CLARIFY_PRESETS: {} }
  }

  function loadContext() {
    try {
      const raw = localStorage.getItem(STORAGE_CONTEXT)
      if (!raw) return emptyContext()
      const parsed = JSON.parse(raw)
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return emptyContext()
      return { ...emptyContext(), ...parsed }
    } catch {
      try {
        localStorage.removeItem(STORAGE_CONTEXT)
      } catch {
        /* ignore */
      }
      return emptyContext()
    }
  }

  function emptyContext() {
    return { topicId: null, foodId: null, category: null, speciesId: null, lastLink: null }
  }

  function saveContext(ctx) {
    dialogContext = ctx
    try {
      localStorage.setItem(STORAGE_CONTEXT, JSON.stringify(ctx))
    } catch {
      /* ignore */
    }
  }

  function resetContext() {
    saveContext(emptyContext())
  }

  function normalize(text) {
    return String(text || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/[«»„“”"'`]/g, ' ')
      .replace(/[?!.,;:()[\]{}<>…—–\-_/\\|+*=~@#$%^&]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  }

  /** Лёгкая стемминг-эвристика для русских словоформ (без внешних библиотек) */
  function stem(token) {
    let w = normalize(token)
    if (w.length < 4) return w
    const endings = [
      'иями', 'ями', 'ами', 'ией', 'ием', 'ом', 'ем', 'ой', 'ей', 'ую', 'юю', 'ая', 'яя',
      'ые', 'ие', 'ых', 'их', 'ым', 'им', 'ую', 'ёт', 'ет', 'ит', 'ат', 'ят', 'ал', 'ял',
      'ил', 'ыл', 'ть', 'ся', 'сь', 'ов', 'ев', 'ей', 'ий', 'ый', 'ое', 'ее', 'а', 'я',
      'у', 'ю', 'ы', 'и', 'е', 'о',
    ]
    for (const end of endings) {
      if (w.length - end.length >= 3 && w.endsWith(end)) {
        w = w.slice(0, -end.length)
        break
      }
    }
    return w
  }

  function tokenize(text) {
    const stop = kb().STOP_WORDS || new Set()
    return normalize(text)
      .split(' ')
      .map((t) => t.trim())
      .filter((t) => t && t.length > 1 && !stop.has(t))
      .map(stem)
  }

  function tokenMatch(a, b) {
    if (!a || !b) return false
    if (a === b) return true
    // Короткие корни («ор», «ив») не ищем как подстроку — иначе «корелла» → «орёт»
    if (a.length < 4 || b.length < 4) return false
    return a.includes(b) || b.includes(a)
  }

  function expandTokens(tokens) {
    const syn = kb().SYNONYMS || {}
    const out = new Set(tokens)
    tokens.forEach((t) => {
      Object.keys(syn).forEach((key) => {
        const keyStem = stem(key)
        const values = (syn[key] || []).map(stem)
        const hit = tokenMatch(t, keyStem) || values.some((ss) => tokenMatch(t, ss))
        if (hit) {
          out.add(keyStem)
          values.forEach((ss) => out.add(ss))
        }
      })
    })
    return Array.from(out)
  }

  function detectSpeciesMention(q) {
    const aliases = kb().SPECIES_ALIASES || {}
    for (const [id, list] of Object.entries(aliases)) {
      if (list.some((a) => q.includes(normalize(a)))) return id
    }
    return null
  }

  function speciesName(speciesId) {
    const s = window.getSpecies && window.getSpecies(speciesId)
    return s ? s.name : null
  }

  function speciesShort(speciesId) {
    const s = window.getSpecies && window.getSpecies(speciesId)
    return s ? s.shortName || s.name : null
  }

  function isEmergency(message) {
    const q = normalize(message)
    return EMERGENCY_MARKERS.some((m) => q.includes(normalize(m)))
  }

  function isFollowUp(message) {
    const q = normalize(message)
    if (q.split(' ').length <= 5 && FOLLOWUP_MARKERS.some((m) => q.includes(normalize(m)))) return true
    if (/^(а|и)\s+\S+/.test(q) && q.length < 40) return true
    return false
  }

  function isVague(message) {
    const q = normalize(message)
    return VAGUE_MARKERS.some((m) => q.includes(normalize(m)))
  }

  function getTopic(id) {
    return (kb().TOPICS || []).find((t) => t.id === id) || null
  }

  function scoreTopic(topic, q, tokens) {
    let score = 0
    const title = normalize(topic.title)
    if (q.includes(title)) score += 40

    ;(topic.phrases || []).forEach((p) => {
      if (q.includes(normalize(p))) score += 28
    })

    const keys = (topic.keywords || []).map(stem)
    tokens.forEach((t) => {
      keys.forEach((k) => {
        if (!k || !t) return
        if (t === k) score += 12
        else if (tokenMatch(t, k)) score += 7
      })
    })

    if (topic.category === 'health' && /здоров|болез|симптом|ветеринар/.test(q)) score += 4
    if (topic.category === 'nutrition' && /есть|корм|рацион|можно ли/.test(q)) score += 4
    if (topic.category === 'training' && /прируч|рукам|палец|довер/.test(q)) score += 4
    if (topic.category === 'behavior' && /почему|ведёт|ведет|делает/.test(q)) score += 3
    if (topic.category === 'care' && /клетк|уход|сон|купа|игруш/.test(q)) score += 3

    return score
  }

  function wholeWordIncludes(haystack, needle) {
    if (!needle || needle.length < 3) return false
    const re = new RegExp(`(?:^|\\s)${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:\\s|$)`)
    return re.test(haystack)
  }

  function searchFoods(q, tokens) {
    const foods = window.FOODS || []
    let best = null
    let bestScore = 0
    for (const food of foods) {
      const names = [food.name, ...(food.aliases || [])]
      for (const name of names) {
        const n = normalize(name)
        const ns = stem(name)
        if (!n) continue
        let score = 0
        // Только целое слово: иначе «груш» ловится внутри «игрушки»
        if (wholeWordIncludes(q, n) || wholeWordIncludes(q, ns)) score = 80 + n.length
        else if (tokens.some((t) => t === ns || t === n)) score = 70 + n.length
        else if (tokens.some((t) => tokenMatch(t, ns) && Math.abs(t.length - ns.length) <= 2)) {
          score = 55 + n.length
        }
        if (score > bestScore) {
          best = food
          bestScore = score
        }
      }
    }
    return bestScore >= 50 ? { food: best, score: bestScore } : null
  }

  function searchTopics(q, tokens) {
    const topics = kb().TOPICS || []
    return topics
      .map((topic) => ({ topic, score: scoreTopic(topic, q, tokens) }))
      .filter((x) => x.score >= 14)
      .sort((a, b) => b.score - a.score)
  }

  function emergencyResult(speciesId) {
    return finalizeResult({
      ok: true,
      kind: 'emergency',
      icon: '🚨',
      title: 'Срочная ситуация',
      text:
        'Это может быть опасно 🦜\n\nНе жди ответа помощника как замены осмотра.\n\nСрочно свяжись с ветеринаром, специализирующимся на птицах.\n\nЯ не ставлю диагноз и не назначаю лекарства. Пока ждёте помощи: уберите аэрозоли и дым, обеспечьте покой, не давайте препараты самостоятельно.',
      href: '#/health/emergency',
      hrefLabel: 'Открыть срочную помощь',
      relatedQuestions: ['Когда нужен ветеринар?', 'Признаки нездоровья', 'Отказывается от еды'],
    }, speciesId)
  }

  function clarifyResult(presetKey, speciesId) {
    const preset = (kb().CLARIFY_PRESETS || {})[presetKey]
    if (!preset) return unknownResult(speciesId, [])
    return finalizeResult({
      ok: true,
      kind: 'clarify',
      icon: '🦜',
      title: 'Уточним',
      text: preset.text,
      clarifying: preset.options || [],
      relatedQuestions: [],
    }, speciesId, { skipSpeciesLine: true })
  }

  function unknownResult(speciesId, nearTopics) {
    const related = (nearTopics || [])
      .slice(0, 3)
      .map((t) => t.title.replace(/^Почему |^Как /i, '').trim())
      .filter(Boolean)
    return finalizeResult({
      ok: true,
      kind: 'unknown',
      icon: '🦜',
      title: 'Пока не знаю точно',
      text:
        'Хм, кажется, я пока не знаю точного ответа на этот вопрос 🦜💚\n\nПопробуй сформулировать его немного иначе или выбери подходящую тему из нашего справочника.',
      href: '#/guide',
      hrefLabel: 'Открыть справочник',
      relatedQuestions: related.length
        ? related
        : ['Что можно есть моему попугаю?', 'Почему он кусается?', 'Как приручить попугая?'],
    }, speciesId)
  }

  function pullBehavior(id) {
    return window.getBehaviorTopic ? window.getBehaviorTopic(id) : (window.BEHAVIOR_TOPICS || []).find((t) => t.id === id)
  }

  function pullCare(id) {
    return window.getCareArticle ? window.getCareArticle(id) : (window.CARE_ARTICLES || []).find((a) => a.id === id)
  }

  function pullTraining(id) {
    const lessons = window.TRAINING_LESSONS || window.TRAINING_TOPICS || []
    return lessons.find((l) => l.id === id)
  }

  function pullSymptom(id) {
    return (window.HEALTH_SYMPTOMS || []).find((s) => s.id === id)
  }

  function pullHealthArticle(id) {
    const map = window.HEALTH_ARTICLES
    if (!map) return null
    return map[id] || null
  }

  function speciesHintLine(topic, speciesId) {
    if (!speciesId) return ''
    const name = speciesName(speciesId)
    if (!name) return ''
    const short = speciesShort(speciesId)
    if (topic && topic.sourceRef) {
      const ref = topic.sourceRef
      if (ref.type === 'behavior') {
        const data = pullBehavior(ref.id)
        const hint = data && data.speciesHints && data.speciesHints[speciesId]
        if (hint) return `Для вида «${name}»: ${hint}`
      }
      if (ref.type === 'care') {
        const data = pullCare(ref.id)
        const hint = data && data.speciesHints && data.speciesHints[speciesId]
        if (hint) return `Для вида «${name}»: ${hint}`
      }
    }
    return `Учитываю, что речь о ${short || name}.`
  }

  function buildFromTopic(topic, speciesId) {
    const ref = topic.sourceRef || {}
    let friendly = `${topic.icon || '🦜'} ${topic.title}`
    let explain = ''
    let tips = []
    let healthDisclaimer = ''

    if (ref.type === 'behavior') {
      const data = pullBehavior(ref.id)
      if (data) {
        friendly = `${data.icon || topic.icon || '🦜'} ${data.title}`
        explain = data.summary || ''
        tips = (data.howToRespond || data.means || []).slice(0, 3)
        if (topic.healthNote) {
          healthDisclaimer =
            'Если вместе с этим есть вялость, отказ от еды или другие тревожные признаки — это уже повод обратиться к птичьему ветеринару. Я не ставлю диагноз.'
        }
      }
    } else if (ref.type === 'care') {
      const data = pullCare(ref.id)
      if (data) {
        friendly = `${data.emoji || topic.icon || '🏡'} ${data.title}`
        explain = data.intro || ''
        tips = (data.subsections || []).slice(0, 3).map((s) => {
          const first = Array.isArray(s.content) ? s.content[0] : ''
          return first || s.title
        })
        if (data.tip) tips.push(data.tip)
      }
    } else if (ref.type === 'training') {
      const data = pullTraining(ref.id)
      if (data) {
        friendly = `${data.emoji || '💚'} ${data.title}`
        explain = data.summary || data.intro || data.description || 'Приручение строят на доверии, без принуждения.'
        const blocks = data.sections || data.blocks || data.subsections || []
        tips = blocks.slice(0, 3).map((b) => {
          const first = Array.isArray(b.items) ? b.items[0] : Array.isArray(b.content) ? b.content[0] : ''
          return first || b.title || b.summary || ''
        }).filter(Boolean)
        if (!tips.length && Array.isArray(data.tips)) tips = data.tips.slice(0, 3)
      }
    } else if (ref.type === 'training-list') {
      friendly = '💚 Как приручить попугая'
      explain =
        'Приручение — это постепенное завоевание доверия: спокойное присутствие, лакомства, короткие занятия и уважение к дистанции птицы. Сроков «за неделю» не бывает.'
      tips = [
        'Начни с адаптации и наблюдения за комфортом птицы.',
        'Не доставай из клетки силой и не наказывай.',
        'В разделе приручения есть пошаговые уроки.',
      ]
    } else if (ref.type === 'behavior-list') {
      friendly = '🦜 Давай уточним поведение'
      explain = 'В справочнике поведения много разных тем. Лучше выбрать ближайшую ситуацию — так ответ будет точнее.'
    } else if (ref.type === 'nutrition-general') {
      friendly = '🍎 Что можно есть'
      explain =
        'Основа рациона обычно — овощи и зелень; фрукты и ягоды — умеренно; зерно и орехи зависят от вида и не должны вытеснять овощи. Точные статусы продуктов смотри в энциклопедии питания.'
      tips = [
        'Открой энциклопедию: там статусы «можно / с осторожностью / нельзя».',
        'Если вид выбран, статусы учитывают твою птицу.',
        'Новые продукты вводи понемногу и наблюдай за реакцией.',
      ]
    } else if (ref.type === 'nutrition-forbidden') {
      friendly = '🚫 Что нельзя давать'
      explain =
        'Есть продукты, которые опасны для попугаев. Не опирайся на «человеческие» привычки — сверяйся со справочником. Например, авокадо относят к запрещённым.'
      tips = ['Открой категорию «Опасные продукты» в энциклопедии питания.']
    } else if (ref.type === 'nutrition-category') {
      const cat = (window.FOOD_CATEGORIES || []).find((c) => c.id === ref.category)
      friendly = `${(cat && cat.emoji) || topic.icon} ${(cat && cat.title) || topic.title}`
      explain = (cat && cat.description) || 'Смотри карточки продуктов в энциклопедии — там есть подготовка и предупреждения.'
      const foods = window.getFoodsByCategory ? window.getFoodsByCategory(ref.category).slice(0, 5) : []
      tips = foods.map((f) => {
        const st = window.getSpeciesFoodStatus ? window.getSpeciesFoodStatus(f, speciesId) : f.safetyStatus
        const label = (window.STATUS_TEXT && window.STATUS_TEXT[st]) || st
        return `${f.name}: ${label}`
      })
    } else if (ref.type === 'nutrition-new-food') {
      friendly = '🥗 Как предлагать новую пищу'
      explain =
        'Многие попугаи сначала насторожены к новому. Не заставляй есть: предлагай маленькие кусочки рядом с привычной едой, меняй подачу, сохраняй спокойствие. Если птица совсем не ест и вялая — это уже вопрос здоровья, а не «капризов».'
      tips = [
        'Предлагай новый продукт регулярно, но маленькими порциями.',
        'Не смешивай сразу много новинок.',
        'При отказе от еды вместе с вялостью — к птичьему ветеринару.',
      ]
    } else if (ref.type === 'health-symptoms') {
      friendly = '❤️ Признаки, на которые стоит обратить внимание'
      explain =
        'Я не ставлю диагноз. Справочник помогает заметить изменения: активность, аппетит, дыхание, помёт, оперение. Любые тревожные сочетания — повод связаться с птичьим ветеринаром.'
      tips = ['Открой список симптомов и срочную помощь в разделе здоровья.']
      healthDisclaimer = 'Помощник не заменяет осмотр врача.'
    } else if (ref.type === 'health-symptom') {
      const data = pullSymptom(ref.id)
      if (data) {
        friendly = `❤️ ${data.title}`
        explain = data.summary || data.description || ''
        const todo = data.whatToDo
        tips = Array.isArray(todo) ? todo.slice(0, 3) : todo ? [todo] : []
        healthDisclaimer = 'Это не диагноз. При ухудшении — птичий ветеринар.'
      }
    } else if (ref.type === 'health-article') {
      const data = pullHealthArticle(ref.id)
      if (data) {
        friendly = `❤️ ${data.title}`
        explain = data.summary || data.intro || ''
        tips = (data.keyPoints || data.points || []).slice(0, 3).map((p) => (typeof p === 'string' ? p : p.text || p.title || '')).filter(Boolean)
        healthDisclaimer = 'Справочная информация. Не заменяет ветеринара.'
      }
    } else if (ref.type === 'health-emergency') {
      return emergencyResult(speciesId)
    } else if (ref.type === 'health-safety') {
      friendly = '⚠️ Безопасность дома'
      explain = 'Дом для попугая может быть опасным: кухня, аэрозоли, некоторые растения, открытые окна, токсичные испарения. Проверь раздел безопасности.'
      tips = ['Убери аэрозоли и дым.', 'Проветривай без сквозняка.', 'Не оставляй птицу без присмотра вне клетки.']
    }

    const speciesLine = speciesHintLine(topic, speciesId)
    const parts = [
      friendly,
      '',
      explain,
      tips.length ? `\nЧто можно сделать:\n• ${tips.join('\n• ')}` : '',
      speciesLine ? `\n${speciesLine}` : '',
      healthDisclaimer ? `\n${healthDisclaimer}` : '',
    ].filter(Boolean)

    const related = (topic.related || [])
      .map((id) => getTopic(id))
      .filter(Boolean)
      .slice(0, 3)
      .map((t) => t.title)

    return finalizeResult({
      ok: true,
      kind: topic.category || 'topic',
      icon: topic.icon,
      title: topic.title,
      text: parts.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
      href: topic.link,
      hrefLabel: topic.linkLabel || 'Открыть в справочнике',
      relatedQuestions: related,
      topicId: topic.id,
    }, speciesId, { skipSpeciesLine: true })
  }

  function buildFoodAnswer(food, speciesId) {
    const status = window.getSpeciesFoodStatus
      ? window.getSpeciesFoodStatus(food, speciesId || null)
      : food.safetyStatus
    const statusText =
      (window.STATUS_TEXT && window.STATUS_TEXT[status]) ||
      ({ safe: 'Можно при указанных условиях', caution: 'С осторожностью', unsafe: 'Нельзя', unknown: 'Информация уточняется' }[status] || '')

    const name = speciesName(speciesId)
    const opener = name
      ? `Спросила(а) про ${food.name.toLowerCase()} для вида «${name}» — хороший вопрос 🦜💚`
      : `Про ${food.name.toLowerCase()} есть проверенная карточка в энциклопедии 🦜💚`

    const parts = [
      `${food.emoji || '🥗'} ${food.name}`,
      '',
      opener,
      '',
      `Статус: ${statusText}.`,
      food.canGive ? `\n${food.canGive}` : '',
      food.preparation ? `\nПодготовка: ${food.preparation}` : '',
      food.frequency ? `\nКак часто: ${food.frequency}` : '',
      food.warnings ? `\nВажно: ${food.warnings}` : '',
    ]

    saveContext({
      ...dialogContext,
      foodId: food.id,
      topicId: null,
      category: 'nutrition',
      speciesId: speciesId || dialogContext.speciesId,
      lastLink: `#/nutrition/${food.id}`,
    })

    return finalizeResult({
      ok: true,
      kind: 'food',
      icon: food.emoji || '🥗',
      title: food.name,
      text: parts.join('\n').replace(/\n{3,}/g, '\n\n').trim(),
      href: `#/nutrition/${food.id}`,
      hrefLabel: 'Подробнее о питании',
      relatedQuestions: [
        'Что можно есть моему попугаю?',
        'Какие продукты нельзя?',
        'Как приучить к новой пище?',
      ],
      foodId: food.id,
    }, speciesId, { skipSpeciesLine: true })
  }

  function finalizeResult(result, speciesId, options = {}) {
    if (!options.skipSpeciesLine && speciesId && result.kind !== 'clarify') {
      const short = speciesShort(speciesId)
      if (short && result.text && !result.text.includes(short) && !/Учитываю|Для /.test(result.text)) {
        result.text = `${result.text}\n\nСейчас выбран вид: ${speciesName(speciesId)}.`
      }
    }
    if (!result.relatedQuestions) result.relatedQuestions = []
    if (!result.clarifying) result.clarifying = []
    result.mode = 'local'
    return result
  }

  function applyFollowUp(message, speciesId) {
    const q = normalize(message)
    if (dialogContext.foodId && window.getFoodById) {
      const food = window.getFoodById(dialogContext.foodId)
      if (food) {
        if (/скольк|часто|порц|много|мало/.test(q)) {
          const text = [
            `Продолжаем про ${food.name.toLowerCase()} 🦜💚`,
            '',
            food.frequency || 'Точная «универсальная порция» зависит от размера птицы и всего рациона — в карточке продукта есть ориентир по частоте.',
            food.canGive ? `\n${food.canGive}` : '',
            '\nНе заменяй овощную основу одним лакомством.',
          ].join('\n')
          return finalizeResult({
            ok: true,
            kind: 'food-followup',
            text,
            href: `#/nutrition/${food.id}`,
            hrefLabel: 'Открыть карточку продукта',
            relatedQuestions: ['Как приучить к новой пище?', 'Что можно есть моему попугаю?'],
          }, speciesId, { skipSpeciesLine: true })
        }
        return buildFoodAnswer(food, speciesId)
      }
    }
    if (dialogContext.topicId) {
      const topic = getTopic(dialogContext.topicId)
      if (topic) return buildFromTopic(topic, speciesId)
    }
    return null
  }

  function searchLocalKnowledge(message, speciesId, options = {}) {
    const content = String(message || '').trim()
    if (!content) {
      return { ok: false, kind: 'error', text: 'Напиши вопрос — пустое сообщение отправить нельзя.' }
    }

    const mentioned = detectSpeciesMention(content)
    const effectiveSpecies = mentioned || speciesId || dialogContext.speciesId || null
    const q = normalize(content)
    const tokens = expandTokens(tokenize(content))

    if (isEmergency(content)) {
      saveContext({ ...dialogContext, category: 'health', topicId: 'health-emergency', speciesId: effectiveSpecies })
      return emergencyResult(effectiveSpecies)
    }

    if (isFollowUp(content)) {
      const followed = applyFollowUp(content, effectiveSpecies)
      if (followed) return followed
    }

    if (isVague(content) && !/кус|крич|дыш|ест|рукам|прируч/.test(q)) {
      const healthish = /бол|здоров|вял|плох/.test(q)
      return clarifyResult(healthish ? 'vague_health' : 'vague_behavior', effectiveSpecies)
    }

    const foodHit = searchFoods(q, tokens)
    const topicHits = searchTopics(q, tokens)
    const topTopicScore = topicHits[0] ? topicHits[0].score : 0

    // Явное упоминание продукта важнее общей темы
    if (foodHit && (foodHit.score >= 70 || foodHit.score >= topTopicScore)) {
      return buildFoodAnswer(foodHit.food, effectiveSpecies)
    }

    if (topicHits.length) {
      const best = topicHits[0]
      if (best.topic.clarify && best.score < 30) {
        return clarifyResult('vague_behavior', effectiveSpecies)
      }
      if (best.topic.urgent) {
        saveContext({ ...dialogContext, topicId: best.topic.id, category: best.topic.category, speciesId: effectiveSpecies, lastLink: best.topic.link })
        return buildFromTopic(best.topic, effectiveSpecies)
      }
      saveContext({
        ...dialogContext,
        topicId: best.topic.id,
        foodId: null,
        category: best.topic.category,
        speciesId: effectiveSpecies,
        lastLink: best.topic.link,
      })
      return buildFromTopic(best.topic, effectiveSpecies)
    }

    // Фоллбэк: старые демо-ответы, если есть точное совпадение
    if (typeof window.findDemoAnswer === 'function') {
      const demo = window.findDemoAnswer(content, effectiveSpecies)
      if (demo) {
        return finalizeResult({
          ok: true,
          kind: 'demo',
          text: demo.answer,
          href: '#/guide',
          hrefLabel: 'Открыть справочник',
          relatedQuestions: DEFAULT_SUGGESTIONS.slice(0, 3).map((s) => s.replace(/^..\s/, '')),
        }, effectiveSpecies)
      }
    }

    return unknownResult(
      effectiveSpecies,
      topicHits.map((h) => h.topic),
    )
  }

  async function ask(options) {
    const { message, speciesId } = options || {}
    const content = String(message || '').trim()
    if (!content) {
      return { ok: false, kind: 'error', text: 'Напиши вопрос — пустое сообщение отправить нельзя.' }
    }
    await new Promise((r) => setTimeout(r, 220))
    return searchLocalKnowledge(content, speciesId, options)
  }

  function buildWelcome(species) {
    if (species && species.name) {
      const form = species.name.toLowerCase()
      return `Привет! 🦜💚\n\nЯ Перышко — твой помощник!\n\nВижу, что у тебя ${form}. Можешь спрашивать меня о питании, уходе, поведении и приручении.\n\nЧем помочь сегодня?`
    }
    return `Привет! 🦜💚\n\nЯ Перышко — твой помощник по уходу за попугаями!\n\nМожешь спросить о питании, поведении, приручении или содержании.\n\nЕсли выберешь вид в каталоге, ответы станут точнее.\n\nЧем помочь сегодня?`
  }

  function getSuggestions(topic) {
    if (topic === 'health') return HEALTH_SUGGESTIONS.slice()
    return DEFAULT_SUGGESTIONS.slice()
  }

  function trimHistory(messages, max) {
    const limit = max || cfg().maxHistoryMessages || 40
    const list = Array.isArray(messages) ? messages.slice() : []
    if (list.length <= limit) return list
    const welcome = list.find((m) => m.id === 'welcome')
    const rest = list.filter((m) => m.id !== 'welcome').slice(-(limit - (welcome ? 1 : 0)))
    return welcome ? [welcome, ...rest] : rest
  }

  /** Для автотестов качества поиска */
  function debugSearch(message, speciesId) {
    const q = normalize(message)
    const tokens = expandTokens(tokenize(message))
    return {
      q,
      tokens,
      emergency: isEmergency(message),
      food: searchFoods(q, tokens),
      topics: searchTopics(q, tokens).slice(0, 5),
      result: searchLocalKnowledge(message, speciesId),
    }
  }

  window.PeryshkoAI = {
    ask,
    searchLocalKnowledge,
    isEmergency,
    buildWelcome,
    getSuggestions,
    trimHistory,
    resetContext,
    getContext: () => ({ ...dialogContext }),
    debugSearch,
  }
})()
