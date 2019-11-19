

import type {ReactNodeList} from 'shared/ReactTypes';

import type {
  FiberRoot,
  Batch as FiberRootBatch,
} from 'react-reconciler/src/ReactFiberRoot';


import type {Container} from './ReactDOMHostConfig'; // 容器类型定义

import '../shared/checkReact';
import './ReactDOMClientInjection'; // reactdom 注入一些解析 dom 层级机构和一些事件插件

import * as DOMRenderer from 'react-reconciler/inline.dom';  // react-reconciler 包，更新的内部机制
import * as ReactPortal from 'shared/ReactPortal';
import ExecutionEnvironment from 'fbjs/lib/ExecutionEnvironment';
import * as ReactGenericBatching from 'events/ReactGenericBatching'; // 事件常规批次处理
import * as ReactControlledComponent from 'events/ReactControlledComponent'; // 受控组件的事件
import * as EventPluginHub from 'events/EventPluginHub';
import * as EventPluginRegistry from 'events/EventPluginRegistry';
import * as EventPropagators from 'events/EventPropagators';
import * as ReactInstanceMap from 'shared/ReactInstanceMap';
import ReactVersion from 'shared/ReactVersion';
import {ReactCurrentOwner} from 'shared/ReactGlobalSharedState';
import getComponentName from 'shared/getComponentName';
import invariant from 'fbjs/lib/invariant';
import lowPriorityWarning from 'shared/lowPriorityWarning';
import warning from 'fbjs/lib/warning';

import * as ReactDOMComponentTree from './ReactDOMComponentTree'; // 组件dom 树
import * as ReactDOMFiberComponent from './ReactDOMFiberComponent';  // 组件工作片段
import * as ReactDOMEventListener from '../events/ReactDOMEventListener'; // 事件监听
import {
  ELEMENT_NODE,
  COMMENT_NODE,
  DOCUMENT_NODE,
  DOCUMENT_FRAGMENT_NODE,
} from '../shared/HTMLNodeType';
import {ROOT_ATTRIBUTE_NAME} from '../shared/DOMProperty';

let topLevelUpdateWarnings;
let warnOnInvalidCallback;
let didWarnAboutUnstableCreatePortal = false;

if (__DEV__) {
  if (
    typeof Map !== 'function' ||
    // $FlowIssue Flow incorrectly thinks Map has no prototype
    Map.prototype == null ||
    typeof Map.prototype.forEach !== 'function' ||
    typeof Set !== 'function' ||
    // $FlowIssue Flow incorrectly thinks Set has no prototype
    Set.prototype == null ||
    typeof Set.prototype.clear !== 'function' ||
    typeof Set.prototype.forEach !== 'function'
  ) {
    warning(
      false,
      'React depends on Map and Set built-in types. Make sure that you load a ' +
        'polyfill in older browsers. https://fb.me/react-polyfills',
    );
  }

  topLevelUpdateWarnings = (container: DOMContainer) => {
    if (container._reactRootContainer && container.nodeType !== COMMENT_NODE) {
      // 这里是返回最高优先级的 fiber 事务
      const hostInstance = DOMRenderer.findHostInstanceWithNoPortals(
        container._reactRootContainer._internalRoot.current,
      );
      if (hostInstance) {
        warning(
          hostInstance.parentNode === container,
          'render(...): It looks like the React-rendered content of this ' +
            'container was removed without using React. This is not ' +
            'supported and will cause errors. Instead, call ' +
            'ReactDOM.unmountComponentAtNode to empty a container.',
        );
      }
    }

    const isRootRenderedBySomeReact = !!container._reactRootContainer;
    const rootEl = getReactRootElementInContainer(container);
    const hasNonRootReactChild = !!(
      rootEl && ReactDOMComponentTree.getInstanceFromNode(rootEl)
    );

    warning(
      !hasNonRootReactChild || isRootRenderedBySomeReact,
      'render(...): Replacing React-rendered children with a new root ' +
        'component. If you intended to update the children of this node, ' +
        'you should instead have the existing children update their state ' +
        'and render the new components instead of calling ReactDOM.render.',
    );

    warning(
      container.nodeType !== ELEMENT_NODE ||
        !((container: any): Element).tagName ||
        ((container: any): Element).tagName.toUpperCase() !== 'BODY',
      'render(): Rendering components directly into document.body is ' +
        'discouraged, since its children are often manipulated by third-party ' +
        'scripts and browser extensions. This may lead to subtle ' +
        'reconciliation issues. Try rendering into a container element created ' +
        'for your app.',
    );
  };

  warnOnInvalidCallback = function(callback: mixed, callerName: string) {
    warning(
      callback === null || typeof callback === 'function',
      '%s(...): Expected the last optional `callback` argument to be a ' +
        'function. Instead received: %s.',
      callerName,
      callback,
    );
  };
}

