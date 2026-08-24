import { RemedyPlan } from '../typings/models'

/**
 * 自愈方案库（内容数据驱动）
 * 每个方案强制包含禁忌（contraindications），缺字段即不合规。
 * 文案遵守禁用词表（见 data/compliance.ts），一律使用去医疗化的身体语言。
 */
export const REMEDIES: RemedyPlan[] = [
  {
    id: 'warm-neck',
    name: '暖颈 · 温敷礼',
    motto: '把暖意，敷在肩上',
    desc: '用掌心的温度轻敷颈后，让绷了一天的肩颈慢慢松开。适合发冷、紧绷的肩颈。',
    areas: ['neck', 'shoulder'],
    feelings: ['cold', 'tight', 'sore'],
    categories: ['温敷', '驱寒', '舒展'],
    safety: 'green',
    contraindications: [
      '颈后皮肤有破损或晒伤时，跳过热敷',
      '敷贴处如感灼热，立即停止'
    ],
    phases: {
      breathe: '吸气时，想象把一股暖流送进颈肩；呼气时，让肩膀一点点下沉。',
      steps: [
        { title: '搓热掌心', detail: '双手快速互搓约 20 下，直到掌心明显发热。' },
        { title: '轻敷颈后', detail: '将温热的掌心贴住后颈，闭上眼睛，停留 30 秒。' },
        { title: '缓缓轻揉', detail: '用指腹沿颈后自上而下轻揉，力度以舒适为准。' }
      ],
      ending: '慢慢放下双手，感受颈肩的暖意与松软，让这份放松多停留一会儿。'
    }
  },
  {
    id: 'warm-belly',
    name: '暖腹 · 掌心仪式',
    motto: '掌心的暖，是最好的安抚',
    desc: '双手交叠轻放腹部，用温度与呼吸安抚发凉、发胀的小腹。',
    areas: ['belly'],
    feelings: ['cold', 'bloat'],
    categories: ['温敷', '温通'],
    safety: 'yellow',
    contraindications: [
      '孕妇禁用',
      '饭后 30 分钟内腹部禁用',
      '腹部皮肤有破损时禁用'
    ],
    phases: {
      breathe: '把呼吸放慢，想象气息一路沉到小腹，像温水流过。',
      steps: [
        { title: '温手交叠', detail: '双手互搓至发热，交叠轻放在小腹上方，不按压。' },
        { title: '随呼吸起伏', detail: '感受腹部随呼吸自然起伏，让掌心温度慢慢渗进去。' },
        { title: '缓画小圈', detail: '以掌心贴腹，顺时针轻缓画圈，速度跟着呼吸走。' }
      ],
      ending: '双手继续停留片刻，感谢身体此刻的安静回应。'
    }
  },
  {
    id: 'foot-soak',
    name: '暖足 · 沐足小憩',
    motto: '脚暖了，全身都松了',
    desc: '一盆温热的水，一次给双脚的温柔小憩，驱走从脚底蔓延的凉意与疲惫。',
    areas: ['limbs'],
    feelings: ['cold', 'heavy', 'tired'],
    categories: ['驱寒', '温通'],
    safety: 'green',
    contraindications: [
      '足部皮肤有破损时禁用',
      '水温不宜过烫，以温热舒适为准',
      '泡后请及时擦干双脚，避免受凉'
    ],
    phases: {
      breathe: '坐下，放松脚踝，吸气时感受暖意从脚底升起。',
      steps: [
        { title: '备一盆温水', detail: '水温温热舒适即可，水量没过脚踝。' },
        { title: '缓缓入水', detail: '双脚慢慢放入水中，先适应温度，再安静泡着。' },
        { title: '轻动脚趾', detail: '在水里轻轻活动脚趾和脚踝，像在暖泉里散步。' }
      ],
      ending: '慢慢抬脚、擦干，穿上袜子留住这份暖意。'
    }
  },
  {
    id: 'cloud-hands',
    name: '舒展 · 肩颈云手',
    motto: '像云一样，慢慢松开',
    desc: '用一组轻柔的肩颈动作，把紧绷了一天的僵硬慢慢化开。',
    areas: ['neck', 'shoulder'],
    feelings: ['tight', 'sore'],
    categories: ['舒展'],
    safety: 'green',
    contraindications: [
      '动作全程宜缓，不要用力过猛',
      '头晕明显时，请坐着完成'
    ],
    phases: {
      breathe: '先把肩膀耸到最高，屏息两秒，然后长长呼一口气，让肩膀轰然落下。',
      steps: [
        { title: '耸肩松肩', detail: '慢慢耸肩 3 次，每次放下时想象把重量交给地面。' },
        { title: '绕肩画圈', detail: '双肩向后缓缓画圈 5 次，再向前 5 次，幅度以舒适为度。' },
        { title: '侧耳听肩', detail: '头缓缓侧向一边，耳朵靠近肩膀，停 3 个呼吸，换边。' }
      ],
      ending: '头回正，轻轻点头两次，感受颈肩的松快。'
    }
  },
  {
    id: 'side-stretch',
    name: '归位 · 脊柱轻旋',
    motto: '给身体，重新对个位',
    desc: '坐姿轻柔侧展与扭转，帮久坐的身体找回舒展的秩序。',
    areas: ['waist', 'shoulder'],
    feelings: ['heavy', 'sore', 'tired'],
    categories: ['舒展'],
    safety: 'green',
    contraindications: [
      '孕妇禁用扭转动作',
      '动作轻柔，不追求幅度，感到牵拉即可'
    ],
    phases: {
      breathe: '坐直，想象头顶有根细线轻轻把你向上提。',
      steps: [
        { title: '向上伸展', detail: '十指交叉翻掌向上，缓缓推高，像伸手够一片树叶。' },
        { title: '左右侧展', detail: '保持坐姿，身体缓缓侧倾，感受腰侧拉长，每侧 3 个呼吸。' },
        { title: '轻柔转身', detail: '双手扶住膝盖，呼气时缓缓转身向后看，吸气回正，左右各 3 次。' }
      ],
      ending: '回到正中，闭眼做两次深呼吸，感受脊柱被重新摆正。'
    }
  },
  {
    id: 'cool-breath',
    name: '清透 · 凉感呼吸',
    motto: '一呼一吸，把燥气送走',
    desc: '用清凉意象的呼吸练习，帮燥热烦闷的身体找回一丝清透。',
    areas: ['whole', 'head'],
    feelings: ['heat', 'restless'],
    categories: ['清透', '安神'],
    safety: 'green',
    contraindications: [
      '呼吸自然为主，不必刻意深呼吸到不适'
    ],
    phases: {
      breathe: '想象面前是一片清凉的竹林，每次吸气，都有凉丝丝的风穿过。',
      steps: [
        { title: '松口慢呼', detail: '轻轻撅起嘴唇，像吹凉一杯热茶，缓缓呼气。' },
        { title: '鼻吸凉意', detail: '用鼻子自然吸气，想象凉意从鼻尖流进身体。' },
        { title: '循环五回', detail: '重复"鼻吸凉、口呼热"5 个来回，越呼越轻。' }
      ],
      ending: '停下引导，让呼吸回到自然，感受胸口那一点点清凉。'
    }
  },
  {
    id: 'face-cool',
    name: '润爽 · 面颊凉润',
    motto: '给脸，洗一场凉凉的细雨',
    desc: '用微凉的湿巾轻敷面颊与额头，安抚燥热紧绷的感觉。',
    areas: ['head'],
    feelings: ['heat', 'restless'],
    categories: ['润爽', '清透'],
    safety: 'green',
    contraindications: [
      '皮肤敏感时改用常温湿巾',
      '受凉发冷时不宜使用'
    ],
    phases: {
      breathe: '闭上眼睛，想象一场细雨轻轻落在脸上。',
      steps: [
        { title: '备凉湿巾', detail: '用微凉的水打湿干净毛巾，轻轻拧至不滴水。' },
        { title: '轻敷额头', detail: '仰头，将湿巾轻轻敷在额头，停留 30 秒。' },
        { title: '轻敷面颊', detail: '再敷面颊各 15 秒，让凉润感慢慢散开。' }
      ],
      ending: '取下湿巾，用掌心轻轻拍干，感受面颊的清爽。'
    }
  },
  {
    id: 'cloud-nap',
    name: '安神 · 云朵小憩',
    motto: '把身体，交给一朵云',
    desc: '三分钟安静的闭目小憩，让紧绷的神经像躺进云朵里一样软下来。',
    areas: ['whole', 'head'],
    feelings: ['tired', 'restless', 'heavy'],
    categories: ['安神'],
    safety: 'yellow',
    contraindications: [
      '驾车或操作机器前，请勿进行',
      '请选择有靠背支撑的座位进行'
    ],
    phases: {
      breathe: '把身体的重量完全交给椅子，呼气时，感觉自己在慢慢下沉。',
      steps: [
        { title: '闭目靠稳', detail: '闭上眼睛，头颈靠稳，双手自然放在腿上。' },
        { title: '数着呼吸', detail: '从 10 数到 1，每个数字跟随一次呼气。' },
        { title: '随处游走', detail: '注意力轻轻扫过身体，哪里紧绷，就在哪里多呼一口气。' }
      ],
      ending: '缓缓动动手指和脚趾，再睁开眼睛，像从小憩中自然醒来。'
    }
  },
  {
    id: 'finger-play',
    name: '活络 · 十指操',
    motto: '十指一动，精神回来',
    desc: '一组轻快的手指操，让发沉的手和混沌的脑袋一起醒过来。',
    areas: ['limbs'],
    feelings: ['heavy', 'tired', 'tight'],
    categories: ['舒展', '活络'],
    safety: 'green',
    contraindications: [
      '手部有外伤时请跳过'
    ],
    phases: {
      breathe: '甩甩手腕，让双手先松下来。',
      steps: [
        { title: '握拳张开', detail: '用力握拳 2 秒，再猛地张开五指，重复 5 次。' },
        { title: '逐指对捏', detail: '拇指依次与其余四指指尖对捏，每根手指 2 次。' },
        { title: '翻腕轻甩', detail: '双手自然下垂，轻轻甩动手腕 10 秒，像甩掉水珠。' }
      ],
      ending: '双手互搓至温热，敷在眼睛上休息 3 个呼吸。'
    }
  },
  {
    id: 'belly-breath',
    name: '深息 · 腹式调息',
    motto: '气沉下来，人就稳了',
    desc: '把呼吸从胸口移到腹部，用最省力的方式安抚浮躁的身体。',
    areas: ['whole', 'belly'],
    feelings: ['tired', 'restless', 'heavy'],
    categories: ['安神', '清透'],
    safety: 'green',
    contraindications: [
      '刚进食时可改为自然鼻息慢呼'
    ],
    phases: {
      breathe: '一只手轻放腹部，先做两次自然的深呼吸。',
      steps: [
        { title: '鼻吸腹鼓', detail: '用鼻子慢慢吸气，让腹部像气球一样轻轻鼓起。' },
        { title: '口呼气沉', detail: '用嘴缓缓呼气，腹部自然回落，呼气比吸气更长。' },
        { title: '找到节奏', detail: '保持"吸 4 秒、呼 6 秒"的节奏，做 8 个来回。' }
      ],
      ending: '放下手，让呼吸回归自然，感受身体稳当当的踏实感。'
    }
  }
]
