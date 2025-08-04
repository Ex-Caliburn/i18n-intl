export function includeChinese(text: string): boolean {
  return /[\u4e00-\u9fa5]/.test(text);
}