// react 受控组件 注入， 作用：把 ReactDOMFiberComponent 赋值给 全局变量 fiberHostComponent
ReactControlledComponent.injection.injectFiberControlledHostComponent(
  ReactDOMFiberComponent,
);

type DOMContainer =
  | (Element & {
      _reactRootContainer: ?Root,
    })
  | (Document & {
      _reactRootContainer: ?Root,
    });

type Batch = FiberRootBatch & {
  render(children: ReactNodeList): Work,
  then(onComplete: () => mixed): void,
  commit(): void,

 // ReactRoot 构造函数提升了，这里可以直接引用
  _root: Root,  // ReactRoot 构造函数
  _hasChildren: boolean,
  _children: ReactNodeList,

  _callbacks: Array<() => mixed> | null,
  _didComplete: boolean,
};

// 定义一个批量处理  ReactBatch 构造函数， 这个函数不是很重要
// 这里我们看一下 ReactRoot 做了什么， 创建一个节点容器，把这个实例赋值给  this._internalRoot
// 这里不能调用 ReactRoot 里面的 prototype 上的方法
function ReactBatch(root: ReactRoot) {
  const expirationTime = DOMRenderer.computeUniqueAsyncExpiration(); // 该方法返回过期时间
  this._expirationTime = expirationTime;
  this._root = root;
  this._next = null;
  this._callbacks = null;
  this._didComplete = false;
  this._hasChildren = false;
  this._children = null;
  this._defer = true;
}

// render 方法，参数是 ReactNodeList，实例化一个 ReactWork， 调用事务更新，并返回 ReactWork 实例
// ReactWork 实例主要干啥的呢，跳到 ReactWork 看一下逻辑
ReactBatch.prototype.render = function(children: ReactNodeList) {
  invariant(
    this._defer,
    'batch.render: Cannot render a batch that already committed.',
  );
  this._hasChildren = true;
  this._children = children;
  const internalRoot = this._root._internalRoot; // 这里追溯源头，_internalRoot 来自 ReactRoot 里面
  const expirationTime = this._expirationTime;
  const work = new ReactWork(); // 实例一个 ReactWork
  // 调度主事务更新 root，里面调用 createUpdate，enqueueUpdate，scheduleWork 这三个方法。可以自己去仔细看
  DOMRenderer.updateContainerAtExpirationTime(  
    children,                 // ReactNodeList
    internalRoot,             // 容器 OpaqueRoot 内部节点
    null,                     // 父组件
    expirationTime,           // 到期时间
    work._onCommit,           // 回调函数, _onCommit 的 this 是 ReactBatch，因为  ReactWork 里面绑定了
  );
  return work; // 这里作用是 执行该方法之后可以调到 ReactWork.prototype 上的方法
};

// 如果 this._didComplete 已经是一个函数的话，执行这个函数
// 参数是一个函数
// 函数执行玩着后 this._callbacks 变成了 一个数组，数组元素是函数
ReactBatch.prototype.then = function(onComplete: () => mixed) {
  // 这里判断，已经完成了的话，直接执行 onComplete，并中断向下执行
  if (this._didComplete) {
    onComplete();
    return;
  }
  let callbacks = this._callbacks;
  if (callbacks === null) {
    callbacks = this._callbacks = [];
  }
  callbacks.push(onComplete);  // 把 函数 push 进数组中
};

