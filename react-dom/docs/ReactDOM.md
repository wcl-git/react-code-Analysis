## 内容导读

首先，先从导出的地方看，只导出 ReactDOM 这个对象，好了，我们来关注 ReactDOM 这个对象
对象里面有： createPortal， findDOMNode，hydrate， render， unmountComponentAtNode， flushSync 等。其中，unstable_ 开头的这些 api 不用关心，未来会遗弃的。
api 功能：

createPortal：一般是类似雨弹框这样的，在body 上挂载一个节点

findDOMNode ：获取挂载组件的真实 dom。和 ref 类似
hydrate， render： 都是 把节点挂载到某一个根节点的方法，hydrate，一般用于服务器端，render 我们比较常用，区别：hydrate 挂载到某一个节点时候，该节点可能还有别的节点，hydrate 是可以不删除已有的节点，而是追加的方式挂载，而 render 是把节点内的已有节点全部干掉，换成自己的节点。

unmountComponentAtNode：从DOM中删除已安装(mounted) React 组件，并清除其 event handle 和 state，这个很少用，就不着为重点讲
这个方法是在 componentWillUnmount 之前调用。

flushSync ： 同步刷新，作用就是 提高某一个自组建的渲染 优先级，啥意思呢？ 就是可以用这个方法优先处理某一个组件（一般是子组件）的渲染。这个用的少，了解一下就行

##### 当然，要往下看代码分析，首先你得弄明白 ReactElement 得数据结构，fiber 得数据结构。看每一个 api 源码得时候，先弄明白 api 得用法。




### 1、我们来看看 createPortal 干了什么事
```
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
```
createPortal 三个参数 子节点列表，根节点，key，调用 ReactPortal.createPortal方法，返回节点对象
```ReactPortal.createPortal
function createPortal(
  children: ReactNodeList,
  containerInfo: any,
  // TODO: figure out the API for cross-renderer implementation.
  implementation: any,
  key: ?string = null,
): ReactPortal {
  return {
    // This tag allow us to uniquely identify this as a React Portal
    $$typeof: REACT_PORTAL_TYPE,
    key: key == null ? null : '' + key,
    children,
    containerInfo,
    implementation,
  };
}
```
so, createPortal 就是干了创建一个 React 元素对象，起始 react 元素就是一个对象，他会被 Babel 解析

### 2、findDOMNode 干了什么事
#### 首先我们要直到 findDOMNode 的功能，知道功能之后才好理解源代码逻辑

如果组件已经被挂载到 DOM 上，此方法会返回浏览器中相应的原生 DOM 元素。此方法对于从 DOM 中读取值很有用，例如获取表单字段的值或者执行 DOM 检测（performing DOM measurements）。大多数情况下，你可以绑定一个 ref 到 DOM 节点上，可以完全避免使用 findDOMNode。

当组件渲染的内容为 null 或 false 时，findDOMNode 也会返回 null。当组件渲染的是字符串时，findDOMNode 返回的是字符串对应的 DOM 节点。从 React 16 开始，组件可能会返回有多个子节点的 fragment，在这种情况下，findDOMNode 会返回第一个非空子节点对应的 DOM 节点。

先把 ``if (__DEV__) {...}`` 这里的代码忽略掉，这是为开发调试能看到一些警告用的，先不关心。下面代码我把 _DEV_下的代码干掉了

```
// 获取真实DOM
  findDOMNode(
    componentOrElement: Element | ?React$Component<any, any>,
  ): null | Element | Text {
    if (componentOrElement == null) {
      return null;
    }
    if ((componentOrElement: any).nodeType === ELEMENT_NODE) {
      return (componentOrElement: any);
    }

    return DOMRenderer.findHostInstance(componentOrElement); // 找到 fiber 主节点的dom
  },
```
看见这个代码 一堆 `` <> |`` 干啥的，这个只是 flow 的定义变量的数据类型，如果想了解，可以去看看 flow。 

findDOMNode 是获取真实DOM的 api， 传入一个参数，可以是 组件或者元素 null 文字等。
如果参数为null 什么也不用做

如果传入的节点类型 是 元素节点，则返回 这个元素节点，这里 ``ELEMENT_NODE ``是什么，看看代码出处就很清晰了
```
export const ELEMENT_NODE = 1;  // 元素节点
export const TEXT_NODE = 3;     // 文字节点
export const COMMENT_NODE = 8;  // 注释节点
export const DOCUMENT_NODE = 9; // document 节点
export const DOCUMENT_FRAGMENT_NODE = 11; // fragment 节点
```
上面都不满足就返回 DOMRenderer.findHostInstance, 这个方法做了什么事呢？看看下面代码

```
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
  // 找到当前 finber 对应的 dom 节点
  const hostFiber = findCurrentHostFiber(fiber);
  if (hostFiber === null) {
    return null;
  }
  return hostFiber.stateNode;
}
```
##### 一点一点分析
参数是 findDOMNode 传进来的 组件或元素，这里叫 component

