 这部分 ReactFiberReconciler 是核心
 先把 shared 里面的东西干掉，只看核心逻辑

 注意：源码里 有hostxxx字段的名称，一般都是指真实 dom 相关

 stack-reconciler 下的 react 是怎么工作的？

 代码中创建或更新一些元素，react 会根据这些元素创建或者更新 virtual dom，然后 react 根据更新前后的 virtual dom区别，去修改真正的 DOM。

 在 stack-reconciler dom 更新是同步的，也就是说，在 virtual dom 的对比过程中，发现一个 instance 有更新，会立即执行 dom 操作。

 fiber-reconciler 操作分很多小部分，并且可以被中断的，对于每一个节点来说，其不光存储了对应元素的基本信息，还要保存一些用于任务调度的信息。因此，fiber仅仅是一个对象，表征 reconciliation 阶段所能拆分的最小工作单元。

 通过 stateNode 属性管理 instance 自身的特性。

 通过 child sibling 表征当前工作单元的下一个工作单元，

 return 表示处理完成后返回结果所要合并的目标，通常指父节点。

 整个结构是一个链表树，每一个工作单元（fiber）执行完成后，都会查看是否还继续拥有主线程时间片段，如果有，继续下一个，如果没有则先处理其他高优先级事务，等主线程空闲下来再来继续执行。

低优先级任务由requestIdleCallback处理

requestIdleCallback方法提供deadline，即任务执行限制时间，以切分任务，避免长时间执行，阻塞UI渲染而导致掉帧
高优先级任务，如动画相关的由requestAnimationFrame处理

工作机制 work loop

可以让 react 在计算状态和等待状态之间进行切换，要达到这个目的，对于每一个 loop 需要追踪两个东西：

下一个工作单元（fiber） 当前还能占用主线程的时间， 第一个loop，下一个待处理单元为根节点。


# fiber
把更新分成 最小单位 fiber，然后把最小单位更新完的结果合并到 主进程 （hostRoot）中