// 批提交函数
ReactBatch.prototype.commit = function() {
  const internalRoot = this._root._internalRoot; // 内部根节点，这里是 ReactRoot 函数里定义的
  let firstBatch = internalRoot.firstBatch;  // firstBatch 是 DOMRenderer.createContainer 里面调用的 createFiberRoot 里面定义的一个值
  invariant(
    this._defer && firstBatch !== null,
    'batch.commit: Cannot commit a batch multiple times.',
  );

  if (!this._hasChildren) { // 如果没有子节点，把接下来的事务清空，或者推后执行的事务清空，并停止向下执行
    // This batch is empty. Return.
    this._next = null;
    this._defer = false;
    return;
  }

  let expirationTime = this._expirationTime; // 到期时间

  // 这里加的判断，就是为了确保提交的节点是列表中的第一批要处理的 fiber，
  if (firstBatch !== this) {
    // 确保我们刷新它，不刷新其他批次
    if (this._hasChildren) {
      expirationTime = this._expirationTime = firstBatch._expirationTime;
      // 调用 ReactBatch.prototype.render 这个方法
      this.render(this._children);
    }

    // 从列表中删除该批次
    let previous = null;
    let batch = firstBatch;
    while (batch !== this) {
      previous = batch;
      batch = batch._next;
    }
    invariant(
      previous !== null,
      'batch.commit: Cannot commit a batch multiple times.',
    );
    previous._next = batch._next;

    // Add it to the front.
    this._next = firstBatch;
    firstBatch = internalRoot.firstBatch = this;
  }

  // 同步刷新此批到期时间之前的所有工作
  this._defer = false;
  DOMRenderer.flushRoot(internalRoot, expirationTime); // 把执行完成的节点刷新到 virtual dom 对象中

  // 弹出 已经完成的 这批事务，进入下一批
  const next = this._next;
  this._next = null;
  firstBatch = internalRoot.firstBatch = next;

  // 将下一批处理的子节点加入更新队列中
  if (firstBatch !== null && firstBatch._hasChildren) {
    firstBatch.render(firstBatch._children); // 调用 ReactBatch.prototype.render
  }
};
// 批次处理完之后的回调
ReactBatch.prototype._onComplete = function() {
  if (this._didComplete) {
    return;
  }
  this._didComplete = true;
  const callbacks = this._callbacks;
  if (callbacks === null) {
    return;
  }
  // TODO: Error handling.
  for (let i = 0; i < callbacks.length; i++) {
    const callback = callbacks[i];
    callback();
  }
};

type Work = {
  then(onCommit: () => mixed): void,
  _onCommit: () => void,
  _callbacks: Array<() => mixed> | null,
  _didCommit: boolean,
};

// 一些回调函数
function ReactWork() {
  this._callbacks = null;
  this._didCommit = false;

  // 通过将更新队列中的回调替换为工作对象列表
  this._onCommit = this._onCommit.bind(this);
}

// 处理完成之后的回调
ReactWork.prototype.then = function(onCommit: () => mixed): void {
  if (this._didCommit) {
    onCommit();
    return;
  }
  let callbacks = this._callbacks;
  if (callbacks === null) {
    callbacks = this._callbacks = [];
  }
  callbacks.push(onCommit); // 把回调函数
};

// 处理完成之后的回调
ReactWork.prototype._onCommit = function(): void {
  if (this._didCommit) {
    return;
  }
  this._didCommit = true;
  const callbacks = this._callbacks;
  if (callbacks === null) {
    return;
  }
  // TODO: Error handling.
  for (let i = 0; i < callbacks.length; i++) {
    const callback = callbacks[i];
    invariant(
      typeof callback === 'function',
      'Invalid argument passed as callback. Expected a function. Instead ' +
        'received: %s',
      callback,
    );
    callback();
  }
};

type Root = {
  render(children: ReactNodeList, callback: ?() => mixed): Work,
  unmount(callback: ?() => mixed): Work,
  legacy_renderSubtreeIntoContainer(
    parentComponent: ?React$Component<any, any>,
    children: ReactNodeList,
    callback: ?() => mixed,
  ): Work,
  createBatch(): Batch,

  _internalRoot: FiberRoot,
};

