/** 日期工具 */

export function pad2(n: number): string {
  return n < 10 ? '0' + n : '' + n
}

/** 今天：YYYY-MM-DD */
export function todayKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}
