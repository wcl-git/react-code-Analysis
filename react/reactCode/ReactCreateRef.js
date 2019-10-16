/**
 * @flow， 只需要在Babel 中配置相应的  @babel/core, @babel/cli, and @babel/preset-flow
 */

import type {RefObject} from 'shared/ReactTypes'; // 这里 这种语法是 flow 的书写方式，其实就是类似于 typescript 

// an immutable object with a single mutable value
export function createRef(): RefObject {
  const refObject = {
    current: null,
  };
  if (__DEV__) {
    Object.seal(refObject);  // Object.seal()方法封闭一个对象，阻止添加新属性并将所有现有属性标记为不可配置
  }
  return refObject;
}