定义一个 fiber 并把  component._reactInternalFiber 赋值给他，这里叫赋值不准确，应该叫指针指向，但是便于描述，就这样吧
```ReactInstanceMap.get(component);
 function get(key) {
  return key._reactInternalFiber;
}
```
``_reactInternalFiber``是啥？把它理解成每一个组件都有对应大 fiber 的实例，fiber那一部分会讲

如果 fiber 不存在，则根据各种条件抛出对应的警告或错误提示。
如果存在，则 定义一个 hostFiber 用来存储 component 对应dom 节点

#### fiber 是什么
在reconciliation期间，会执行其他活动包括调用生命周期方法或更新引用等，所有这些活动在fiber架构中统称为“work”，来自render方法返回的每个React元素的数据被合并到fiber node树中，每个React元素都有一个相应的fiber node。与React元素不同，每次渲染过程，不会再重新创建fiber。这些可变的数据包含组件state和DOM。 我们之前讨论过，根据React元素的类型，框架需要执行不同的活动。在我们的示例应用程序中，对于class组件ClickCounter，它调用生命周期方法和render方法，而对于span Host 组件（DOM节点），它执行DOM更新。
##### 因此，每个React元素都会转换为相应类型的Fiber节点，用于描述需要完成的工作。

##### 可以这样认为：fiber作为一种数据结构，用于代表某些worker，换句话说，就是一个work单元，通过Fiber的架构，提供了一种跟踪，调度，暂停和中止工作的便捷方式。
当React元素第一次转换为fiber节点时，React使用createElement返回的数据来创建fiber，这些代码在 ReactFiber.js 里面中，可以去了解。在随后的更新中，React重用fiber节点，并使用来自相应React元素的数据来更新必要的属性。如果不再从render方法返回相应的React元素，React可能还需要根据key来移动层次结构中的节点或删除它。


```findCurrentHostFiber(fiber);
// 这个函数作用是获取dom节点,找到 html元素或者文本就返回目标
export function findCurrentHostFiber(parent: Fiber): Fiber | null {
  const currentParent = findCurrentFiberUsingSlowPath(parent); 
  if (!currentParent) {
    return null;
  }

  let node: Fiber = currentParent;
  while (true) {
    // HostComponent 5， HostText 6， react 内部的工作类型  HostComponent 是真实dom， 比入 div、span 等，HostText 是文本
    // 说白了，就是只要找到 html元素 或者 文本就会返回当前dom
    // 下面是各种情况的判断
    if (node.tag === HostComponent || node.tag === HostText) { 
      return node;
    } else if (node.child) { // 节点有第一个子节点，赋值继续循环
      node.child.return = node;
      node = node.child;
      continue;
    }
    // 第一次循环没有走上面两个条件，即没有子节点，且子节点的 tag 优先级 不是 6 或 5
    // 即 往下查找在往上查找，直到 currentParent，还没找到，就返回 null 
    // 这种情况发生在 组件 render 里面返回 null，
    if (node === currentParent) {
      return null;
    }
    // 如果当前节点没有兄弟节点，向上找父级
    while (!node.sibling) {
      // 父节点不存在或者已经遍历到 currentParent 就停止
      if (!node.return || node.return === currentParent) {
        return null;
      }
      node = node.return;
    }
    // 如果有兄弟节点。继续向下遍历
    node.sibling.return = node.return;
    node = node.sibling;
  }
  // 这里的返回只是解决 flow 的语法问题，其实没有任何意义
  return null;
}
```
我们发现，findCurrentHostFiber 先调用 findCurrentFiberUsingSlowPath 方法来获取要找的当前节点的父节点，找父节点逻辑后面分析，这里往下看，

如果 ``currentParent`` 不存在，则说明组件没有没有挂载，就返回

如果找到了 ``currentParent``，定义一个变量 node 存储 ``currentParent``，深度遍历 node，

如果 node.tag 的类型是 html 的标签如：div span 等， 或者是文本，直接返回 node。

如果不是上面，且第一个子节点存在，则把 node 赋值给第一个子节点的 return，再把第一个子节点作为下一次要循环的节点，一直往下遍历，直到节点没有子节点，

如果还是没找到 html 标签 或 文本，再以当前节点的兄弟节点开始，往下遍历，如果当前没有兄弟节点，就往父级找，直到找到再往下遍历其子节点。

从上面逻辑可以看出，findDOMNode 有一个隐形小问题，就是当组件 用 多个 ``Fragment``包裹，第一个子节点是 ``div`` findDOMNode 找到的就是第一个子节点的 div，这里要小心了啊，有点小坑。

##### 接下来，我们分析一下 findCurrentFiberUsingSlowPath 这个方法,看代码注释

