/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {Fiber} from './ReactFiber';
import type {ExpirationTime} from './ReactFiberExpirationTime';

import {createHostRootFiber} from './ReactFiber';
import {NoWork} from './ReactFiberExpirationTime';

// TODO: This should be lifted into the renderer.
export type Batch = {
  _defer: boolean,
  _expirationTime: ExpirationTime,
  _onComplete: () => mixed,
  _next: Batch | null,
};

// 类型定义
export type FiberRoot = {
  // Any additional information from the host associated with this root.
  containerInfo: any,
  // Used only by persistent updates.
  pendingChildren: any,
  // The currently active root fiber. This is the mutable root of the tree.
  current: Fiber,

  // The following priority levels are used to distinguish between 1)
  // uncommitted work, 2) uncommitted work that is suspended, and 3) uncommitted
  // work that may be unsuspended. We choose not to track each individual
  // pending level, trading granularity for performance.
  //
  // The earliest and latest priority levels that are suspended from committing.
  earliestSuspendedTime: ExpirationTime,
  latestSuspendedTime: ExpirationTime,
  // The earliest and latest priority levels that are not known to be suspended.
  earliestPendingTime: ExpirationTime,
  latestPendingTime: ExpirationTime,
  // The latest priority level that was pinged by a resolved promise and can
  // be retried.
  latestPingedTime: ExpirationTime,

  pendingCommitExpirationTime: ExpirationTime,
  // A finished work-in-progress HostRoot that's ready to be committed.
  // TODO: The reason this is separate from isReadyForCommit is because the
  // FiberRoot concept will likely be lifted out of the reconciler and into
  // the renderer.
  finishedWork: Fiber | null,
  // Top context object, used by renderSubtreeIntoContainer
  context: Object | null,
  pendingContext: Object | null,
  // Determines if we should attempt to hydrate on the initial mount
  +hydrate: boolean,
  // Remaining expiration time on this root.
  // TODO: Lift this into the renderer
  remainingExpirationTime: ExpirationTime,
  // List of top-level batches. This list indicates whether a commit should be
  // deferred. Also contains completion callbacks.
  // TODO: Lift this into the renderer
  firstBatch: Batch | null,
  // Linked-list of roots
  nextScheduledRoot: FiberRoot | null,
};

export function createFiberRoot(
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
