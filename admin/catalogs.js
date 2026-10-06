/* 可复用资料库：问题、穴位以及它们与方法的关联。 */
window.XqnCatalogs = (() => {
  let api
  let toast
  let bodyAreas = []
  let getEditing
  let getCsrf
  let getMethods
  let refreshContents
  let problems = []
  let points = []
  let catalogEditing = null
  let configured = false

  const $ = selector => document.querySelector(selector)
  const esc = value => String(value ?? '').replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[character]))
  const clone = value => JSON.parse(JSON.stringify(value))
  const list = value => Array.isArray(value)
    ? value.filter(Boolean)
    : String(value || '').split(/[\n,，;；]+/).map(item => item.trim()).filter(Boolean)
  const id = prefix => `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`

  function blankProblem() {
    return { id: id('PRB'), name: '', aliases: [], description: '', bodyAreaIds: [], needAsk: '', dangerNotice: '', notes: '', methodLinks: [], status: 'draft' }
  }

  function blankPoint() {
    return {
      id: id('PNT'), name: '', aliases: [], bodyAreaId: '', professionalLocation: '', everydayLocation: '',
      contentHtml: '', commonMistakes: '', notices: '', sourceTitle: '', sourceText: '', sourceNotes: '', status: 'draft'
    }
  }

  function normalizeProblem(value) {
    return {
      ...blankProblem(), ...value, aliases: list(value.aliases), bodyAreaIds: list(value.bodyAreaIds),
      methodLinks: (value.methodLinks || []).map((link, order) => ({
        contentId: link.contentId, order, evidenceType: link.evidenceType || 'pending',
        evidenceText: link.evidenceText || '', method: link.method
      }))
    }
  }

  function normalizePoint(value) {
    return { ...blankPoint(), ...value, aliases: list(value.aliases) }
  }

  async function load() {
    const [problemResult, pointResult] = await Promise.all([
      api('/api/admin/problems'), api('/api/admin/points')
    ])
    problems = (problemResult.problems || []).map(normalizeProblem)
    points = (pointResult.points || []).map(normalizePoint)
    renderCounts()
    renderProblems()
    renderPoints()
    renderRelations()
  }

  function renderCounts() {
    $('#count-problems').textContent = problems.length
    $('#count-points').textContent = points.length
  }

  function statusLabel(status) {
    return status === 'verified' ? '已审核' : status === 'archived' ? '已归档' : '草稿'
  }

  function renderProblems() {
    $('#problem-list-summary').textContent = `${problems.length} 条`
    $('#problem-list').innerHTML = problems.length ? problems.map(problem => `
      <article class="catalog-row">
        <div class="content-icon article">问</div>
        <div class="content-name"><strong>${esc(problem.name || '未命名问题')}</strong><span>${esc(problem.aliases.join('、') || '还没有用户表达')}</span></div>
        <div class="catalog-meta">${problem.methodLinks.length} 个方法 · ${esc(problem.bodyAreaIds.map(areaName).join('、') || '未选位置')}</div>
        <span class="status ${problem.status === 'verified' ? 'ready' : ''}">${statusLabel(problem.status)}</span>
        <button class="edit-button" data-edit-problem="${problem.id}">编辑</button>
      </article>`).join('') : empty('还没有问题', '点击右上角“新建问题”。')
  }

  function renderPoints() {
    $('#point-list-summary').textContent = `${points.length} 条`
    $('#point-list').innerHTML = points.length ? points.map(point => `
      <article class="catalog-row">
        <div class="content-icon skill">穴</div>
        <div class="content-name"><strong>${esc(point.name || '未命名穴位')}</strong><span>${esc(point.aliases.join('、') || '标准穴位资料')}</span></div>
        <div class="catalog-meta">${esc(areaName(point.bodyAreaId) || '未选位置')}</div>
        <span class="status ${point.status === 'verified' ? 'ready' : ''}">${statusLabel(point.status)}</span>
        <button class="edit-button" data-edit-point="${point.id}">编辑</button>
      </article>`).join('') : empty('还没有穴位', '点击右上角“新建穴位”。')
  }

  function empty(title, copy) {
    return `<div class="empty"><div><strong>${title}</strong><span>${copy}</span></div></div>`
  }

  function areaName(areaId) {
    return bodyAreas.find(area => area.id === areaId)?.name || ''
  }

  function openProblem(problem = blankProblem()) {
    catalogEditing = { kind: 'problem', value: normalizeProblem(clone(problem)) }
    $('#catalog-editor-layer').hidden = false
    $('#problem-form').hidden = false
    $('#point-form').hidden = true
    $('#catalog-editor-kind').textContent = '问题库'
    $('#catalog-editor-title').textContent = problem.name || '新建问题'
    const form = $('#problem-form')
    form.elements.name.value = catalogEditing.value.name
    form.elements.aliases.value = catalogEditing.value.aliases.join('\n')
    form.elements.description.value = catalogEditing.value.description
    form.elements.needAsk.value = catalogEditing.value.needAsk
    form.elements.dangerNotice.value = catalogEditing.value.dangerNotice
    form.elements.notes.value = catalogEditing.value.notes
    renderProblemAreas()
    renderProblemMethods()
  }

  function openPoint(point = blankPoint()) {
    catalogEditing = { kind: 'point', value: normalizePoint(clone(point)) }
    $('#catalog-editor-layer').hidden = false
    $('#problem-form').hidden = true
    $('#point-form').hidden = false
    $('#catalog-editor-kind').textContent = '穴位库'
    $('#catalog-editor-title').textContent = point.name || '新建穴位'
    const form = $('#point-form')
    for (const field of ['name', 'professionalLocation', 'everydayLocation', 'commonMistakes', 'notices', 'sourceTitle', 'sourceText', 'sourceNotes']) {
      form.elements[field].value = catalogEditing.value[field] || ''
    }
    form.elements.aliases.value = catalogEditing.value.aliases.join('、')
    form.elements.bodyAreaId.value = catalogEditing.value.bodyAreaId
    $('#point-content').innerHTML = catalogEditing.value.contentHtml || ''
  }

  function closeEditor() {
    $('#catalog-editor-layer').hidden = true
    catalogEditing = null
  }

  function renderProblemAreas() {
    const selected = new Set(catalogEditing?.value.bodyAreaIds || [])
    $('#problem-area-picker').innerHTML = bodyAreas.map(area => `
      <button type="button" class="${selected.has(area.id) ? 'selected' : ''}" data-problem-area="${area.id}">${selected.has(area.id) ? '✓ ' : '＋ '}${esc(area.name)}</button>
    `).join('')
  }

  function availableMethods() {
    return (getMethods?.() || []).filter(method => method.type === 'skill' && method.status !== 'archived')
  }

  function renderProblemMethods() {
    if (catalogEditing?.kind !== 'problem') return
    const selected = new Set(catalogEditing.value.methodLinks.map(link => link.contentId))
    const methods = availableMethods()
    $('#problem-method-picker').innerHTML = methods.length ? methods.map(method => `
      <button type="button" class="${selected.has(method.id) ? 'selected' : ''}" data-problem-link-method="${method.id}">${selected.has(method.id) ? '✓' : '＋'} ${esc(method.methodName || method.title || '未命名方法')}</button>
    `).join('') : '<span>方法库还没有可关联的方法</span>'
    $('#problem-selected-methods').innerHTML = catalogEditing.value.methodLinks.map((link, index) => {
      const method = methods.find(value => value.id === link.contentId) || link.method || {}
      return `<article class="relation-card">
        <header><strong>${index + 1}. ${esc(method.methodName || method.title || '未知方法')}</strong><span>${esc(method.status === 'published' ? '已发布' : method.status === 'ready' ? '待发布' : '草稿')}</span><button type="button" data-problem-unlink-method="${link.contentId}">移除</button></header>
        <label><span>关联依据</span><select data-problem-method-evidence="${link.contentId}">
          <option value="direct" ${link.evidenceType === 'direct' ? 'selected' : ''}>原文明确推荐</option>
          <option value="case" ${link.evidenceType === 'case' ? 'selected' : ''}>案例中使用</option>
          <option value="author" ${link.evidenceType === 'author' ? 'selected' : ''}>作者观点</option>
          <option value="pending" ${link.evidenceType === 'pending' ? 'selected' : ''}>待人工确认</option>
        </select></label>
        <label><span>直接依据</span><textarea rows="2" data-problem-method-evidence-text="${link.contentId}" placeholder="粘贴支持该问题与方法关联的原文">${esc(link.evidenceText)}</textarea></label>
      </article>`
    }).join('')
  }

  function readCatalogForm() {
    if (!catalogEditing) return
    if (catalogEditing.kind === 'problem') {
      const form = $('#problem-form')
      catalogEditing.value.name = form.elements.name.value.trim()
      catalogEditing.value.aliases = list(form.elements.aliases.value)
      catalogEditing.value.description = form.elements.description.value.trim()
      catalogEditing.value.needAsk = form.elements.needAsk.value.trim()
      catalogEditing.value.dangerNotice = form.elements.dangerNotice.value.trim()
      catalogEditing.value.notes = form.elements.notes.value.trim()
    } else {
      const form = $('#point-form')
      for (const field of ['name', 'bodyAreaId', 'professionalLocation', 'everydayLocation', 'commonMistakes', 'notices', 'sourceTitle', 'sourceText', 'sourceNotes']) {
        catalogEditing.value[field] = form.elements[field].value.trim()
      }
      catalogEditing.value.aliases = list(form.elements.aliases.value)
      catalogEditing.value.contentHtml = $('#point-content').innerHTML.trim()
    }
  }

  async function saveCatalog(verify) {
    readCatalogForm()
    const kind = catalogEditing.kind
    const singular = kind === 'problem' ? 'problem' : 'point'
    const plural = kind === 'problem' ? 'problems' : 'points'
    const result = await api(`/api/admin/${plural}`, {
      method: 'POST', body: JSON.stringify({ [singular]: catalogEditing.value })
    })
    if (verify) {
      if ((result.missing || []).length) throw new Error(`还有 ${result.missing.length} 项需要补充`)
      await api(`/api/admin/${plural}/${encodeURIComponent(catalogEditing.value.id)}/verify`, {
        method: 'POST', body: '{}'
      })
    }
    if (kind === 'problem') await refreshContents?.()
    await load()
    closeEditor()
    toast(verify ? '已保存并通过审核' : '草稿已保存')
  }

  function normalizeLinks(item) {
    item.pointLinks = (item.pointLinks || []).map((link, order) => ({
      pointId: link.pointId, order, instruction: link.instruction || '',
      point: link.point || points.find(value => value.id === link.pointId)
    }))
    item.problemLinks = (item.problemLinks || []).map((link, order) => ({
      problemId: link.problemId, order, evidenceType: link.evidenceType || 'pending',
      evidenceText: link.evidenceText || '',
      problem: link.problem || problems.find(value => value.id === link.problemId)
    }))
    return item
  }

  function renderRelations() {
    const item = getEditing?.()
    if (!item) return
    normalizeLinks(item)
    const selectedProblemIds = new Set(item.problemLinks.map(link => link.problemId))
    const selectedPointIds = new Set(item.pointLinks.map(link => link.pointId))
    $('#problem-picker').innerHTML = problems.length ? problems.map(problem => `
      <button type="button" class="${selectedProblemIds.has(problem.id) ? 'selected' : ''}" data-link-problem="${problem.id}">${selectedProblemIds.has(problem.id) ? '✓' : '＋'} ${esc(problem.name)}</button>
    `).join('') : '<span>请先在问题库建立问题</span>'
    $('#point-picker').innerHTML = points.length ? points.map(point => `
      <button type="button" class="${selectedPointIds.has(point.id) ? 'selected' : ''}" data-link-point="${point.id}">${selectedPointIds.has(point.id) ? '✓' : '＋'} ${esc(point.name)}</button>
    `).join('') : '<span>请先在穴位库建立穴位</span>'
    $('#selected-problems').innerHTML = item.problemLinks.map((link, index) => `
      <article class="relation-card">
        <header><strong>${index + 1}. ${esc(link.problem?.name || '未知问题')}</strong><button type="button" data-unlink-problem="${link.problemId}">移除</button></header>
        <label><span>关联依据</span><select data-problem-evidence="${link.problemId}">
          <option value="direct" ${link.evidenceType === 'direct' ? 'selected' : ''}>原文明确推荐</option>
          <option value="case" ${link.evidenceType === 'case' ? 'selected' : ''}>案例中使用</option>
          <option value="author" ${link.evidenceType === 'author' ? 'selected' : ''}>作者观点</option>
          <option value="pending" ${link.evidenceType === 'pending' ? 'selected' : ''}>待人工确认</option>
        </select></label>
        <label><span>直接依据</span><textarea rows="2" data-problem-evidence-text="${link.problemId}" placeholder="粘贴能支持这条关联的原文">${esc(link.evidenceText)}</textarea></label>
      </article>`).join('')
    $('#selected-points').innerHTML = item.pointLinks.map((link, index) => `
      <article class="relation-card point-relation-card">
        <header><strong>${index + 1}. ${esc(link.point?.name || '未知穴位')}</strong><span>${esc(link.point?.status === 'verified' ? '定位已审核' : '定位待审核')}</span><button type="button" data-unlink-point="${link.pointId}">移除</button></header>
        <label><span>在这个方法中怎么使用</span><textarea rows="2" data-point-instruction="${link.pointId}" placeholder="只写本方法的顺序、动作、力度或时间">${esc(link.instruction)}</textarea></label>
      </article>`).join('')
  }

  function relationPreviewHtml(item) {
    normalizeLinks(item)
    if (!item.pointLinks.length) return ''
    return `<section><h2>本方法使用的位置</h2><div class="pv-point-list">${item.pointLinks.map(link => `
      <article><div><strong>${esc(link.point?.name || '未知穴位')}</strong><span>${esc(areaName(link.point?.bodyAreaId))}</span></div>
      ${link.instruction ? `<p>${esc(link.instruction)}</p>` : ''}
      <details><summary>查看怎么找</summary><p><b>普通人取穴：</b>${esc(link.point?.everydayLocation || '待补充')}</p><p><b>专业定位：</b>${esc(link.point?.professionalLocation || '待补充')}</p></details></article>
    `).join('')}</div></section>`
  }

  function bindRelations() {
    $('#problem-picker').onclick = event => {
      const button = event.target.closest('[data-link-problem]')
      const item = getEditing?.()
      if (!button || !item) return
      normalizeLinks(item)
      const problemId = button.dataset.linkProblem
      if (!item.problemLinks.some(link => link.problemId === problemId)) {
        item.problemLinks.push({ problemId, evidenceType: 'pending', evidenceText: '', problem: problems.find(value => value.id === problemId) })
      }
      renderRelations()
    }
    $('#point-picker').onclick = event => {
      const button = event.target.closest('[data-link-point]')
      const item = getEditing?.()
      if (!button || !item) return
      normalizeLinks(item)
      const pointId = button.dataset.linkPoint
      if (!item.pointLinks.some(link => link.pointId === pointId)) {
        item.pointLinks.push({ pointId, instruction: '', point: points.find(value => value.id === pointId) })
      }
      renderRelations()
    }
    $('#selected-problems').oninput = event => {
      const item = getEditing?.()
      const id = event.target.dataset.problemEvidence || event.target.dataset.problemEvidenceText
      const link = item?.problemLinks.find(value => value.problemId === id)
      if (!link) return
      if (event.target.dataset.problemEvidence) link.evidenceType = event.target.value
      if (event.target.dataset.problemEvidenceText) link.evidenceText = event.target.value
    }
    $('#selected-problems').onclick = event => {
      const button = event.target.closest('[data-unlink-problem]')
      const item = getEditing?.()
      if (!button || !item) return
      item.problemLinks = item.problemLinks.filter(link => link.problemId !== button.dataset.unlinkProblem)
      renderRelations()
    }
    $('#selected-points').oninput = event => {
      const id = event.target.dataset.pointInstruction
      const link = getEditing?.()?.pointLinks.find(value => value.pointId === id)
      if (link) link.instruction = event.target.value
    }
    $('#selected-points').onclick = event => {
      const button = event.target.closest('[data-unlink-point]')
      const item = getEditing?.()
      if (!button || !item) return
      item.pointLinks = item.pointLinks.filter(link => link.pointId !== button.dataset.unlinkPoint)
      renderRelations()
    }
  }

  function bindPointRichEditor() {
    $('#point-toolbar').onclick = event => {
      const button = event.target.closest('[data-command]')
      if (!button) return
      event.preventDefault()
      $('#point-content').focus()
      document.execCommand(button.dataset.command, false, button.dataset.value || null)
    }
    $('#point-media-upload').onchange = async event => {
      const picker = event.target
      const files = [...(picker.files || [])]
      picker.disabled = true
      try {
        for (const file of files) {
          const response = await fetch('/api/upload?name=' + encodeURIComponent(file.name), {
            method: 'POST', credentials: 'same-origin',
            headers: { 'Content-Type': file.type, 'X-CSRF-Token': getCsrf() }, body: file
          })
          const result = await response.json().catch(() => ({}))
          if (!response.ok) throw new Error(result.error || '素材保存失败')
          const caption = prompt(`请填写“${file.name}”准确表达的位置：`, file.name) || file.name
          const html = file.type.startsWith('video/')
            ? `<video src="${esc(result.url)}" controls></video><p class="media-caption">${esc(caption)}</p>`
            : `<img src="${esc(result.url)}" alt="${esc(caption)}"><p class="media-caption">${esc(caption)}</p>`
          $('#point-content').insertAdjacentHTML('beforeend', html)
        }
        toast(`已插入 ${files.length} 个定位素材`)
      } catch (error) {
        toast(error.message)
      } finally {
        picker.disabled = false
        picker.value = ''
      }
    }
  }

  function configure(dependencies) {
    api = dependencies.api
    toast = dependencies.toast
    bodyAreas = dependencies.bodyAreas
    getEditing = dependencies.getEditing
    getCsrf = dependencies.getCsrf
    getMethods = dependencies.getMethods
    refreshContents = dependencies.refreshContents
    $('#point-body-area').innerHTML = '<option value="">请选择</option>' + bodyAreas.map(area => `<option value="${area.id}">${esc(area.name)}</option>`).join('')
    if (configured) return
    configured = true
    bindRelations()
    bindPointRichEditor()
    $('#problem-list').onclick = event => {
      const button = event.target.closest('[data-edit-problem]')
      if (button) openProblem(problems.find(value => value.id === button.dataset.editProblem))
    }
    $('#point-list').onclick = event => {
      const button = event.target.closest('[data-edit-point]')
      if (button) openPoint(points.find(value => value.id === button.dataset.editPoint))
    }
    $('#problem-area-picker').onclick = event => {
      const button = event.target.closest('[data-problem-area]')
      if (!button || catalogEditing?.kind !== 'problem') return
      const values = catalogEditing.value.bodyAreaIds
      const index = values.indexOf(button.dataset.problemArea)
      if (index >= 0) values.splice(index, 1); else values.push(button.dataset.problemArea)
      renderProblemAreas()
    }
    $('#problem-method-picker').onclick = event => {
      const button = event.target.closest('[data-problem-link-method]')
      if (!button || catalogEditing?.kind !== 'problem') return
      const contentId = button.dataset.problemLinkMethod
      if (!catalogEditing.value.methodLinks.some(link => link.contentId === contentId)) {
        const method = availableMethods().find(value => value.id === contentId)
        catalogEditing.value.methodLinks.push({ contentId, evidenceType: 'pending', evidenceText: '', method })
      }
      renderProblemMethods()
    }
    $('#problem-selected-methods').oninput = event => {
      if (catalogEditing?.kind !== 'problem') return
      const contentId = event.target.dataset.problemMethodEvidence || event.target.dataset.problemMethodEvidenceText
      const link = catalogEditing.value.methodLinks.find(value => value.contentId === contentId)
      if (!link) return
      if (event.target.dataset.problemMethodEvidence) link.evidenceType = event.target.value
      if (event.target.dataset.problemMethodEvidenceText) link.evidenceText = event.target.value
    }
    $('#problem-selected-methods').onclick = event => {
      const button = event.target.closest('[data-problem-unlink-method]')
      if (!button || catalogEditing?.kind !== 'problem') return
      catalogEditing.value.methodLinks = catalogEditing.value.methodLinks.filter(link => link.contentId !== button.dataset.problemUnlinkMethod)
      renderProblemMethods()
    }
    $('#close-catalog-editor').onclick = closeEditor
    $('#save-problem-draft').onclick = () => saveCatalog(false).catch(error => toast(error.message))
    $('#save-point-draft').onclick = () => saveCatalog(false).catch(error => toast(error.message))
    $('#problem-form').onsubmit = event => { event.preventDefault(); saveCatalog(true).catch(error => toast(error.message)) }
    $('#point-form').onsubmit = event => { event.preventDefault(); saveCatalog(true).catch(error => toast(error.message)) }
  }

  return {
    configure, load, openProblem, openPoint, renderRelations, relationPreviewHtml,
    normalizeLinks, get problems() { return problems }, get points() { return points }
  }
})()