// 这里是 ReactRoot 创建容器节点，并赋值给 this._internalRoot 存起来
function ReactRoot(container: Container, isAsync: boolean, hydrate: boolean) {
  // createContainer 调用 createFiberRoot
  // createFiberRoot 调用 createHostRootFiber
  // createHostRootFiber 调用 createFiber
  // createFiber 调用 FiberNode
  const root = DOMRenderer.createContainer(container, isAsync, hydrate); // 新建一个事务根节点
  this._internalRoot = root;
}

// 渲染回调方法，和 ReactBatch.prototype.render 是一样的处理逻辑，不同的是，一个是处理批次，一个是处理单个
// 批次处理是调用单个实现的， 返回一个 ReactWork实例
ReactRoot.prototype.render = function(
  children: ReactNodeList,
  callback: ?() => mixed,
): Work {
  const root = this._internalRoot;
  const work = new ReactWork();
  callback = callback === undefined ? null : callback;
  if (__DEV__) {
    warnOnInvalidCallback(callback, 'render');
  }
  if (callback !== null) {
    work.then(callback);
  }
  // 调度主事务更新 root，里面调用 createUpdate，enqueueUpdate，scheduleWork 这三个方法。可以自己去仔细看
  DOMRenderer.updateContainer(children, root, null, work._onCommit);
  return work;  // 这里作用是 执行该方法之后可以调到 ReactWork.prototype 上的方法
};

// 卸载的回调方法，依然是更新对应的节点，返回一个 ReactWork实例
ReactRoot.prototype.unmount = function(callback: ?() => mixed): Work {
  const root = this._internalRoot;
  const work = new ReactWork();
  callback = callback === undefined ? null : callback;
  if (__DEV__) {
    warnOnInvalidCallback(callback, 'render');
  }
  if (callback !== null) {
    work.then(callback);
  }
  DOMRenderer.updateContainer(null, root, null, work._onCommit);
  return work; // 这里作用是 执行该方法之后可以调到 ReactWork.prototype 上的方法
};

// 有父节点的上下文的更新，返回一个 ReactWork实例，这个方法是 ReactDOM.hydrate()调用的主要方法
ReactRoot.prototype.legacy_renderSubtreeIntoContainer = function(
  parentComponent: ?React$Component<any, any>,
  children: ReactNodeList,
  callback: ?() => mixed,
): Work {
  const root = this._internalRoot;
  const work = new ReactWork();
  callback = callback === undefined ? null : callback;
  if (__DEV__) {
    warnOnInvalidCallback(callback, 'render');
  }
  if (callback !== null) {
    work.then(callback);
  }
  // 调度主事务更新 容器，里面调用 createUpdate，enqueueUpdate，scheduleWork 这三个方法。可以自己去仔细看
  DOMRenderer.updateContainer(children, root, parentComponent, work._onCommit);
  return work;  // 这里作用是 执行该方法之后可以调到 ReactWork.prototype 上的方法
};

// 返回一个 ReactBatch 实例
ReactRoot.prototype.createBatch = function(): Batch {
  const batch = new ReactBatch(this);
  const expirationTime = batch._expirationTime;

  const internalRoot = this._internalRoot;
  const firstBatch = internalRoot.firstBatch;
  if (firstBatch === null) {
    internalRoot.firstBatch = batch;
    batch._next = null;
  } else {
    // Insert sorted by expiration time then insertion order
    let insertAfter = null;
    let insertBefore = firstBatch;
    while (
      insertBefore !== null &&
      insertBefore._expirationTime <= expirationTime
    ) {
      insertAfter = insertBefore;
      insertBefore = insertBefore._next;
    }
    batch._next = insertBefore;
    if (insertAfter !== null) {
      insertAfter._next = batch;
    }
  }

  return batch;
};

// 如果提供的dom节点是有效的节点元素，则返回 true
function isValidContainer(node) {
  return !!(
    node &&
    (node.nodeType === ELEMENT_NODE ||
      node.nodeType === DOCUMENT_NODE ||
      node.nodeType === DOCUMENT_FRAGMENT_NODE ||
      (node.nodeType === COMMENT_NODE &&
        node.nodeValue === ' react-mount-point-unstable '))
  );
}

// 获取 react 元素容器 根节点
function getReactRootElementInContainer(container: any) {
  if (!container) {
    return null;
  }

  if (container.nodeType === DOCUMENT_NODE) {
    return container.documentElement;
  } else {
    return container.firstChild;
  }
}

