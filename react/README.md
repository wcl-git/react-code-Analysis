目录简介
forwardRef.js              转发 ref 逻辑
React.js                   主入口文件
ReactBaseClasses.js        Component PureComponent 代码结构默认值定义，不涉及复杂逻辑
ReactChildren.js           ReactChildren 的 forEach, map, count, toArray, only 方法
ReactContext.js            定义  createContext 代码结构默认定义  不涉及复杂逻辑     
ReactCreateRef.js          新建 ref 的逻辑
ReactCurrentOwer.js        组件运行机制的控制者，这里只是默认 fiber
ReactDebugCurrentFrame.js  开发环境的 debug提示，定义正在处理的组件的堆栈，并返回堆栈的附录
ReactElement.js            这里是 createElement createFactory cloneAndReplaceKey cloneElement isValidElement 这些api 的主要逻辑
ReactElementValidator.js  这里是开发环境 createElement createFactory cloneAndReplaceKey cloneElement isValidElement 这些api 的主要逻辑
ReactNoopUpdateQueue.js   这里是更新队列的代码逻辑定义


这里理解一下 16以后diff 
React 16 之前的调度算法被称为Stack Reconciler，即递归遍历所有的 Virtual DOM 节点，进行 Diff，一旦开始无法中断，要等整棵 Virtual DOM 树计算完成之后，才会释放主线程。而浏览器中的渲染引擎和js引擎是互斥的，Diff的过程中动画等周期性任务无法立即得到处理，就会出现卡顿即掉帧，影响用户体验。

React16 采用增量渲染(incremental rendering)也即异步渲染(async rendering)用来解决掉帧的问题，将渲染任务拆分成多个小任务，每次只做一个小任务，做完后就把时间控制权交还给主线程去执行优先级更高的任务(动画，交互等)，而不像之前长时间占用。