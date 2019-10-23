// shared 引用的只是一些警告提示，暂时忽略
import type {ReactElement, Source} from 'shared/ReactElementType';
import type {ReactFragment, ReactPortal, RefObject} from 'shared/ReactTypes';
import type {TypeOfWork} from 'shared/ReactTypeOfWork';

import type {TypeOfMode} from './ReactTypeOfMode'; // 不同状态优先级的值定义
import type {TypeOfSideEffect} from 'shared/ReactTypeOfSideEffect'; // 暂时忽略
import type {ExpirationTime} from './ReactFiberExpirationTime';  // ReactFiber 的到期时间定义
import type {UpdateQueue} from './ReactUpdateQueue'; // 更新队列

import invariant from 'fbjs/lib/invariant';
import {enableProfilerTimer} from 'shared/ReactFeatureFlags';
import {NoEffect} from 'shared/ReactTypeOfSideEffect';
import {
  IndeterminateComponent,
  ClassComponent,
  HostRoot,
  HostComponent,
  HostText,
  HostPortal,
  ForwardRef,
  Fragment,
  Mode,
  ContextProvider,
  ContextConsumer,
  Profiler,
  TimeoutComponent,
} from 'shared/ReactTypeOfWork';
import getComponentName from 'shared/getComponentName';

import {NoWork} from './ReactFiberExpirationTime';
import {NoContext, AsyncMode, ProfileMode, StrictMode} from './ReactTypeOfMode';
import {
  REACT_FORWARD_REF_TYPE,
  REACT_FRAGMENT_TYPE,
  REACT_STRICT_MODE_TYPE,
  REACT_PROFILER_TYPE,
  REACT_PROVIDER_TYPE,
  REACT_CONTEXT_TYPE,
  REACT_ASYNC_MODE_TYPE,
  REACT_TIMEOUT_TYPE,
} from 'shared/ReactSymbols';

let hasBadMapPolyfill;

if (__DEV__) {
  hasBadMapPolyfill = false;
  try {
    const nonExtensibleObject = Object.preventExtensions({});
    const testMap = new Map([[nonExtensibleObject, null]]);
    const testSet = new Set([nonExtensibleObject]);
    // This is necessary for Rollup to not consider these unused.
    // https://github.com/rollup/rollup/issues/1771
    // TODO: we can remove these if Rollup fixes the bug.
    testMap.set(0, 0);
    testSet.add(0);
  } catch (e) {
    // TODO: Consider warning about bad polyfills
    hasBadMapPolyfill = true;
  }
}


// 定义 Fiber 的类型， fiber ：最小工作单元
export type Fiber = {|

  // 定义 fiber 的不同组件类型的工作码，目前是 1 到 16 的数字
  tag: TypeOfWork,

  // 子项的唯一标识符.
  key: null | string,

  // fiber 类型可以是 function/class
  type: any,

  // 跟当前Fiber相关本地状态（比如浏览器环境就是DOM节点）
  stateNode: any,

  // 在概念上与堆栈帧的返回地址相同
  // 指向他在Fiber节点树中的`parent`，用来在处理完这个节点之后向上返回
  return: Fiber | null,

  // 单链表树结构
  // 指向自己的第一个子节点
  child: Fiber | null,
  // 指向自己的兄弟结构
  // 兄弟节点的return指向同一个父节点
  sibling: Fiber | null,
  // 索引
  index: number,

  // 上次用于附加此节点的ref
  ref: null | (((handle: mixed) => void) & {_stringRef: ?string}) | RefObject,

  pendingProps: any, // 新的变动带来的新的 props

  memoizedProps: any, // 缓存上一次渲染完成之后的props, 便于恢复

  // 状态更新和回调的队列
  // updateQueue是一个单向链表，firstUpdate和lastUpdate分别指向链表的头部和尾部。记录fiber对应的React Element的state变化
  updateQueue: UpdateQueue<any> | null,

  memoizedState: any,  // 缓存上一次渲染的时候的state， 用于创建输出的状态

  mode: TypeOfMode, // fiber 节点类型

  // 当前有效 tag  
  // 在React中，Dom节点state和props的改变导致视图改变的操作称为side effect.
  // effectTag就是记录这种操作，在源码中以二进制的形式保存，因此可以记录多种操作
  effectTag: TypeOfSideEffect,

  // 单链表用来快速查找下一个side effect
  nextEffect: Fiber | null,

  // 子树中第一个side effect
  firstEffect: Fiber | null,

  // 子树中最后一个side effect
  lastEffect: Fiber | null,

  // 到期时间， 本质上是fiber work执行的优先级
  // 代表任务在未来的哪个时间点应该被完成
  // 不包括他的子树产生的任务
  expirationTime: ExpirationTime,

  // 在Fiber树更新的过程中，每个Fiber都会有一个跟其对应的Fiber
  // 我们称他为`current <==> workInProgress`
  // 在渲染完成之后他们会交换位置
  // fiber 在计算状态和等待状态之间进行切换，需要记住的信息
  // 一个React组件有current fiber和alternate fiber，alternate fiber也被称为work in progress fiber
  // 当组件第一次render时构建的fiber tree为current，接下来当组件状态改变时新构建的fiber tree称为work in progress，代表将来的新状态。
  // 这两个fiber都有一个更新队列(UpdateQueue)。队列中item的引用是相同的，区别在于，work in progress fiber会在从队列中移除更新好的item。
  // 因此working in progress中的updateQueue是current fiber updateQueue的一个子集
  // 所有更新完成之后，working in progress fiber成为新的current fiber。如果更新中断或失败，current fiber可以用来恢复

  alternate: Fiber | null,

  // 下面是调试相关的，收集每个Fiber和子树渲染时间的

  actualDuration?: number,  // 实际持续时间 可选的参数 ？就是可选的意思 ：后是类型

  actualStartTime?: number, // 实际开始时间 可选的参数 ？就是可选的意思 ：后是类型

  selfBaseTime?: number, //  可选的参数 ？就是可选的意思 ：后是类型

  treeBaseTime?: number, 

  _debugID?: number,  
  _debugSource?: Source | null, 
  _debugOwner?: Fiber | null, 
  _debugIsCurrentlyTiming?: boolean,
|};

