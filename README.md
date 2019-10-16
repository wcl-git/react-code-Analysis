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
 


