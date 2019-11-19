## 方法简介

### ReactBatch

只有 `ReactRoot.prototype.createBatch` 调用 ReactBatch，而  ReactBatch diao yongdiaoyong

ReactBatch          定义一个批量处理构造器， 参数是一个函数， 默认是 ReactRoot 函数

ReactBatch.prototype.render  参数是子节点结合，更新容器，并返回 ReactWork 的实例

ReactBatch.prototype.then   参数是一个函数， 并把这个参数 push 进 ReactBatch 里的 this._callbacks 数组中

ReactBatch.prototype.commit  批量提交 把执行完成的节点刷新的 virtual dom 树中，并把下一个处理事务加到下一个更新队列中

ReactBatch.prototype._onComplete  批次处理完之后，执行回调 this._callbacks

### ReactWork

ReactWork       定义实际工作的构造函数，承担每一个具体的更新工作

ReactWork.prototype.then  参数是一个函数， 并把这个参数 push 进 ReactBatch 里的 this._callbacks 数组中

ReactWork.prototype._onCommit  提交之后的回调，里面逻辑就是 执行 this._callbacks 这个回调函数

### ReactRoot

ReactRoot   传入三个参数，第一个是 挂载dom 的容器；第二个是是否异步渲染，默认false；第三个是 hydrate 是否复用容器内和更新相同的节点，默认不复用

ReactRoot.prototype.render    两个参数，第一个是 子节点结合， 第二个是回调函数，每一个 work 的 this._callbacks，更新容器，并返回 ReactWork 的实例

ReactRoot.prototype.unmount   参数为一个回调函数 更新容器，并返回 ReactWork 的实例

ReactRoot.prototype.legacy_renderSubtreeIntoContainer 三个参数，parentComponent， children，callback 。更新容器，并返回 ReactWork 的实例

ReactRoot.prototype.createBatch  返回 ReactBatch 实例 


isValidContainer      参数以一个节点，判断这个节点是否是有效的节点

getReactRootElementInContainer     获取容器内的 dom 节点，

shouldHydrateDueToLegacyHeuristic    判断容器是否需要合并容器内的节点，当点用 ReactDOM.render 时候不会用到，ReactDOM.hydrate 才会用到

        注意：ReactDOM.render 是直接替换掉容器内的节点，ReactDOM.hydrate 是合并 容器内课复用的节点。

legacyCreateRootFromDOMContainer    删除容器内的所有节点，然后返回 ReactRoot 实例，作用就是在dom上创建一个指定的 dom 容器节点

legacyRenderSubtreeIntoContainer    返回根 dom 

createPortal  创建一个 Portal 类型组件，这种类型是直接挂载 body 上的


## ReactDOM             

定义 ReactDOM 对象，这是对外暴露的方法，也就是我们调用 react-dom 的方法 比如 `` ReactDOM.render(xxxx,xxx)``,对象内定义了一下方法

createPortal       portal 类型组件，弹框或提示框用到

findDOMNode        参数是真是dom 的元素或者元素实例，或者真实的 dom

hydrate            把新的dom 节点和原来容器内有的 dom 节点合并， 服务器端渲染可能会用到

render             和 hydrate 类似， 不同之处在于：render 是把容器内子节点清空后，在挂载进容器中

unmountComponentAtNode  卸载组件节点

flushSync   同步刷新，作用就是 提高某一个自组建的渲染 优先级


unstable_renderSubtreeIntoContainer  挂载节点，和 render， hydrate 类似的功能，不同之处是，其指定了父节点 试验性 api  可以不用关心

unstable_createPortal  创建 portal 组件，这个在后面版本将本移除 试验性 api  可以不用关心

unstable_batchedUpdates  试验性 api，批量合并更新，比如同时setState 同一个 state，默认是合并的，当在定时器内 setState 同一个 state 就不能合并了，所以调用此 方法可以达到合并

unstable_deferredUpdates 延迟更新 试验性 api  可以不用关心

unstable_interactiveUpdates  交互式更新，和事件有关系，都是试验性 api  可以不用关心

unstable_flushControlled      试验性 api  刷新控制方法

__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED   内部方法，里面是一些事件插件


## 调用 react-reconciler 的方法
```
// 主要方法 10 个
findHostInstanceWithNoPortals  // 待高优先级事务完成后继续的事务实例
computeUniqueAsyncExpiration   // 该方法返回过期时间
updateContainerAtExpirationTime   // 更新已到过期时间的容器
flushRoot    // 刷新根节点
createContainer  // 新建主事务的容器
updateContainer  // 更新容器 
getPublicRootInstance  // 返回根节点dom
unbatchedUpdates     // 单个更新
findHostInstance  // 找到主节点 dom
batchedUpdates    // 批量更新

// 次要方法 5个
deferredUpdates  // 延迟更新
interactiveUpdates // 交互式更新
flushSync  // 同步刷新，当我们想提高子组件渲染的优先级的时候，可以使用flushSync方法来包裹需要进行的操作
flushControlled  // 受控类 渲染优先级
injectIntoDevTools // 这个可以忽略，react 开发调试工具使用
```






