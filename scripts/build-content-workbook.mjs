import fs from 'node:fs/promises'
import path from 'node:path'
import { FileBlob, SpreadsheetFile, Workbook } from '@oai/artifact-tool'

const projectRoot=process.env.XQN_PROJECT_ROOT
if(!projectRoot)throw new Error('Missing XQN_PROJECT_ROOT')
const outputDir=path.join(projectRoot,'outputs','content-data-template')
const outputFile=path.join(outputDir,'小青囊内容整理模板_v1.xlsx')
const previewDir='/private/tmp/xqn-content-workbook-previews'
const workbook=Workbook.create()
const font='Arial'
const colors={ink:'#24352E',green:'#195A47',greenSoft:'#E7F0EC',line:'#D9E1DD',input:'#FFF7D9',muted:'#F1F4F2',red:'#F8E6E2',white:'#FFFFFF'}

function setupSheet(sheet,title,subtitle,endCol){
  sheet.showGridLines=false
  sheet.getRange('A1').values=[[title]]
  sheet.getRange('A1').format.font={name:font,size:18,bold:true,color:colors.ink}
  sheet.getRange('A2').values=[[subtitle]]
  sheet.getRange('A2').format.font={name:font,size:10,italic:true,color:'#68776F'}
  sheet.getRange(`A2:${endCol}2`).format.borders={bottom:{style:'thin',color:colors.line}}
  sheet.getRange(`A1:${endCol}2`).format.rowHeight=24
}

function setupInputTable(sheet,headers,endCol,lastRow,name){
  sheet.getRange(`A4:${endCol}4`).values=[headers]
  sheet.getRange(`A4:${endCol}4`).format={
    fill:colors.green,font:{name:font,size:10,bold:true,color:colors.white},
    wrapText:true,verticalAlignment:'center',horizontalAlignment:'center',rowHeight:36,
    borders:{insideVertical:{style:'thin',color:'#7FA195'}}
  }
  sheet.getRange(`A5:${endCol}${lastRow}`).format={
    fill:colors.input,font:{name:font,size:10,color:colors.ink},
    wrapText:true,verticalAlignment:'top',rowHeight:42,
    borders:{insideHorizontal:{style:'thin',color:colors.line}}
  }
  const table=sheet.tables.add(`A4:${endCol}${lastRow}`,true,name)
  table.style='TableStyleMedium4'
  table.showFilterButton=true
  sheet.freezePanes.freezeRows(4)
}

function setWidths(sheet,entries){
  entries.forEach(([column,width])=>{sheet.getRange(`${column}:${column}`).format.columnWidth=width})
}

const guide=workbook.worksheets.add('填写说明')
setupSheet(guide,'小青囊内容整理表','一行内容对应后台一条资料、前台一张卡片和一个详情页。黄色区域由内容整理人员填写。','F')
guide.getRange('A4:F4').values=[['顺序','要做什么','信息资料','养护方法','空白时','说明']]
guide.getRange('A5:F11').values=[
  [1,'在“内容资料”选择类型并填写问题名称、说明、搜索词和标准身体位置','必填','必填','不能录入','身体位置只使用“标准身体位置”表中的 ID'],
  [2,'整理用户最终看到的图文正文','必填','必填','不能录入','图片、GIF、视频按阅读顺序写明文件名或地址及准确说明'],
  [3,'填写方法附加信息','不需要','必填','方法不能录入','方法名、类型、工具、使用范围和停止条件'],
  [4,'填写风险边界','必填','必填','不能录入','只写日常养护边界，不作诊断、治疗或效果保证'],
  [5,'登记原始资料和直接依据','必填','必填','不能录入','不确定内容留空并写入核验备注，不能补造'],
  [6,'有真实可追溯记录时再填“案例集”','可选','可选','前台隐藏','案例必须保留局限和原文位置'],
  [7,'查看最后一列完整性检查','自动','自动','按提示补充','显示“可录入后台”后再交给管理员']
]
guide.getRange('A4:F11').format={font:{name:font,size:10,color:colors.ink},wrapText:true,verticalAlignment:'top'}
guide.getRange('A4:F4').format={fill:colors.green,font:{name:font,size:10,bold:true,color:colors.white},horizontalAlignment:'center',rowHeight:32}
guide.getRange('A5:F11').format.rowHeight=44
guide.getRange('A5:F11').format.borders={insideHorizontal:{style:'thin',color:colors.line}}
guide.freezePanes.freezeRows(4)
setWidths(guide,[['A',10],['B',42],['C',16],['D',16],['E',18],['F',42]])