let debugCounter;

if (__DEV__) {
  debugCounter = 1;
}

//  fiber,定义 fiber 对象构造器
function FiberNode(
  tag: TypeOfWork,
  pendingProps: mixed,
  key: null | string,
  mode: TypeOfMode,
) {
  // Instance
  this.tag = tag;
  this.key = key;
  this.type = null;
  this.stateNode = null;

  // Fiber
  this.return = null;
  this.child = null;
  this.sibling = null;
  this.index = 0;

  this.ref = null;

  this.pendingProps = pendingProps;
  this.memoizedProps = null;
  this.updateQueue = null;
  this.memoizedState = null;

  this.mode = mode;

  // Effects
  this.effectTag = NoEffect;
  this.nextEffect = null;

  this.firstEffect = null;
  this.lastEffect = null;

  this.expirationTime = NoWork;

  this.alternate = null;

  if (enableProfilerTimer) {
    this.actualDuration = 0;
    this.actualStartTime = 0;
    this.selfBaseTime = 0;
    this.treeBaseTime = 0;
  }

  if (__DEV__) {
    this._debugID = debugCounter++;
    this._debugSource = null;
    this._debugOwner = null;
    this._debugIsCurrentlyTiming = false;
    if (!hasBadMapPolyfill && typeof Object.preventExtensions === 'function') {
      Object.preventExtensions(this);   // Object.preventExtensions()方法让一个对象变的不可扩展，也就是永远不能再添加新的属性。
    }
  }
}

// This is a constructor function, rather than a POJO constructor, still
// please ensure we do the following:
// 1) Nobody should add any instance methods on this. Instance methods can be
//    more difficult to predict when they get optimized and they are almost
//    never inlined properly in static compilers.
// 2) Nobody should rely on `instanceof Fiber` for type testing. We should
//    always know when it is a fiber.
// 3) We might want to experiment with using numeric keys since they are easier
//    to optimize in a non-JIT environment.
// 4) We can easily go from a constructor to a createFiber object literal if that
//    is faster.
// 5) It should be easy to port this to a C struct and keep a C implementation
//    compatible.

// 新建一个 fiber，返回  FiberNode 构造器定义的对象
const createFiber = function(
  tag: TypeOfWork,
  pendingProps: mixed,
  key: null | string, 
  mode: TypeOfMode,
): Fiber {
  // $FlowFixMe: the shapes are exact here but Flow doesn't like constructors
  // 这里是把 FiberNode 这个函数的 this 对象返回，其实就是返回一个对象，key 就是 FiberNode 里面定义的 this.XXX
  return new FiberNode(tag, pendingProps, key, mode); 
};

// 是否是构造器
function shouldConstruct(Component) {
  return !!(Component.prototype && Component.prototype.isReactComponent);
}

