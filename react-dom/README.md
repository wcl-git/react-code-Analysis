## react-dom 简介

``./code/client/ReactDOM.js`` 是对外暴露的文件，

这里面的方法和 reacr-reconciler 紧密联系，所以最好按 reactdom 的 api 来解释源码
注意：reactElement 转变成真是dom 是由 babel ，如：transform-react-jsx 转换成真是dom的。所以我们只需要返回 reactelement 对象就可以