const content=workbook.worksheets.add('内容资料')
setupSheet(content,'内容资料','每行是一条完整资料。方法参数先写在图文正文中，不单独拆步骤表。','X')
const contentHeaders=['内容ID*','内容类型*','问题名称*','一句话说明*','搜索关键词*','身体位置ID*','身体位置名称','方法名称','方法类型','工具或材料','图文正文稿与素材顺序*','使用范围','注意事项','不适用情况*','必须停止情况','原始资料标题*','作者或讲述者','平台或出版社','原始链接','原文或直接依据*','核验备注','内容状态','完整性检查']
setupInputTable(content,contentHeaders,'X',104,'ContentRecords')
content.getRange('X5').formulas=[['=IF(A5="","",IF(B5="信息资料",IF(AND(C5<>"",D5<>"",E5<>"",F5<>"",H5<>"",L5<>"",O5<>"",Q5<>"",U5<>""),"可录入后台","缺少必填项"),IF(B5="养护方法",IF(AND(C5<>"",D5<>"",E5<>"",F5<>"",H5<>"",I5<>"",J5<>"",K5<>"",L5<>"",M5<>"",O5<>"",P5<>"",Q5<>"",U5<>""),"可录入后台","缺少必填项"),"类型不正确")))']]
content.getRange('X5:X104').fillDown()
content.getRange('X5:X104').format={fill:colors.muted,font:{name:font,size:10,bold:true,color:colors.ink},horizontalAlignment:'center',verticalAlignment:'center'}
content.getRange('X5:X104').conditionalFormats.add('containsText',{text:'缺少',format:{fill:colors.red,font:{color:'#8B3F34',bold:true}}})
content.getRange('X5:X104').conditionalFormats.add('containsText',{text:'可录入',format:{fill:colors.greenSoft,font:{color:colors.green,bold:true}}})
content.getRange('B5:B104').dataValidation={rule:{type:'list',values:['信息资料','养护方法']}}
content.getRange('J5:J104').dataValidation={rule:{type:'list',values:['穴位','功法','其他外用方法']}}
content.getRange('W5:W104').dataValidation={rule:{type:'list',values:['草稿','待核验','可录入后台','已录入后台']}}
setWidths(content,[['A',18],['B',15],['C',24],['D',34],['E',28],['F',24],['G',20],['H',15],['I',22],['J',18],['K',22],['L',52],['M',34],['N',34],['O',38],['P',38],['Q',30],['R',20],['S',22],['T',32],['U',52],['V',36],['W',18],['X',20]])

const cases=workbook.worksheets.add('案例集')
setupSheet(cases,'案例集','没有真实、可追溯的记录时保持空白。案例不代表普遍结果。','H')
const caseHeaders=['归属内容ID*','使用前的日常情况*','实际使用方法*','持续时间','当事人主观记录*','个体差异与限制*','原文位置*','完整性检查']
setupInputTable(cases,caseHeaders,'H',104,'CaseRecords')
cases.getRange('H5').formulas=[['=IF(A5="","",IF(AND(B5<>"",C5<>"",E5<>"",F5<>"",G5<>""),"可录入后台","缺少必填项"))']]
cases.getRange('H5:H104').fillDown()
cases.getRange('H5:H104').format={fill:colors.muted,font:{name:font,size:10,bold:true,color:colors.ink},horizontalAlignment:'center',verticalAlignment:'center'}
cases.getRange('H5:H104').conditionalFormats.add('containsText',{text:'缺少',format:{fill:colors.red,font:{color:'#8B3F34',bold:true}}})
cases.getRange('H5:H104').conditionalFormats.add('containsText',{text:'可录入',format:{fill:colors.greenSoft,font:{color:colors.green,bold:true}}})
setWidths(cases,[['A',20],['B',40],['C',40],['D',20],['E',42],['F',42],['G',28],['H',20]])