// 判断容器是否需要合并容器内的节点
function shouldHydrateDueToLegacyHeuristic(container) {
  const rootElement = getReactRootElementInContainer(container);
  return !!(
    rootElement &&
    rootElement.nodeType === ELEMENT_NODE &&
    rootElement.hasAttribute(ROOT_ATTRIBUTE_NAME)
  );
}

ReactGenericBatching.injection.injectRenderer(DOMRenderer); // 事件

let warnedAboutHydrateAPI = false;

// 返回 ReactRoot 实例 为  legacyRenderSubtreeIntoContainer 方法调用
function legacyCreateRootFromDOMContainer(
  container: DOMContainer,
  forceHydrate: boolean,
): Root {
  const shouldHydrate =
    forceHydrate || shouldHydrateDueToLegacyHeuristic(container); // 判断是否需要保留原子节点
  // 首先清空容器内的所有节点
  // 如果调用 ReactDOM.hydrate()来创建 dom 的话，下面逻辑是不会进去的。
  // ReactDOM.render() 时候才会去删除所有节点
  if (!shouldHydrate) {
    let warned = false;
    let rootSibling;
    while ((rootSibling = container.lastChild)) {
      if (__DEV__) {
        if (
          !warned &&
          rootSibling.nodeType === ELEMENT_NODE &&
          (rootSibling: any).hasAttribute(ROOT_ATTRIBUTE_NAME)
        ) {
          warned = true;
          warning(
            false,
            'render(): Target node has markup rendered by React, but there ' +
              'are unrelated nodes as well. This is most commonly caused by ' +
              'white-space inserted around server-rendered markup.',
          );
        }
      }
      container.removeChild(rootSibling);
    }
  }
  if (__DEV__) {
    if (shouldHydrate && !forceHydrate && !warnedAboutHydrateAPI) {
      warnedAboutHydrateAPI = true;
      lowPriorityWarning(
        false,
        'render(): Calling ReactDOM.render() to hydrate server-rendered markup ' +
          'will stop working in React v17. Replace the ReactDOM.render() call ' +
          'with ReactDOM.hydrate() if you want React to attach to the server HTML.',
      );
    }
  }
  // 默认渲染是同步
  const isAsync = false;
  // 返回 ReactRoot 实例，作用就是创建一个 dom 节点作为根节点
  return new ReactRoot(container, isAsync, shouldHydrate);
}

// 返回根节点实例
// 如果 parentComponent 存在，则 container 会挂载在 parentComponent 上
function legacyRenderSubtreeIntoContainer(
  parentComponent: ?React$Component<any, any>, // 要挂载的父节点
  children: ReactNodeList,       // 要挂在的子节点
  container: DOMContainer,       // 子节点 children 的容器节点
  forceHydrate: boolean,         // 是否合并，通常是 false， 后端渲染 hydrate 时候是 true
  callback: ?Function,           // 回调函数
) {
  // TODO: Ensure all entry points contain this check
  invariant(
    isValidContainer(container),
    'Target container is not a DOM element.',
  );

  if (__DEV__) {
    topLevelUpdateWarnings(container);
  }

  // TODO: Without `any` type, Flow says "Property cannot be accessed on any
  // member of intersection type." Whyyyyyy.
  let root: Root = (container._reactRootContainer: any); // 这里就是为了解决 flow 报错，原来Facebook 也会遇见这种问题，阿哈哈哈哈，其实就是一个变量定义
  if (!root) {
    // 首次挂载  !root 内的就是初次渲染的逻辑
    // root 是 legacyCreateRootFromDOMContainer 生成一个 fiber 对象
    root = container._reactRootContainer = legacyCreateRootFromDOMContainer(
      container,
      forceHydrate,
    );
    if (typeof callback === 'function') {
      // 回调函数封装
      const originalCallback = callback;
      callback = function() {
        const instance = DOMRenderer.getPublicRootInstance(root._internalRoot);
        originalCallback.call(instance);
      };
    }
    // 因为这是初次渲染，需要尽快完成。
    DOMRenderer.unbatchedUpdates(() => {
      if (parentComponent != null) { //  这里是 ReactDOM.hydrate 使用，一般用于服务器端渲染
        root.legacy_renderSubtreeIntoContainer(
          parentComponent,
          children,
          callback,
        );
      } else { // 这里是 ReactDOM.render 使用
        root.render(children, callback);
      }
    });
  } else {
    if (typeof callback === 'function') {
      const originalCallback = callback;
      callback = function() {
        const instance = DOMRenderer.getPublicRootInstance(root._internalRoot);
        originalCallback.call(instance);
      };
    }
    // Update
    if (parentComponent != null) { //  这里是 ReactDOM.hydrate 使用，一般用于服务器端渲染
      root.legacy_renderSubtreeIntoContainer(
        parentComponent,
        children,
        callback,
      );
    } else {  // 这里是 ReactDOM.render 使用
      root.render(children, callback);
    }
  }
  // 返回 ReactRoot 实例生成fiber对象
  return DOMRenderer.getPublicRootInstance(root._internalRoot);
}

