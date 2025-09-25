/**
 * 产品编码枚举
 */
export const PRODUCT_CODES = {
  SPOON: '1', // 勺子
  BOTTLE: '2', // 瓶子
  STICKER: '3', // 贴纸
  TANGTAIRAN: '4' // 唐肽燃
};

/**
 * 产品编码名称映射
 */
export const PRODUCT_CODE_NAMES = {
  '1': '勺子',
  '2': '瓶子',
  '3': '贴纸',
  '4': '唐肽燃'
};

/**
 * 获取产品编码选项列表（用于下拉菜单）
 */
export const getProductCodeOptions = () => {
  return Object.entries(PRODUCT_CODE_NAMES).map(([value, label]) => ({
    value,
    label
  }));
};