const areas=workbook.worksheets.add('标准身体位置')
setupSheet(areas,'标准身体位置','“内容资料”的身体位置ID必须使用本表 ID。多个位置用英文逗号分隔。','D')
const areaRows=[
['head','头面部','头、头面、面部','头部与面部'],['eye','眼周','眼、眼睛、眼周','双眼周围'],['ear','耳部','耳、耳朵、耳周','左右耳部'],['nose','鼻部','鼻、鼻子、鼻周','鼻部周围'],['mouth','口唇周围','嘴、嘴唇、口唇、口周','嘴部与口唇周围'],['cheek','面颊','脸颊、面颊、脸','左右面颊'],['forehead','额部','额头、前额、额部','前额区域'],['temple','颞部','太阳穴、颞部','左右太阳穴周围'],['jaw','下颌部','下巴、下颌','下巴与下颌周围'],['occiput','头后部','后脑、后脑勺','后脑区域'],['neck','颈部','颈、脖子、后颈','前颈与后颈'],['shoulder','肩部','肩、肩膀、肩头','左右肩部'],['chest','胸部','胸、胸前','胸前区域'],['upper-back','上背部','上背、肩胛','肩胛与上背'],['abdomen','腹部','腹、肚子、肚脐、脐周','上腹与脐周'],['lower-back','下背部','腰、后腰、下背、腰背、腰骶部','腰部与下背'],['pelvis','下腹与腹股沟','下腹、小腹、腹股沟','下腹及腹股沟'],['buttocks','臀部','臀、屁股','左右臀部'],['upper-arm','上臂','上臂、大臂','肩与肘之间'],['elbow','肘部','肘、胳膊肘','肘关节周围'],['forearm','前臂','前臂、小臂','肘与腕之间'],['hand','手部','手、手腕、手掌、手指','手腕、手掌与手指'],['thigh','大腿','大腿、腿上部','髋与膝之间'],['knee','膝部','膝、膝盖','膝关节周围'],['lower-leg','小腿','小腿、腿肚','膝与踝之间'],['foot','足部','足、脚、脚踝、脚掌、足底','脚踝与足部'],['breast','乳房','乳房、乳腺区域','乳房区域'],['nipple-areola','乳头及乳晕','乳头、乳晕','乳头及乳晕区域'],['vulva','外阴','外阴','女性外部结构'],['penis','阴茎','阴茎','男性外部结构'],['scrotum','阴囊','阴囊','男性外部结构'],['perineum','会阴','会阴','会阴区域'],['anus','肛门及肛周','肛门、肛周','肛门及周围区域'],['whole','全身','全身、整个人、浑身、放松','全身']
]
areas.getRange('A4:D4').values=[['位置ID','前台名称','用户可能说法','范围说明']]
areas.getRange('A5').write(areaRows)
areas.getRange(`A4:D${4+areaRows.length}`).format={font:{name:font,size:10,color:colors.ink},wrapText:true,verticalAlignment:'top'}
areas.getRange('A4:D4').format={fill:colors.green,font:{name:font,size:10,bold:true,color:colors.white},horizontalAlignment:'center',rowHeight:32}
areas.getRange(`A5:D${4+areaRows.length}`).format.rowHeight=30
areas.getRange(`A4:D${4+areaRows.length}`).format.borders={insideHorizontal:{style:'thin',color:colors.line}}
areas.freezePanes.freezeRows(4)
setWidths(areas,[['A',21],['B',22],['C',42],['D',34]])

const fields=workbook.worksheets.add('字段说明')
setupSheet(fields,'字段说明','与当前后台录入字段保持一致。','E')
const fieldRows=[
['共同','问题名称','是','用户搜索结果卡片标题','腰骶部日常放松'],['共同','一句话说明','是','说明用户能在本页看到什么','查看腰骶部的位置与日常放松图文'],['共同','搜索关键词','是','多个词用逗号分隔','腰骶部,后腰,久坐'],['共同','身体位置ID','是','从标准身体位置表选择','lower-back'],['共同','图文正文稿与素材顺序','是','按最终阅读顺序整理；每张图或视频写准确说明','文字→图1说明→文字→视频1说明'],['方法','工具或材料','是','没有时明确填“无”','无'],['方法','使用范围','是','只写日常使用边界，不承诺结果','用于了解该位置和日常轻柔操作'],['共同','风险边界','是','不适用情况；方法另填必须停止情况','皮肤破损处不自行操作'],['案例','个体差异与限制','是','明确个人记录不能推及所有人','个人记录，不代表普遍结果'],['来源','原文或直接依据','是','粘贴与本条资料直接相关的原文','原文段落或作者确认记录'],['共同','完整性检查','自动','由表格公式生成，不要覆盖','可录入后台']
]
fields.getRange('A4:E4').values=[['分类','字段','是否必填','填写规则','示例']]
fields.getRange('A5').write(fieldRows)
fields.getRange(`A4:E${4+fieldRows.length}`).format={font:{name:font,size:10,color:colors.ink},wrapText:true,verticalAlignment:'top'}
fields.getRange('A4:E4').format={fill:colors.green,font:{name:font,size:10,bold:true,color:colors.white},horizontalAlignment:'center',rowHeight:32}
fields.getRange(`A5:E${4+fieldRows.length}`).format.rowHeight=38
fields.getRange(`A4:E${4+fieldRows.length}`).format.borders={insideHorizontal:{style:'thin',color:colors.line}}
fields.freezePanes.freezeRows(4)
setWidths(fields,[['A',16],['B',26],['C',15],['D',52],['E',42]])

await fs.mkdir(outputDir,{recursive:true})
await fs.mkdir(previewDir,{recursive:true})
const exported=await SpreadsheetFile.exportXlsx(workbook)
await exported.save(outputFile)

const saved=await SpreadsheetFile.importXlsx(await FileBlob.load(outputFile))
console.log((await saved.inspect({kind:'table',range:'内容资料!A1:X10',include:'values,formulas',tableMaxRows:10,tableMaxCols:24,maxChars:10000})).ndjson)
console.log((await saved.inspect({kind:'match',searchTerm:'#REF!|#DIV/0!|#VALUE!|#NAME\\?|#N/A|#NUM!|#NULL!|#SPILL!|#CALC!',options:{useRegex:true,maxResults:300},summary:'final formula error scan'})).ndjson)
for(const name of ['填写说明','内容资料','案例集','标准身体位置','字段说明']){
  const preview=await saved.render({sheetName:name,autoCrop:'all',scale:1,format:'png'})
  await fs.writeFile(path.join(previewDir,`${name}.png`),new Uint8Array(await preview.arrayBuffer()))
}
console.log(outputFile)
