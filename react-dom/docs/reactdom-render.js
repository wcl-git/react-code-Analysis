//  这里是reactdom.render 的源码调用的重要方法，
// DOMRenderer.xxxx 的方法都复制在当前 js 中，为了不影响大家感官，DOMRenderer.没有去掉，
// 代码解析到 scheduleWork ， scheduleWork包含的代码 是更新的逻辑，由于这里逻辑很多，另外一个js文件

// 常用的 render api
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
}

// 按一定规律将子节点渲染进容器内
// 如果 parentComponent 存在，则 container 会挂载在 parentComponent 上
function legacyRenderSubtreeIntoContainer(
  parentComponent: ?React$Component<any, any>, // 要挂载的父节点
  children: ReactNodeList,       // 要挂在的子节点
  container: DOMContainer,       // 子节点 children 的容器节点
  forceHydrate: boolean,         // 是否合并，通常是 false， 后端渲染 hydrate 时候是 true
  callback: ?Function,           // 回调函数
) {
  // 这里是一些警告，暂时忽略
  invariant(
    isValidContainer(container),
    'Target container is not a DOM element.',
  );
    // 开发调试，不用关心
  if (__DEV__) {
    topLevelUpdateWarnings(container);
  }


  let root: Root = (container._reactRootContainer: any); // 这里就是为了解决 flow 报错，原来Facebook 也会遇见这种问题，阿哈哈哈哈，其实就是一个变量定义
  if (!root) {
    // 首次挂载  !root 内的就是初次渲染的逻辑
    // root 是 legacyCreateRootFromDOMContainer 生成一个 fiber 对象
    // 函数字面意思 在 dom 容器中安规定创建根节点，说白了就是在html 节点上增加子节点 dom
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
  // 返回 ReactRoot 实例生成fiber对象根节点实例
  return DOMRenderer.getPublicRootInstance(root._internalRoot);
}

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

// 返回 fiber 根节点的片段
function getPublicRootInstance(
  container: OpaqueRoot,
): React$Component<any, any> | PublicInstance | null {
  const containerFiber = container.current;
  if (!containerFiber.child) {
    return null;
  }
  switch (containerFiber.child.tag) {
    case HostComponent:
      return getPublicInstance(containerFiber.child.stateNode);
    default:
      return containerFiber.child.stateNode;
  }
}

// 单个更新
function unbatchedUpdates<A, R>(fn: (a: A) => R, a: A): R {
  if (isBatchingUpdates && !isUnbatchingUpdates) {
    isUnbatchingUpdates = true;
    try {
      return fn(a);
    } finally {
      isUnbatchingUpdates = false;
    }
  }
  return fn(a);
}



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

// 新建主事务的容器
function createContainer(
  containerInfo: Container,
  isAsync: boolean,
  hydrate: boolean,
): OpaqueRoot {
  return createFiberRoot(containerInfo, isAsync, hydrate);
}

function createFiberRoot(
  containerInfo: any,
  isAsync: boolean,
  hydrate: boolean,
): FiberRoot {
  // 循环构造。这为了屏蔽类型系统监测，因为
  // statenode是any
  const uninitializedFiber = createHostRootFiber(isAsync);
  const root = {
    current: uninitializedFiber, // 当前应用对应的 Fiber 对象，是Root Fiber
    containerInfo: containerInfo,  // root节点，render方法接收的第二个参数
    pendingChildren: null,  // 只有在持久更新中会用到，也就是不支持增量更新的平台，react-dom不会用到

    // 最老和最新的在提交的时候被挂起的任务优先级 NoWork 是 0
    earliestPendingTime: NoWork,
    latestPendingTime: NoWork,
    // 最老和最新的不确定是否会挂起的优先级（所有任务进来一开始都是这个状态）
    earliestSuspendedTime: NoWork,
    latestSuspendedTime: NoWork,

    //  最晚时间， 最新的通过一个promise被reslove并且可以重新尝试的优先级
    latestPingedTime: NoWork,

    // 正在等待提交的任务的`expirationTime`
    pendingCommitExpirationTime: NoWork,

    // 已经完成的任务的FiberRoot对象，如果你只有一个Root，那他永远只可能是这个Root对应的Fiber，或者是null
    // 在commit阶段只会处理这个值对应的任务
    finishedWork: null,
    // 顶层context对象，只有主动调用`renderSubtreeIntoContainer`时才会有用
    context: null,
    pendingContext: null,

    // 用来确定第一次渲染的时候是否需要融合
    hydrate,
    // 剩余到期时间
    remainingExpirationTime: NoWork,
    // 顶层批次（批处理任务？）这个变量指明一个commit是否应该被推迟
    firstBatch: null,
    // root之间关联的链表结构
    // 下一个计划的根节点
    nextScheduledRoot: null,
  };
  uninitializedFiber.stateNode = root;
  return root;
}

// 新建一个fiber 的根节点容器
function createHostRootFiber(isAsync: boolean): Fiber {
  const mode = isAsync ? AsyncMode | StrictMode : NoContext;
  return createFiber(HostRoot, null, null, mode);
}

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

// 更新容器
function updateContainer(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  callback: ?Function,
): ExpirationTime {
  const current = container.current;
  const currentTime = recalculateCurrentTime();
  const expirationTime = computeExpirationForFiber(currentTime, current);
  return updateContainerAtExpirationTime(
    element,
    container,
    parentComponent,
    expirationTime,
    callback,
  );
}

function recalculateCurrentTime(): ExpirationTime {
  // Subtract initial time so it fits inside 32bits
  mostRecentCurrentTimeMs = now() - originalStartTimeMs;
  mostRecentCurrentTime = msToExpirationTime(mostRecentCurrentTimeMs);
  return mostRecentCurrentTime;
}

// 计算工作单元的过期时间
function computeExpirationForFiber(currentTime: ExpirationTime, fiber: Fiber) {
  let expirationTime;
  if (expirationContext !== NoWork) {
    // An explicit expiration context was set;
    expirationTime = expirationContext;
  } else if (isWorking) {
    if (isCommitting) {
      // Updates that occur during the commit phase should have sync priority
      // by default.
      expirationTime = Sync;
    } else {
      // Updates during the render phase should expire at the same time as
      // the work that is being rendered.
      expirationTime = nextRenderExpirationTime;
    }
  } else {
    // No explicit expiration context was set, and we're not currently
    // performing work. Calculate a new expiration time.
    if (fiber.mode & AsyncMode) {
      if (isBatchingInteractiveUpdates) {
        // This is an interactive update
        expirationTime = computeInteractiveExpiration(currentTime);
      } else {
        // This is an async update
        expirationTime = computeAsyncExpiration(currentTime);
      }
    } else {
      // This is a sync update
      expirationTime = Sync;
    }
  }
  if (isBatchingInteractiveUpdates) {
    // This is an interactive update. Keep track of the lowest pending
    // interactive expiration time. This allows us to synchronously flush
    // all interactive updates when needed.
    if (
      lowestPendingInteractiveExpirationTime === NoWork ||
      expirationTime > lowestPendingInteractiveExpirationTime
    ) {
      lowestPendingInteractiveExpirationTime = expirationTime;
    }
  }
  return expirationTime;
}

function computeInteractiveExpiration(currentTime: ExpirationTime) {
  let expirationMs;
  if (__DEV__) {
    // Should complete within ~500ms. 600ms max.
    expirationMs = 500;
  } else {
    // In production things should be more responsive, 150ms max.
    expirationMs = 150;
  }
  const bucketSizeMs = 100;
  return computeExpirationBucket(currentTime, expirationMs, bucketSizeMs);
}

function computeAsyncExpiration(currentTime: ExpirationTime) {
  const expirationMs = 5000;
  const bucketSizeMs = 250;
  return computeExpirationBucket(currentTime, expirationMs, bucketSizeMs);
}

function computeExpirationBucket(
  currentTime: ExpirationTime,
  expirationInMs: number,
  bucketSizeMs: number,
): ExpirationTime {
  return (
    MAGIC_NUMBER_OFFSET +
    ceiling(
      currentTime - MAGIC_NUMBER_OFFSET + expirationInMs / UNIT_SIZE,
      bucketSizeMs / UNIT_SIZE,
    )
  );
}

function ceiling(num: number, precision: number): number {
  return (((num / precision) | 0) + 1) * precision;
}


// 更新已到过期时间的容器
function updateContainerAtExpirationTime(
  element: ReactNodeList,
  container: OpaqueRoot,
  parentComponent: ?React$Component<any, any>,
  expirationTime: ExpirationTime,
  callback: ?Function,
) {
  // TODO: If this is a nested container, this won't be the root.
  const current = container.current;

  if (__DEV__) {
    if (ReactFiberInstrumentation.debugTool) {
      if (current.alternate === null) {
        ReactFiberInstrumentation.debugTool.onMountContainer(container);
      } else if (element === null) {
        ReactFiberInstrumentation.debugTool.onUnmountContainer(container);
      } else {
        ReactFiberInstrumentation.debugTool.onUpdateContainer(container);
      }
    }
  }

  const context = getContextForSubtree(parentComponent);
  if (container.context === null) {
    container.context = context;
  } else {
    container.pendingContext = context;
  }

  return scheduleRootUpdate(current, element, expirationTime, callback);
}

// 调度主事务更新， 返回到期时间
function scheduleRootUpdate(
  current: Fiber, // 当前完成的最小工作单位
  element: ReactNodeList, // 当前的完成最小工作单位完成新增或更新的 vitual dom 列表
  expirationTime: ExpirationTime, // fiber 的到期时间
  callback: ?Function,   // 完成的回调
) {
  if (__DEV__) {
    if (
      ReactDebugCurrentFiber.phase === 'render' &&
      ReactDebugCurrentFiber.current !== null &&
      !didWarnAboutNestedUpdates
    ) {
      didWarnAboutNestedUpdates = true;
      warning(
        false,
        'Render methods should be a pure function of props and state; ' +
          'triggering nested component updates from render is not allowed. ' +
          'If necessary, trigger nested updates in componentDidUpdate.\n\n' +
          'Check the render method of %s.',
        getComponentName(ReactDebugCurrentFiber.current) || 'Unknown',
      );
    }
  }

  const update = createUpdate(expirationTime); // 这里返回一个对象
  // Caution: React DevTools currently depends on this property
  // being called "element".
  update.payload = {element};

  callback = callback === undefined ? null : callback;
  if (callback !== null) {
    warning(
      typeof callback === 'function',
      'render(...): Expected the last optional `callback` argument to be a ' +
        'function. Instead received: %s.',
      callback,
    );
    update.callback = callback;
  }
  enqueueUpdate(current, update, expirationTime); // 三个参数，第一个是当前 fiber， 第二个是更新的集合，第三个是当前 fiber 到期时间

  scheduleWork(current, expirationTime); // 调度的工作，第一个参数是 当前 fiber， 第二个是到期时间，生命周期运行
  return expirationTime;
}

function createUpdate(expirationTime: ExpirationTime): Update<*> {
  return {
    expirationTime: expirationTime,

    tag: UpdateState,
    payload: null,
    callback: null,

    next: null,
    nextEffect: null,
  };
}

function enqueueUpdate<State>(
  fiber: Fiber,
  update: Update<State>,
  expirationTime: ExpirationTime,
) {
  // Update queues are created lazily.
  const alternate = fiber.alternate;
  let queue1;
  let queue2;
  if (alternate === null) {
    // There's only one fiber.
    queue1 = fiber.updateQueue;
    queue2 = null;
    if (queue1 === null) {
      queue1 = fiber.updateQueue = createUpdateQueue(fiber.memoizedState);
    }
  } else {
    // There are two owners.
    queue1 = fiber.updateQueue;
    queue2 = alternate.updateQueue;
    if (queue1 === null) {
      if (queue2 === null) {
        // Neither fiber has an update queue. Create new ones.
        queue1 = fiber.updateQueue = createUpdateQueue(fiber.memoizedState);
        queue2 = alternate.updateQueue = createUpdateQueue(
          alternate.memoizedState,
        );
      } else {
        // Only one fiber has an update queue. Clone to create a new one.
        queue1 = fiber.updateQueue = cloneUpdateQueue(queue2);
      }
    } else {
      if (queue2 === null) {
        // Only one fiber has an update queue. Clone to create a new one.
        queue2 = alternate.updateQueue = cloneUpdateQueue(queue1);
      } else {
        // Both owners have an update queue.
      }
    }
  }
  if (queue2 === null || queue1 === queue2) {
    // There's only a single queue.
    appendUpdateToQueue(queue1, update, expirationTime);
  } else {
    // There are two queues. We need to append the update to both queues,
    // while accounting for the persistent structure of the list — we don't
    // want the same update to be added multiple times.
    if (queue1.lastUpdate === null || queue2.lastUpdate === null) {
      // One of the queues is not empty. We must add the update to both queues.
      appendUpdateToQueue(queue1, update, expirationTime);
      appendUpdateToQueue(queue2, update, expirationTime);
    } else {
      // Both queues are non-empty. The last update is the same in both lists,
      // because of structural sharing. So, only append to one of the lists.
      appendUpdateToQueue(queue1, update, expirationTime);
      // But we still need to update the `lastUpdate` pointer of queue2.
      queue2.lastUpdate = update;
    }
  }

  if (__DEV__) {
    if (
      fiber.tag === ClassComponent &&
      (currentlyProcessingQueue === queue1 ||
        (queue2 !== null && currentlyProcessingQueue === queue2)) &&
      !didWarnUpdateInsideUpdate
    ) {
      warning(
        false,
        'An update (setState, replaceState, or forceUpdate) was scheduled ' +
          'from inside an update function. Update functions should be pure, ' +
          'with zero side-effects. Consider using componentDidUpdate or a ' +
          'callback.',
      );
      didWarnUpdateInsideUpdate = true;
    }
  }
}

function createUpdateQueue<State>(baseState: State): UpdateQueue<State> {
  const queue: UpdateQueue<State> = {
    expirationTime: NoWork,
    baseState,
    firstUpdate: null,
    lastUpdate: null,
    firstCapturedUpdate: null,
    lastCapturedUpdate: null,
    firstEffect: null,
    lastEffect: null,
    firstCapturedEffect: null,
    lastCapturedEffect: null,
  };
  return queue;
}

function cloneUpdateQueue<State>(
  currentQueue: UpdateQueue<State>,
): UpdateQueue<State> {
  const queue: UpdateQueue<State> = {
    expirationTime: currentQueue.expirationTime,
    baseState: currentQueue.baseState,
    firstUpdate: currentQueue.firstUpdate,
    lastUpdate: currentQueue.lastUpdate,

    // TODO: With resuming, if we bail out and resuse the child tree, we should
    // keep these effects.
    firstCapturedUpdate: null,
    lastCapturedUpdate: null,

    firstEffect: null,
    lastEffect: null,

    firstCapturedEffect: null,
    lastCapturedEffect: null,
  };
  return queue;
}

function appendUpdateToQueue<State>(
  queue: UpdateQueue<State>,
  update: Update<State>,
  expirationTime: ExpirationTime,
) {
  // Append the update to the end of the list.
  if (queue.lastUpdate === null) {
    // Queue is empty
    queue.firstUpdate = queue.lastUpdate = update;
  } else {
    queue.lastUpdate.next = update;
    queue.lastUpdate = update;
  }
  if (
    queue.expirationTime === NoWork ||
    queue.expirationTime > expirationTime
  ) {
    // The incoming update has the earliest expiration of any update in the
    // queue. Update the queue's expiration time.
    queue.expirationTime = expirationTime;
  }
}

// scheduleWork 包含的代码 是更新的逻辑，由于这里逻辑很多，另外一个js文件
// 组件运行逻辑,这里逻辑就是生命周期，这是一大块



