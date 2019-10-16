/**
 * Copyright (c) Facebook, Inc. and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import invariant from 'shared/invariant';  // 抛出一个错误的方法
import warningWithoutStack from 'shared/warningWithoutStack'; // 抛出一个错误信息方法
import {REACT_ELEMENT_TYPE} from 'shared/ReactSymbols'; // 定义的常量

// 下面引入的 ReactCurrentOwner 代码，意思就是，组件默认归 Fiber 所有。
// Fiber 是什么呢，这个有兴趣自己去研究，这里就不累诉。
// React v16发布，后正式因为这个，react 周期有一定调整
import ReactCurrentOwner from './ReactCurrentOwner';

const hasOwnProperty = Object.prototype.hasOwnProperty; // 用 hasOwnProperty 变量暂存是否是自己的方法的判定，减少每次使用写一长串的麻烦，

const RESERVED_PROPS = {  // 直译 保留的 props，其实就是一些特定意义的内置属性，定义react 组件 props 时候，这些是有其特殊意义的。不能用 this.props.XXX来获取
  key: true,
  ref: true,
  __self: true,
  __source: true,
};

let specialPropKeyWarningShown, specialPropRefWarningShown; // 当错误地使用 props 获取具有特殊意义的的 key、ref 的警告提示。

// 这个函数是判断 ref 是否有效，返回 true false, 区分开发环境和生产环境 ，config 是监测的对象
function hasValidRef(config) {
  if (__DEV__) {
    if (hasOwnProperty.call(config, 'ref')) {
      const getter = Object.getOwnPropertyDescriptor(config, 'ref').get; // 获取 Object.defineProperty（）第三个参数设置的属性描述
      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }
  return config.ref !== undefined;
}

// 这个函数是判断 react 组件 key 是否有效，返回 true false, 区分开发环境和生产环境
function hasValidKey(config) {
  if (__DEV__) {
    if (hasOwnProperty.call(config, 'key')) {
      const getter = Object.getOwnPropertyDescriptor(config, 'key').get;
      if (getter && getter.isReactWarning) {
        return false;
      }
    }
  }
  return config.key !== undefined;
}

// 定义了不合法的 key 抛出警告的提示信息， 开发环境才会抛出警告
function defineKeyPropWarningGetter(props, displayName) {
  const warnAboutAccessingKey = function() {
    if (!specialPropKeyWarningShown) {
      specialPropKeyWarningShown = true;
      warningWithoutStack(
        false,
        '%s: `key` is not a prop. Trying to access it will result ' +
          'in `undefined` being returned. If you need to access the same ' +
          'value within the child component, you should pass it as a different ' +
          'prop. (https://fb.me/react-special-props)',
        displayName,
      );
    }
  };
  warnAboutAccessingKey.isReactWarning = true;
  Object.defineProperty(props, 'key', {
    get: warnAboutAccessingKey,
    configurable: true,
  });
}

// 定义了不合法的 ref 抛出警告的提示信息 开发环境才会抛出警告
function defineRefPropWarningGetter(props, displayName) {
  const warnAboutAccessingRef = function() {
    if (!specialPropRefWarningShown) {
      specialPropRefWarningShown = true;
      warningWithoutStack(
        false,
        '%s: `ref` is not a prop. Trying to access it will result ' +
          'in `undefined` being returned. If you need to access the same ' +
          'value within the child component, you should pass it as a different ' +
          'prop. (https://fb.me/react-special-props)',
        displayName,
      );
    }
  };
  warnAboutAccessingRef.isReactWarning = true;
  Object.defineProperty(props, 'ref', {
    get: warnAboutAccessingRef,
    configurable: true,
  });
}

// reactElement 为 createElement 函数调用，根据环境设置对应的属性
// type: 元素类型
// key: react 的 key
// ref: react 的 ref
// props react 的 props
// self  开发环境 独有的属性
// source 开发环境 独有的属性
// owner 记录创建此元素的组件

const ReactElement = function(type, key, ref, self, source, owner, props) {
  const element = {
    // 这个标签允许我们将其唯一地标识为一个react元素，默认 'react element'
    $$typeof: REACT_ELEMENT_TYPE,

    // 元素的内置属性
    type: type,
    key: key,
    ref: ref,
    props: props,

    // 记录创建此元素的组件
    _owner: owner,
  };

  if (__DEV__) {
    // 增加一个外部后备存储器，以便我们可以增加属性，冻结整个对象
    element._store = {};

    // Object.defineProperty() 直接在一个对象上定义一个新属性，或者修改一个对象的现有属性， 并返回这个对象

    // 定义 validated 验证标志不可枚举
    Object.defineProperty(element._store, 'validated', {
      configurable: false,
      enumerable: false,
      writable: true,
      value: false,
    });

    // 定义 _self 开发环境 独有的属性
    Object.defineProperty(element, '_self', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: self,
    });

    // 定义 _source 开发环境 独有的属性
    Object.defineProperty(element, '_source', {
      configurable: false,
      enumerable: false,
      writable: false,
      value: source,
    });
    // 冻结 对象
    if (Object.freeze) {
      Object.freeze(element.props);
      Object.freeze(element);
    }
  }

  return element;
};

// type tag类型
// config props配置
// key react key 值
// 生产环境使用 这个api 没用过
export function jsx(type, config, maybeKey) {
  let propName;

  // 除去react保留的属性外的 props 的存储对象
  // 也就是出去 RESERVED_PROPS 定义了的属性外的所有 props
  const props = {};
  let key = null;
  let ref = null;

  if (maybeKey !== undefined) { // 给定了 key 则 把 maybeKey 赋值 给 react 的 key 属性
    key = '' + maybeKey;
  }

  if (hasValidKey(config)) { // 如果config 定义了key，则优先取这个值，覆盖 maybeKey
    key = '' + config.key;
  }

  if (hasValidRef(config)) { // 如果config定义了 ref 则 react 的 ref 赋值文 config.ref
    ref = config.ref;
  }

  // 遍历 config 对象， 除保留属性将添加到新的props对象中
  for (propName in config) { 
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  // 如果有默认 props， 设置一下
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }
  // return 出 ReactElement
  return ReactElement(
    type,
    key,
    ref,
    undefined,
    undefined,
    ReactCurrentOwner.current,
    props,
  );
}

// type tag类型
// config props配置
// key react key 值
// 开发环境使用， 和 jsx 类似功能 
// 这个api 没用过
export function jsxDEV(type, config, maybeKey, source, self) {
  let propName;

  // Reserved names are extracted
  const props = {};

  let key = null;
  let ref = null;

  if (maybeKey !== undefined) {
    key = '' + maybeKey;
  }

  if (hasValidKey(config)) {
    key = '' + config.key;
  }

  if (hasValidRef(config)) {
    ref = config.ref;
  }

  // Remaining properties are added to a new props object
  for (propName in config) {
    if (
      hasOwnProperty.call(config, propName) &&
      !RESERVED_PROPS.hasOwnProperty(propName)
    ) {
      props[propName] = config[propName];
    }
  }

  // Resolve default props
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }

  if (key || ref) {
    const displayName =
      typeof type === 'function'
        ? type.displayName || type.name || 'Unknown'
        : type;
    if (key) {
      defineKeyPropWarningGetter(props, displayName);
    }
    if (ref) {
      defineRefPropWarningGetter(props, displayName);
    }
  }

  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props,
  );
}

//  创建并返回 给定元素类型的 ReactElement
export function createElement(type, config, children) {
  let propName;

  // 提取除去保留 props ， key 、ref、self、source
  const props = {};

  let key = null;
  let ref = null;
  let self = null;
  let source = null;

  if (config != null) {
    if (hasValidRef(config)) {
      ref = config.ref;
    }
    if (hasValidKey(config)) {
      key = '' + config.key;
    }

    self = config.__self === undefined ? null : config.__self;
    source = config.__source === undefined ? null : config.__source;

    // 除保留属性将添加到新的props对象中
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        props[propName] = config[propName];
      }
    }
  }

  //children可以是多个参数，这些参数被转移到
  //新分配的props对象。
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    if (__DEV__) {
      if (Object.freeze) {
        Object.freeze(childArray);
      }
    }
    props.children = childArray;
  }

  // 如果有默认 props， 设置一下
  if (type && type.defaultProps) {
    const defaultProps = type.defaultProps;
    for (propName in defaultProps) {
      if (props[propName] === undefined) {
        props[propName] = defaultProps[propName];
      }
    }
  }
  // 如果是开发环境，对一些错误使用抛警告
  if (__DEV__) {
    if (key || ref) {
      const displayName =
        typeof type === 'function'
          ? type.displayName || type.name || 'Unknown'
          : type;
      if (key) {
        defineKeyPropWarningGetter(props, displayName);
      }
      if (ref) {
        defineRefPropWarningGetter(props, displayName);
      }
    }
  }
  // 返回 一个 reactelement 对象
  return ReactElement(
    type,
    key,
    ref,
    self,
    source,
    ReactCurrentOwner.current,
    props,
  );
}

// 返回一个函数，该函数生成给定类型的 React 元素，默认传第一个参数 type 
export function createFactory(type) {
  const factory = createElement.bind(null, type);
  factory.type = type;
  return factory;
}
// 克隆react元素并改变 key 值， 这个api 没用过
export function cloneAndReplaceKey(oldElement, newKey) {
  const newElement = ReactElement(
    oldElement.type,
    newKey,
    oldElement.ref,
    oldElement._self,
    oldElement._source,
    oldElement._owner,
    oldElement.props,
  );

  return newElement;
}

// 克隆并返回新元素 
// 克隆元素
// config 元素的属性 props
// children 元素
export function cloneElement(element, config, children) {
  invariant(
    !(element === null || element === undefined),
    'React.cloneElement(...): The argument must be a React element, but you passed %s.',
    element,
  );

  let propName;

  // 拷贝 一下 props 
  const props = Object.assign({}, element.props);

  // 提取保留名称
  let key = element.key;
  let ref = element.ref;
  const self = element._self;

  const source = element._source;

  // 所有者将被保留，除非ref被重写
  let owner = element._owner;

  if (config != null) {
    if (hasValidRef(config)) {
      // 如果 config 定义了 ref 则覆盖 element 里的 ref
      ref = config.ref;
      owner = ReactCurrentOwner.current;
    }
    if (hasValidKey(config)) {
      // 如果 config 定义了 key 则覆盖 element 里的 key
      key = '' + config.key;
    }

    let defaultProps;
    if (element.type && element.type.defaultProps) {
      defaultProps = element.type.defaultProps;
    }
    for (propName in config) {
      if (
        hasOwnProperty.call(config, propName) &&
        !RESERVED_PROPS.hasOwnProperty(propName)
      ) {
        if (config[propName] === undefined && defaultProps !== undefined) {
          // 没有就使用默认值
          props[propName] = defaultProps[propName];
        } else {
          // 有就不用默认值
          props[propName] = config[propName];
        }
      }
    }
  }

  // 如果子元素只有一个，children 就是 子元素，如果不只一个 就是数组
  const childrenLength = arguments.length - 2;
  if (childrenLength === 1) {
    props.children = children;
  } else if (childrenLength > 1) {
    const childArray = Array(childrenLength);
    for (let i = 0; i < childrenLength; i++) {
      childArray[i] = arguments[i + 2];
    }
    props.children = childArray;
  }
  // 最后返回一个 reactelement 对象
  return ReactElement(element.type, key, ref, self, source, owner, props);
}

/**
 * 验证对象是否为reactElement。 $$typeof 默认 ‘react element’
 */
export function isValidElement(object) {
  return (
    typeof object === 'object' &&
    object !== null &&
    object.$$typeof === REACT_ELEMENT_TYPE
  );
}
