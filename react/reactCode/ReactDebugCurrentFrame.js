/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

const ReactDebugCurrentFrame = {};

if (__DEV__) {
  // 正在处理的组件
  // 定义当前堆栈为 null 或者是一个函数
  ReactDebugCurrentFrame.getCurrentStack = (null: null | (() => string | null));

  // 当前堆栈附录，如果堆栈是一个函数，这执行这个函数并返回
  ReactDebugCurrentFrame.getStackAddendum = function(): string | null {
    const impl = ReactDebugCurrentFrame.getCurrentStack;
    if (impl) {
      return impl();
    }
    return null;
  };
}

export default ReactDebugCurrentFrame;
