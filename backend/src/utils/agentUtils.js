/**
 * 代理工具函数
 */

/**
 * 根据用户角色和代理ID获取可访问的代理ID列表
 * @param {string} role - 用户角色
 * @param {string} agentId - 代理ID
 * @returns {Array} 可访问的代理ID列表
 */
const getAccessibleAgentIds = async (role, agentId) => {
  try {
    // 如果是管理员，返回所有代理ID
    if (role === 'admin') {
      // 这里应该查询所有代理，暂时返回空数组
      return [];
    }
    
    // 如果是代理，只返回自己的ID
    if (role === 'agent' && agentId) {
      return [agentId];
    }
    
    // 默认返回空数组
    return [];
  } catch (error) {
    console.error('获取可访问代理ID列表失败:', error);
    return [];
  }
};

module.exports = {
  getAccessibleAgentIds
};