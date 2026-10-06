#!/usr/bin/env node
const fs = require('fs')
const ts = require('typescript')

const source = fs.readFileSync(require('path').join(__dirname, '..', 'utils', 'content.ts'), 'utf8')
const compiled = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2018, module: ts.ModuleKind.CommonJS }
}).outputText
const areas = [
  { id: 'lower-back', name: '下背部', hint: '腰骶部', aliases: ['腰部', '后腰'] },
  { id: 'forearm', name: '前臂', hint: '小臂', aliases: ['胳膊'] }
]
const moduleUnderTest = { exports: {} }
const localRequire = request => {
  if (request === '../data/areas') return { AREAS: areas }
  if (request === '../data/environment') return { PRODUCTION_ORIGIN: '' }
  return require(request)
}
new Function('module', 'exports', 'require', 'uni', compiled)(moduleUnderTest, moduleUnderTest.exports, localRequire, {})

const method = {
  id: 'method-1', type: 'method', title: '组合放松法', summary: '', keywords: [], areaIds: [], methodName: '组合放松法',
  contentHtml: '', usageScope: [], notices: [], pointLinks: [{
    pointId: 'point-1', order: 0, instruction: '轻按',
    point: { id: 'point-1', name: '孔最', aliases: [], bodyAreaId: 'forearm', professionalLocation: '', everydayLocation: '', contentHtml: '' }
  }], problemLinks: [{
    problemId: 'problem-1', order: 0, evidenceType: 'direct', evidenceText: '',
    problem: { id: 'problem-1', name: '腰部不适', aliases: ['腰痛'], description: '', bodyAreaIds: ['lower-back'] }
  }]
}
const unrelated = { ...method, id: 'method-2', title: '手部放松', methodName: '手部放松', pointLinks: [], problemLinks: [] }
const { searchPublishedContents, contentsForArea } = moduleUnderTest.exports

if (searchPublishedContents([unrelated, method], '腰痛')[0]?.id !== method.id) throw new Error('问题别名没有命中关联方法')
if (searchPublishedContents([unrelated, method], '孔最')[0]?.id !== method.id) throw new Error('穴位名没有命中关联方法')
if (contentsForArea([unrelated, method], 'lower-back')[0]?.id !== method.id) throw new Error('问题区位没有命中关联方法')
if (contentsForArea([unrelated, method], 'forearm')[0]?.id !== method.id) throw new Error('穴位区位没有命中关联方法')
console.log('✅ 三库关联检索测试通过')