//  创建一个 Portal
function createPortal(
  children: ReactNodeList,
  container: DOMContainer,
  key: ?string = null,
) {
  invariant(
    isValidContainer(container),
    'Target container is not a DOM element.',
  );
  // TODO: 将reactdom 的 portal 实现作为第三个参数传递
  return ReactPortal.createPortal(children, container, null, key);
}


// 定义 ReactDOM 对象
const ReactDOM: Object = {
  createPortal,  // 创建一个 Portal 类型组件

  // 获取真实DOM
  findDOMNode(
    componentOrElement: Element | ?React$Component<any, any>,
  ): null | Element | Text {
    if (__DEV__) {
      let owner = (ReactCurrentOwner.current: any);
      if (owner !== null && owner.stateNode !== null) {
        const warnedAboutRefsInRender =
          owner.stateNode._warnedAboutRefsInRender;
        warning(
          warnedAboutRefsInRender,
          '%s is accessing findDOMNode inside its render(). ' +
            'render() should be a pure function of props and state. It should ' +
            'never access something that requires stale data from the previous ' +
            'render, such as refs. Move this logic to componentDidMount and ' +
            'componentDidUpdate instead.',
          getComponentName(owner) || 'A component',
        );
        owner.stateNode._warnedAboutRefsInRender = true;
      }
    }
    if (componentOrElement == null) {
      return null;
    }
    if ((componentOrElement: any).nodeType === ELEMENT_NODE) {
      return (componentOrElement: any);
    }

    return DOMRenderer.findHostInstance(componentOrElement); // 找到 fiber 主节点的dom
  },

  // 还拽特, 一般用于服务器端渲染
  hydrate(element: React$Node, container: DOMContainer, callback: ?Function) {
    // TODO: throw or warn if we couldn't hydrate?
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      true,
      callback,
    );
  },

  // 常用的 render
  render(
    element: React$Element<any>,
    container: DOMContainer,
    callback: ?Function,
  ) {
    return legacyRenderSubtreeIntoContainer(
      null,
      element,
      container,
      false,
      callback,
    );
  },

  // 试验性 api 不关心
  unstable_renderSubtreeIntoContainer(
    parentComponent: React$Component<any, any>,
    element: React$Element<any>,
    containerNode: DOMContainer,
    callback: ?Function,
  ) {
    invariant(
      parentComponent != null && ReactInstanceMap.has(parentComponent),
      'parentComponent must be a valid React Component',
    );
    return legacyRenderSubtreeIntoContainer(
      parentComponent,
      element,
      containerNode,
      false,
      callback,
    );
  },

  // 从DOM中删除已安装(mounted) React 组件，并清除其 event handle 和 state
  unmountComponentAtNode(container: DOMContainer) {
    invariant(
      isValidContainer(container),
      'unmountComponentAtNode(...): Target container is not a DOM element.',
    );

    if (container._reactRootContainer) {
      if (__DEV__) {
        const rootEl = getReactRootElementInContainer(container);
        const renderedByDifferentReact =
          rootEl && !ReactDOMComponentTree.getInstanceFromNode(rootEl);
        warning(
          !renderedByDifferentReact,
          "unmountComponentAtNode(): The node you're attempting to unmount " +
            'was rendered by another copy of React.',
        );
      }

      // Unmount should not be batched.
      // 因为这需要尽快完成
      DOMRenderer.unbatchedUpdates(() => {
        legacyRenderSubtreeIntoContainer(null, null, container, false, () => {
          container._reactRootContainer = null;
        });
      });
      // If you call unmountComponentAtNode twice in quick succession, you'll
      // get `true` twice. That's probably fine?
      return true;
    } else {
      if (__DEV__) {
        const rootEl = getReactRootElementInContainer(container);
        const hasNonRootReactChild = !!(
          rootEl && ReactDOMComponentTree.getInstanceFromNode(rootEl)
        );

        // Check if the container itself is a React root node.
        const isContainerReactRoot =
          container.nodeType === 1 &&
          isValidContainer(container.parentNode) &&
          !!container.parentNode._reactRootContainer;

        warning(
          !hasNonRootReactChild,
          "unmountComponentAtNode(): The node you're attempting to unmount " +
            'was rendered by React and is not a top-level container. %s',
          isContainerReactRoot
            ? 'You may have accidentally passed in a React root node instead ' +
              'of its container.'
            : 'Instead, have the parent component update its state and ' +
              'rerender in order to remove this component.',
        );
      }

      return false;
    }
  },

  // 17 版本将移除，所以不用关心
  unstable_createPortal(...args) {
    if (!didWarnAboutUnstableCreatePortal) {
      didWarnAboutUnstableCreatePortal = true;
      lowPriorityWarning(
        false,
        'The ReactDOM.unstable_createPortal() alias has been deprecated, ' +
          'and will be removed in React 17+. Update your code to use ' +
          'ReactDOM.createPortal() instead. It has the exact same API, ' +
          'but without the "unstable_" prefix.',
      );
    }
    return createPortal(...args);
  },

  unstable_batchedUpdates: DOMRenderer.batchedUpdates,

  unstable_deferredUpdates: DOMRenderer.deferredUpdates,

  unstable_interactiveUpdates: DOMRenderer.interactiveUpdates,

  // 同步刷新，作用就是 提高某一个自组建的渲染 优先级
  flushSync: DOMRenderer.flushSync,

  unstable_flushControlled: DOMRenderer.flushControlled,

  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: {
    // 因为 开源中流行 tapeventplugin
    EventPluginHub,
    // Used by test-utils
    EventPluginRegistry,
    EventPropagators,
    ReactControlledComponent,
    ReactDOMComponentTree,
    ReactDOMEventListener,
  },
};

