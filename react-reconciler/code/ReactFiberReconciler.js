/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactFiber';
import type {FiberRoot} from './ReactFiberRoot';
import type {
  Instance,
  TextInstance,
  Container,
  PublicInstance,
} from './ReactFiberHostConfig'; // 这里其实什么也没有，目测是为以后预留，正常编译会报错，但是 引用了 fbjs 包
import type {ReactNodeList} from 'shared/ReactTypes';
import type {ExpirationTime} from './ReactFiberExpirationTime';

import {
  findCurrentHostFiber,
  findCurrentHostFiberWithNoPortals,
} from 'react-reconciler/reflection';  // 这里其实是引用 ./ReactFiberTreeReflection 暂存将要被打断的事务。待高优先级事务完成后恢复
import * as ReactInstanceMap from 'shared/ReactInstanceMap';
import {HostComponent} from 'shared/ReactTypeOfWork';
import emptyObject from 'fbjs/lib/emptyObject';
import getComponentName from 'shared/getComponentName';
import invariant from 'fbjs/lib/invariant';
import warning from 'fbjs/lib/warning';

import {getPublicInstance} from './ReactFiberHostConfig'; // 这里其实什么也没有，正常编译会报错，但是 引用了 fbjs 包
import {
  findCurrentUnmaskedContext,
  isContextProvider,
  processChildContext,
} from './ReactFiberContext'; // 事务的上下文
import {createFiberRoot} from './ReactFiberRoot'; // 新建一个 事务根节点
import * as ReactFiberDevToolsHook from './ReactFiberDevToolsHook';
import {
  computeUniqueAsyncExpiration,
  recalculateCurrentTime,
  computeExpirationForFiber,
  scheduleWork,
  requestWork,
  flushRoot,
  batchedUpdates,
  unbatchedUpdates,
  flushSync,
  flushControlled,
  deferredUpdates,
  syncUpdates,
  interactiveUpdates,
  flushInteractiveUpdates,
} from './ReactFiberScheduler'; // 这里逻辑是重点
import {createUpdate, enqueueUpdate} from './ReactUpdateQueue'; // 更新器 和 更新队列
import ReactFiberInstrumentation from './ReactFiberInstrumentation'; // 这让我们可以连接到 fiber 来调试它在做什么
import ReactDebugCurrentFiber from './ReactDebugCurrentFiber';  // 作用 调试 fiber

type OpaqueRoot = FiberRoot;

// 0 is PROD, 1 is DEV.
// Might add PROFILE later.
type BundleType = 0 | 1;

type DevToolsConfig = {|
  bundleType: BundleType,
  version: string,
  rendererPackageName: string,
  // Note: this actually *does* depend on Fiber internal fields.
  // Used by "inspect clicked DOM element" in React DevTools.
  findFiberByHostInstance?: (instance: Instance | TextInstance) => Fiber,
  // Used by RN in-app inspector.
  // This API is unfortunately RN-specific.
  // TODO: Change it to accept Fiber instead and type it properly.
  getInspectorDataForViewTag?: (tag: number) => Object,
|};

let didWarnAboutNestedUpdates;

if (__DEV__) {
  didWarnAboutNestedUpdates = false;
}

// 获取子树节点的上下文
function getContextForSubtree(
  parentComponent: ?React$Component<any, any>,
): Object {
  if (!parentComponent) {
    return emptyObject;
  }

  const fiber = ReactInstanceMap.get(parentComponent); // 这里返回 parentComponent._reactInternalFiber;
  const parentContext = findCurrentUnmaskedContext(fiber);
  return isContextProvider(fiber)
    ? processChildContext(fiber, parentContext)
    : parentContext;
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

  scheduleWork(current, expirationTime); // 调度的工作，第一个参数是 当前 fiber， 第二个是到期时间
  return expirationTime;
}

// 更新已到过期时间的容器
export function updateContainerAtExpirationTime(
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

// 找到fiber 主节点的dom
function findHostInstance(component: Object): PublicInstance | null {
  const fiber = ReactInstanceMap.get(component);  // 这里返回 parentComponent._reactInternalFiber;
  if (fiber === undefined) {
    if (typeof component.render === 'function') {
      invariant(false, 'Unable to find node on an unmounted component.');
    } else {
      invariant(
        false,
        'Argument appears to not be a ReactComponent. Keys: %s',
        Object.keys(component),
      );
    }
  }
  // 找到当前 finber 的 改变的节点，
  // 当前工作单位的根节点，就是 dom 改变的最小父节点
  const hostFiber = findCurrentHostFiber(fiber);
  if (hostFiber === null) {
    return null;
  }
  return hostFiber.stateNode;
}

// 新建主事务的容器
export function createContainer(
  containerInfo: Container,
  isAsync: boolean,
  hydrate: boolean,
): OpaqueRoot {
  return createFiberRoot(containerInfo, isAsync, hydrate);
}

export function updateContainer(
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

export {
  flushRoot,
  requestWork,
  computeUniqueAsyncExpiration,
  batchedUpdates,
  unbatchedUpdates,
  deferredUpdates,
  syncUpdates,
  interactiveUpdates,
  flushInteractiveUpdates,
  flushControlled,
  flushSync,
};

export function getPublicRootInstance(
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

export {findHostInstance};

export function findHostInstanceWithNoPortals(
  fiber: Fiber,
): PublicInstance | null {
  const hostFiber = findCurrentHostFiberWithNoPortals(fiber);
  if (hostFiber === null) {
    return null;
  }
  return hostFiber.stateNode;
}

export function injectIntoDevTools(devToolsConfig: DevToolsConfig): boolean {
  const {findFiberByHostInstance} = devToolsConfig;
  return ReactFiberDevToolsHook.injectInternals({
    ...devToolsConfig,
    findHostInstanceByFiber(fiber: Fiber): Instance | TextInstance | null {
      const hostFiber = findCurrentHostFiber(fiber);
      if (hostFiber === null) {
        return null;
      }
      return hostFiber.stateNode;
    },
    findFiberByHostInstance(instance: Instance | TextInstance): Fiber | null {
      if (!findFiberByHostInstance) {
        // Might not be implemented by the renderer.
        return null;
      }
      return findFiberByHostInstance(instance);
    },
  });
}
