# react-code-Analysis
react 源码分析

 ## 我们写react 项目时候，流程大体是这样的

 ### 写一个 react 组件 App.js
 ```
 import React, {Component} from 'react';
 export default class App extends Component {
   ... xxxx
   render() {
     <div> xxxxxxx</div>
   }
 }
 ```
### 把组件放到真是dom上

```
import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';

ReactDOM.render(<App />, document.getElementById('root'));
```

之后就在对应的 html 里面看到内容了


主要关注 react react-reconciler react-dom 这三个文件夹


react 是生成 虚拟dom 对象。
react-dom 是吧 虚拟dom 对象变成真是dom
其中的各种更新的生命周期函数逻辑呢，生命周期运行机制呢。
查看源码，发现是 单独一个 react-reconciler模块解决这些问题
在 react-dom 里引用 react-reconciler 。
所以 react 源码中的 packages 下面的 react 是纯粹生成 virtual dom 对象。

react-dom 和 react-reconciler 紧密关联的。

## 项目分析范围
 
 主要分析 react 从生成 虚拟dom 到 真实 dom 过程，react 虚拟dom 的更新 及对应更新 dom，这个主要逻辑

 要了解上 主要逻辑，只需关心几个文件夹代码，  react、 react-dom、 react-reconciler、react-scheduler

 react ： react元素、组件等对象生成即定义

 react-dom： 以 react 生成的对象作为参数，实现 挂载更新dom，

 react-reconciler： 是 react-dom 挂载更新等主逻辑， 这里是重点

 事件放在后期完善



