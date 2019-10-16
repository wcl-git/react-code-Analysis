## react 主出口文件

这里主要是生成 reactelement 对象，react 的运行机制 在 react-reconciler 中。

首先看一下主文件，shared/ReactVersion， shared/ReactSymbols  定义一些唯一变量类型 暂时不用关心，无非就是一些固定的类型定义而已

其二是 ReactBaseClasses， react 的类组件，常用 Component, PureComponent 两种

其三 ReactChildren 组件的 children 的一些方法

其四  ref 的创建 转发 ， createRef， forwardRef，

其五  开发模式和生产模式的  react 元素的 创建，克隆，等


其六 组件上下文的创建， ReactContext 这个单独列出来 

其七 一些全局配置及环境配置，懒加载之类的


首先我从 创建 reactElement 开始阅读， why ？

当你看源码时候，你会发现 ，react 类组件哪里没几行代码，看不出个所以然，在看看 children 发现，它引用 reactElement，
所以，了解 react 先从创建元素开始。
