/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from 'react-reconciler/src/ReactFiber';

import invariant from 'fbjs/lib/invariant';
import warning from 'fbjs/lib/warning';

import * as ReactInstanceMap from 'shared/ReactInstanceMap';
import {ReactCurrentOwner} from 'shared/ReactGlobalSharedState';
import getComponentName from 'shared/getComponentName';
import {
  ClassComponent,
  HostComponent,
  HostRoot,
  HostPortal,
  HostText,
} from 'shared/ReactTypeOfWork';
import {NoEffect, Placement} from 'shared/ReactTypeOfSideEffect';

const MOUNTING = 1; // 挂在中
const MOUNTED = 2;  // 已挂载
const UNMOUNTED = 3; // 已卸载

// 判断是挂载的最小工作单位
function isFiberMountedImpl(fiber: Fiber): number {
  let node = fiber;
  if (!fiber.alternate) {
    // 如果没有替代项，则可能是未插入的新树 但是，如果是，则对其具有挂起的插入效果
    if ((node.effectTag & Placement) !== NoEffect) {
      return MOUNTING;
    }
    while (node.return) {
      node = node.return;
      if ((node.effectTag & Placement) !== NoEffect) {
        return MOUNTING;
      }
    }
  } else {
    while (node.return) {
      node = node.return;
    }
  }
  if (node.tag === HostRoot) {
    // TODO: Check if this was a nested HostRoot when used with
    // renderContainerIntoSubtree.
    return MOUNTED;
  }
  // 如果我们没有命中根，那意味着我们处于一个断开连接的树中
  // 已卸载
  return UNMOUNTED;
}

// 判断 fiber 是不是已经挂载
export function isFiberMounted(fiber: Fiber): boolean {
  return isFiberMountedImpl(fiber) === MOUNTED; // 返回每一个 fiber 是不是已经挂载的模版
}

// 是否挂载
export function isMounted(component: React$Component<any, any>): boolean {
  if (__DEV__) {
    const owner = (ReactCurrentOwner.current: any);
    if (owner !== null && owner.tag === ClassComponent) {
      const ownerFiber: Fiber = owner;
      const instance = ownerFiber.stateNode;
      warning(
        instance._warnedAboutRefsInRender,
        '%s is accessing isMounted inside its render() function. ' +
          'render() should be a pure function of props and state. It should ' +
          'never access something that requires stale data from the previous ' +
          'render, such as refs. Move this logic to componentDidMount and ' +
          'componentDidUpdate instead.',
        getComponentName(ownerFiber) || 'A component',
      );
      instance._warnedAboutRefsInRender = true;
    }
  }

  const fiber: ?Fiber = ReactInstanceMap.get(component);
  if (!fiber) {
    return false;
  }
  return isFiberMountedImpl(fiber) === MOUNTED;
}

// 判断插入的节点是不是已经挂载的组件上
function assertIsMounted(fiber) {
  invariant(
    isFiberMountedImpl(fiber) === MOUNTED,
    'Unable to find node on an unmounted component.', //在未安装的组件上找不到节点
  );
}


export function findCurrentFiberUsingSlowPath(fiber: Fiber): Fiber | null {
  let alternate = fiber.alternate; 

  if (!alternate) {
    const state = isFiberMountedImpl(fiber);
    invariant(
      state !== UNMOUNTED,
      'Unable to find node on an unmounted component.',
    );
    if (state === MOUNTING) {
      return null;
    }
    return fiber;
  }

  let a = fiber;
  let b = alternate;
  while (true) { // 循环查找
    let parentA = a.return; // a.return 表示父节点
    let parentB = parentA ? parentA.alternate : null;
    if (!parentA || !parentB) {
      // We're at the root.
      break;
    }
    
    if (parentA.child === parentB.child) {
      let child = parentA.child; 
      while (child) {
        if (child === a) { 
          assertIsMounted(parentA);
          return fiber;
        }
        if (child === b) { 
          assertIsMounted(parentA);
          return alternate;
        }
        child = child.sibling;
      }
      // We should never have an alternate for any mounting node. So the only
      // way this could possibly happen is if this was unmounted, if at all.
      invariant(false, 'Unable to find node on an unmounted component.');
    }

    if (a.return !== b.return) {
      
      a = parentA;
      b = parentB;
    } else {
      
      let didFindChild = false;
      let child = parentA.child;
      while (child) {
        if (child === a) {
          didFindChild = true;
          a = parentA;
          b = parentB;
          break;
        }
        if (child === b) {
          didFindChild = true;
          b = parentA;
          a = parentB;
          break;
        }
        child = child.sibling;
      }
      
      if (!didFindChild) {
        child = parentB.child;
        while (child) {
          if (child === a) {
            didFindChild = true;
            a = parentB;
            b = parentA;
            break;
          }
          if (child === b) {
            didFindChild = true;
            b = parentB;
            a = parentA;
            break;
          }
          child = child.sibling;
        }
        invariant(
          didFindChild,
          'Child was not found in either parent set. This indicates a bug ' +
            'in React related to the return pointer. Please file an issue.',
        );
      }
    }

    invariant(
      a.alternate === b,
      "Return fibers should always be each others' alternates. " +
        'This error is likely caused by a bug in React. Please file an issue.',
    );
  }
  // If the root is not a host container, we're in a disconnected tree. I.e.
  // unmounted.
  invariant(
    a.tag === HostRoot,
    'Unable to find node on an unmounted component.',
  );
  if (a.stateNode.current === a) { // stateNode ： fiber的 状态节点
    return fiber;
  }
  return alternate;
}

export function findCurrentHostFiber(parent: Fiber): Fiber | null {
  
  const currentParent = findCurrentFiberUsingSlowPath(parent); 
  if (!currentParent) {
    return null;
  }

  let node: Fiber = currentParent;
  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) { // HostComponent 5， HostText 6， html元素或者文本
      return node;
    } else if (node.child) { 
      node.child.return = node;
      node = node.child;
      continue;
    }
    
    if (node === currentParent) {
      return null;
    }
    while (!node.sibling) {
      if (!node.return || node.return === currentParent) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  // Flow needs the return null here, but ESLint complains about it.
  // eslint-disable-next-line no-unreachable
  // 这里的返回只是解决 flow 的语法问题，其实没有任何意义
  return null;
}
// 记忆 当前 NoPortals 事务，待高优先级事务完成后继续的事务
export function findCurrentHostFiberWithNoPortals(parent: Fiber): Fiber | null {
  const currentParent = findCurrentFiberUsingSlowPath(parent);
  if (!currentParent) {
    return null;
  }

  // Next we'll drill down this component to find the first HostComponent/Text.
  let node: Fiber = currentParent;
  while (true) {
    if (node.tag === HostComponent || node.tag === HostText) {
      return node;
    } else if (node.child && node.tag !== HostPortal) {
      node.child.return = node;
      node = node.child;
      continue;
    }
    if (node === currentParent) {
      return null;
    }
    while (!node.sibling) {
      if (!node.return || node.return === currentParent) {
        return null;
      }
      node = node.return;
    }
    node.sibling.return = node.return;
    node = node.sibling;
  }
  // Flow needs the return null here, but ESLint complains about it.
  // eslint-disable-next-line no-unreachable
  return null;
}
