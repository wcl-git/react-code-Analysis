

import assign from 'object-assign'; // 和原生 Object.assign 的区别就是 object-assign 做了 兼容低级浏览器处理
// shared 下面的就是一些警告类的。暂时忽略
import ReactVersion from 'shared/ReactVersion';
import {
  REACT_ASYNC_MODE_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_PROFILER_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_TIMEOUT_TYPE,
} from 'shared/ReactSymbols';
import {enableSuspense} from 'shared/ReactFeatureFlags';


import {Component, PureComponent} from './ReactBaseClasses'; // react 组件 api 定义默认内部属性
import {createRef} from './ReactCreateRef';  // 创建一个 ref 对象
import {forEach, map, count, toArray, only} from './ReactChildren'; // ReactChildren 五个方法
import ReactCurrentOwner from './ReactCurrentOwner';  // 这里是组件拥有者，默认就是 fiber， react 组件内的运行机制 在 react-reconciler 中

// 这里有 jsxDEV  jsx createElement createFactory cloneAndReplaceKey cloneElement isValidElement 七个 api
// 主要是生成 reactelement 对象
import {
  createElement,
  createFactory,
  cloneElement,
  isValidElement,
} from './ReactElement'; 

// 创建一个上下文， 新 api
import {createContext} from './ReactContext';
// ref 转发
import forwardRef from './forwardRef';
// 针对开发环境的 生成 reactelement 对象， 和 ReactElement 一样
import {
  createElementWithValidation,
  createFactoryWithValidation,
  cloneElementWithValidation,
} from './ReactElementValidator';
import ReactDebugCurrentFrame from './ReactDebugCurrentFrame'; // 开发环境的调试用。暂时可以不用关心

const React = {
  Children: {
    map,
    forEach,
    count,
    toArray,
    only,
  },

  createRef,
  Component,
  PureComponent,

  createContext,
  forwardRef,

  Fragment: REACT_FRAGMENT_TYPE,
  StrictMode: REACT_STRICT_MODE_TYPE,
  unstable_AsyncMode: REACT_ASYNC_MODE_TYPE,
  unstable_Profiler: REACT_PROFILER_TYPE,

  createElement: __DEV__ ? createElementWithValidation : createElement,
  cloneElement: __DEV__ ? cloneElementWithValidation : cloneElement,
  createFactory: __DEV__ ? createFactoryWithValidation : createFactory,
  isValidElement: isValidElement,

  version: ReactVersion,

  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    ReactCurrentOwner,
    // Used by renderers to avoid bundling object-assign twice in UMD bundles:
    assign,
  },
};

if (enableSuspense) {
  React.Timeout = REACT_TIMEOUT_TYPE;
}

if (__DEV__) {
  Object.assign(React.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, {
    // These should not be included in production.
    ReactDebugCurrentFrame,
    // Shim for React DOM 16.0.0 which still destructured (but not used) this.
    // TODO: remove in React 17.0.
    ReactComponentTreeHook: {},
  });
}

export default React;