type RootOptions = {
  hydrate?: boolean,
};

// 不稳定版本创建根节点，看源码可以忽略它
ReactDOM.unstable_createRoot = function createRoot(
  container: DOMContainer,
  options?: RootOptions,
): ReactRoot {
  const hydrate = options != null && options.hydrate === true;
  return new ReactRoot(container, true, hydrate);
};

const foundDevTools = DOMRenderer.injectIntoDevTools({
  findFiberByHostInstance: ReactDOMComponentTree.getClosestInstanceFromNode,
  bundleType: __DEV__ ? 1 : 0,
  version: ReactVersion,
  rendererPackageName: 'react-dom',
});

if (__DEV__) {
  if (
    !foundDevTools &&
    ExecutionEnvironment.canUseDOM &&
    window.top === window.self
  ) {
    // If we're in Chrome or Firefox, provide a download link if not installed.
    if (
      (navigator.userAgent.indexOf('Chrome') > -1 &&
        navigator.userAgent.indexOf('Edge') === -1) ||
      navigator.userAgent.indexOf('Firefox') > -1
    ) {
      const protocol = window.location.protocol;
      // Don't warn in exotic cases like chrome-extension://.
      if (/^(https?|file):$/.test(protocol)) {
        console.info(
          '%cDownload the React DevTools ' +
            'for a better development experience: ' +
            'https://fb.me/react-devtools' +
            (protocol === 'file:'
              ? '\nYou might need to use a local HTTP server (instead of file://): ' +
                'https://fb.me/react-devtools-faq'
              : ''),
          'font-weight:bold',
        );
      }
    }
  }
}

export default ReactDOM;
