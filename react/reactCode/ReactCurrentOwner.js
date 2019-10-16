// Fiber  有一个 ?: 表示 这个参数是可选的，冒号后面是参数类型

import type {Fiber} from 'react-reconciler/src/ReactFiber';

/**
 * 跟踪当前所有者
 * 是一个组件
 * 应该包括当前正在绘制的所有组件的
 * current 默认 Fiber
 */
const ReactCurrentOwner = {
  
  current: (null: null | Fiber),
};

export default ReactCurrentOwner;