// This is used to create an alternate fiber to do work on.
// 创建一个更新过程中的的 fiber 的存储器
export function createWorkInProgress(
  current: Fiber,
  pendingProps: any,
  expirationTime: ExpirationTime,
): Fiber {
  let workInProgress = current.alternate;
  if (workInProgress === null) {
    // We use a double buffering pooling technique because we know that we'll
    // only ever need at most two versions of a tree. We pool the "other" unused
    // node that we're free to reuse. This is lazily created to avoid allocating
    // extra objects for things that are never updated. It also allow us to
    // reclaim the extra memory if needed.
    workInProgress = createFiber(
      current.tag,
      pendingProps,
      current.key,
      current.mode,
    );
    workInProgress.type = current.type;
    workInProgress.stateNode = current.stateNode;

    if (__DEV__) {
      // DEV-only fields
      workInProgress._debugID = current._debugID;
      workInProgress._debugSource = current._debugSource;
      workInProgress._debugOwner = current._debugOwner;
    }

    workInProgress.alternate = current;
    current.alternate = workInProgress;
  } else {
    workInProgress.pendingProps = pendingProps;

    // We already have an alternate.
    // Reset the effect tag.
    workInProgress.effectTag = NoEffect;

    // The effect list is no longer valid.
    workInProgress.nextEffect = null;
    workInProgress.firstEffect = null;
    workInProgress.lastEffect = null;

    if (enableProfilerTimer) {
      // We intentionally reset, rather than copy, actualDuration & actualStartTime.
      // This prevents time from endlessly accumulating in new commits.
      // This has the downside of resetting values for different priority renders,
      // But works for yielding (the common case) and should support resuming.
      workInProgress.actualDuration = 0;
      workInProgress.actualStartTime = 0;
    }
  }

  workInProgress.expirationTime = expirationTime;

  workInProgress.child = current.child;
  workInProgress.memoizedProps = current.memoizedProps;
  workInProgress.memoizedState = current.memoizedState;
  workInProgress.updateQueue = current.updateQueue;

  // These will be overridden during the parent's reconciliation
  workInProgress.sibling = current.sibling;
  workInProgress.index = current.index;
  workInProgress.ref = current.ref;

  if (enableProfilerTimer) {
    workInProgress.selfBaseTime = current.selfBaseTime;
    workInProgress.treeBaseTime = current.treeBaseTime;
  }

  return workInProgress;
}

// 新建一个fiber 的根节点容器
export function createHostRootFiber(isAsync: boolean): Fiber {
  const mode = isAsync ? AsyncMode | StrictMode : NoContext;
  return createFiber(HostRoot, null, null, mode);
}

// 新建一个记住 element 的工作单元
export function createFiberFromElement(
  element: ReactElement,
  mode: TypeOfMode,
  expirationTime: ExpirationTime,
): Fiber {
  let owner = null;
  if (__DEV__) {
    owner = element._owner;
  }

  let fiber;
  const type = element.type;
  const key = element.key;
  let pendingProps = element.props;

  let fiberTag;
  if (typeof type === 'function') {
    fiberTag = shouldConstruct(type) ? ClassComponent : IndeterminateComponent;
  } else if (typeof type === 'string') {
    fiberTag = HostComponent;
  } else {
    switch (type) {
      case REACT_FRAGMENT_TYPE:
        return createFiberFromFragment(
          pendingProps.children,
          mode,
          expirationTime,
          key,
        );
      case REACT_ASYNC_MODE_TYPE:
        fiberTag = Mode;
        mode |= AsyncMode | StrictMode;
        break;
      case REACT_STRICT_MODE_TYPE:
        fiberTag = Mode;
        mode |= StrictMode;
        break;
      case REACT_PROFILER_TYPE:
        return createFiberFromProfiler(pendingProps, mode, expirationTime, key);
      case REACT_TIMEOUT_TYPE:
        fiberTag = TimeoutComponent;
        // Suspense does not require async, but its children should be strict
        // mode compatible.
        mode |= StrictMode;
        break;
      default:
        fiberTag = getFiberTagFromObjectType(type, owner);
        break;
    }
  }

  fiber = createFiber(fiberTag, pendingProps, key, mode);
  fiber.type = type;
  fiber.expirationTime = expirationTime;

  if (__DEV__) {
    fiber._debugSource = element._source;
    fiber._debugOwner = element._owner;
  }

  return fiber;
}