##### alternate 是什么
在第一次渲染之后，React最终得到一个fiber tree，它反映了用于渲染UI的应用程序的状态。这棵树通常被称为current tree。当React开始处理更新时，它会构建一个所谓的workInProgress tree，它反映了要刷新到屏幕的未来状态。
所有work都在workInProgress tree中的fiber上执行。当React遍历current tree时，对于每个现有fiber节点，它会使用render方法返回的React元素中的数据创建一个备用(alternate)fiber节点，这些节点用于构成workInProgress tree(备用tree)。处理完更新并完成所有相关工作后，React将备用tree刷新到屏幕。一旦这个workInProgress tree在屏幕上呈现，它就会变成current tree。
```
function findCurrentFiberUsingSlowPath(fiber: Fiber): Fiber | null {
  let alternate = fiber.alternate; 
  // 如果 fiber 的 alternate 属性的不存在，表示 fiber 是已经更新完毕的节点，
  // 只需要检查它是否已安装，如果已挂载就返回 fiber，
  if (!alternate) {
    // 如果没有备用的，那么我们只需要检查它是否已安装
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
  // 如过 alternate 存在，说明 fiber 未来有更新，我们应该在未来要更新的树中找，即  alternate 中找
  let a = fiber;
  let b = alternate;
  while (true) { // 循环查找
    let parentA = a.return; // a.return 存储当前 fiber 父级
    let parentB = parentA ? parentA.alternate : null; // 没有父级就说明自己就是根节点
    // 如果 循环的当前 fiber 即没有父节点，也没有节点备份，退出循环
    // 这种情况就是向下遍历完在向上遍历，直到根节点还是没有找到，就不用循环再找了，防止死循环
    if (!parentA || !parentB) {
      // We're at the root.
      break;
    }
    
    // 完成返回的 子节点和 备份的子节点一致，即这个子节点没有要更新的内容
    if (parentA.child === parentB.child) {
      let child = parentA.child; // child 起始从 a 中开始
      while (child) {
        if (child === a) { // 如果如果在子节点中找到 a ，a 是暂存的 fiber ，表示 fiber 就是最新父级了，返回 fiber 就好
          assertIsMounted(parentA);// 这里如果不是i 已经挂载的 则回抛出警告
          return fiber;
        }
        if (child === b) { // 如果如果在子节点中找到 b ，b 是暂存的 alternate ，表示 alternate 就是最新父级了，返回 alternate 就好。
          assertIsMounted(parentA);
          return alternate;
        }
        // 如果没找到，继续遍历 兄弟节点，走上面的逻辑
        child = child.sibling;
      }
      
      // 我们应该不会出现 正在挂载中的节点的 alternate，唯一可能发生在 当前节点 被卸载了 
      invariant(false, 'Unable to find node on an unmounted component.');
    }

    // 如果 当前 fiber 和 未来 alternate 父级不一致，即 父级发生改变了，
    if (a.return !== b.return) {
      // a.return 和 b.return 的指向不同的节点，假定两者没有交叉
      // 所以把 a 赋值给 a.return， 把 b 赋值给 parentA.alternate，即沿父级往上找
      // 进入下一轮循环
      a = parentA;
      b = parentB;
    } else {
      // a.return 和 b.return 的指向相同的节点，我们就必须使用这个节点
      // 遍历每一个  parent alternate 的子集，查找那个子节点属于哪一个集合
      let didFindChild = false;
      let child = parentA.child;
      // 遍历 当前 fiber 父级的所有一级子节点
      while (child) {
        if (child === a) { // 如果在子节点中找到 a ，a 就指向fiber 的父级
          didFindChild = true;
          a = parentA; // a 就指向fiber 的父级
          b = parentB; // b 就指向fiber 的父级 的 alternate 
          break;
        }
        if (child === b) { // 如果在子节点中没有找到 a ，找到了 b ，则 b 就指向fiber 的父级
          didFindChild = true;
          b = parentA; // b 就指向fiber 的父级
          a = parentB; // a 就指向fiber 的父级 的 alternate
          break;
        }
        child = child.sibling;
      }
      
      // fiber 找不到就继续遍历 alternate
      if (!didFindChild) {
        // 搜索父B的子集合
        child = parentB.child;
        // 遍历 alternate 
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
  
  invariant(
    a.tag === HostRoot,
    'Unable to find node on an unmounted component.',
  );
  if (a.stateNode.current === a) { // stateNode ： 保存对组件的类实例，DOM节点或与fiber节点关联的其他React元素类型的引用。一般来说，可以认为这个属性用于保存与fiber相关的本地状态。
    // 我们已经确定 a 是当前的分支
    return fiber;
  }
  // 否则 b 是当前的分支
  return alternate;
}
```
##### 看了 findCurrentFiberUsingSlowPath 代码逻辑，是不是一头雾水，这么多判断，结果只有为了确定 findDOMNode 拿到的 dom 是最新的dom，因为获取dom时候有可能这段dom 在做完最高优先级事务之后就会会更新 dom ，因为 fiber 更新是可以被打断的。so，上面就是一堆判断，就是为了确定拿到的父级在最新挂载的 dom tree 上。

### 3、hydrate， render 干了是了事
##### 这两个方法是核心中得核心，hydrate 和 render 区别不大，我们先分析 render，hydrate 对应一些不同就明白了，由于这里会牵涉到react 生命周期，篇幅太大，我们这里讲到 scheduleWork 安排工作这个函数，至于怎么安排的，之后得会在生命周期得地方细细到来，牵涉得代码估计有五六百行，做好心理准备。



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
findHostInstanceWithNoPortals  // 找到不是 portals 组件的 dom
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