// 获取 fiber 对象
function getFiberTagFromObjectType(type, owner): TypeOfWork {
  const $$typeof =
    typeof type === 'object' && type !== null ? type.$$typeof : null;

  switch ($$typeof) {
    case REACT_PROVIDER_TYPE:
      return ContextProvider;
    case REACT_CONTEXT_TYPE:
      // This is a consumer
      return ContextConsumer;
    case REACT_FORWARD_REF_TYPE:
      return ForwardRef;
    default: {
      let info = '';
      if (__DEV__) {
        if (
          type === undefined ||
          (typeof type === 'object' &&
            type !== null &&
            Object.keys(type).length === 0)
        ) {
          info +=
            ' You likely forgot to export your component from the file ' +
            "it's defined in, or you might have mixed up default and " +
            'named imports.';
        }
        const ownerName = owner ? getComponentName(owner) : null;
        if (ownerName) {
          info += '\n\nCheck the render method of `' + ownerName + '`.';
        }
      }
      invariant(
        false,
        'Element type is invalid: expected a string (for built-in ' +
          'components) or a class/function (for composite components) ' +
          'but got: %s.%s',
        type == null ? type : typeof type,
        info,
      );
    }
  }
}

// 新建一个 记住 Fragment
export function createFiberFromFragment(
  elements: ReactFragment,
  mode: TypeOfMode,
  expirationTime: ExpirationTime,
  key: null | string,
): Fiber {
  const fiber = createFiber(Fragment, elements, key, mode);
  fiber.expirationTime = expirationTime;
  return fiber;
}

// 
export function createFiberFromProfiler(
  pendingProps: any,
  mode: TypeOfMode,
  expirationTime: ExpirationTime,
  key: null | string,
): Fiber {
  if (__DEV__) {
    if (
      typeof pendingProps.id !== 'string' ||
      typeof pendingProps.onRender !== 'function'
    ) {
      invariant(
        false,
        'Profiler must specify an "id" string and "onRender" function as props',
      );
    }
  }

  const fiber = createFiber(Profiler, pendingProps, key, mode | ProfileMode);
  fiber.type = REACT_PROFILER_TYPE;
  fiber.expirationTime = expirationTime;

  return fiber;
}

export function createFiberFromText(
  content: string,
  mode: TypeOfMode,
  expirationTime: ExpirationTime,
): Fiber {
  const fiber = createFiber(HostText, content, null, mode);
  fiber.expirationTime = expirationTime;
  return fiber;
}

export function createFiberFromHostInstanceForDeletion(): Fiber {
  const fiber = createFiber(HostComponent, null, null, NoContext);
  fiber.type = 'DELETED';
  return fiber;
}

export function createFiberFromPortal(
  portal: ReactPortal,
  mode: TypeOfMode,
  expirationTime: ExpirationTime,
): Fiber {
  const pendingProps = portal.children !== null ? portal.children : [];
  const fiber = createFiber(HostPortal, pendingProps, portal.key, mode);
  fiber.expirationTime = expirationTime;
  fiber.stateNode = {
    containerInfo: portal.containerInfo,
    pendingChildren: null, // Used by persistent updates
    implementation: portal.implementation,
  };
  return fiber;
}

// Used for stashing WIP properties to replay failed work in DEV.
export function assignFiberPropertiesInDEV(
  target: Fiber | null,
  source: Fiber,
): Fiber {
  if (target === null) {
    // This Fiber's initial properties will always be overwritten.
    // We only use a Fiber to ensure the same hidden class so DEV isn't slow.
    target = createFiber(IndeterminateComponent, null, null, NoContext);
  }

  // This is intentionally written as a list of all properties.
  // We tried to use Object.assign() instead but this is called in
  // the hottest path, and Object.assign() was too slow:
  // https://github.com/facebook/react/issues/12502
  // This code is DEV-only so size is not a concern.

  target.tag = source.tag;
  target.key = source.key;
  target.type = source.type;
  target.stateNode = source.stateNode;
  target.return = source.return;
  target.child = source.child;
  target.sibling = source.sibling;
  target.index = source.index;
  target.ref = source.ref;
  target.pendingProps = source.pendingProps;
  target.memoizedProps = source.memoizedProps;
  target.updateQueue = source.updateQueue;
  target.memoizedState = source.memoizedState;
  target.mode = source.mode;
  target.effectTag = source.effectTag;
  target.nextEffect = source.nextEffect;
  target.firstEffect = source.firstEffect;
  target.lastEffect = source.lastEffect;
  target.expirationTime = source.expirationTime;
  target.alternate = source.alternate;
  if (enableProfilerTimer) {
    target.actualDuration = source.actualDuration;
    target.actualStartTime = source.actualStartTime;
    target.selfBaseTime = source.selfBaseTime;
    target.treeBaseTime = source.treeBaseTime;
  }
  target._debugID = source._debugID;
  target._debugSource = source._debugSource;
  target._debugOwner = source._debugOwner;
  target._debugIsCurrentlyTiming = source._debugIsCurrentlyTiming;
  return target;
}
