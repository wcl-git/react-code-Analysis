
# ReactElement.js  源码结构
这里当时用了 16.10 的代码。不过和 16.4 差不多，这里就没有修改了，原理一样

 7个 api ,  4 个解决异常提示信息的内部方法， 1 个生成 reactelement 对象的方法，

### 对外暴露的api 有：

```
jsxDEV  
jsx 
createElement
createFactory
cloneAndReplaceKey
cloneElement
isValidElement
```
jsxDEV 和 jsx 区分开发环境和生产环境，返回 ReactElement 对象，是内部使用 api ，react 的 api 文档中不暴露，用于框架构建稳定使用，16.4 以后版本才有的方法
createElement 是对两个环境都做了处理，对外暴露的 api。

所以  createElement、 jsxDEV、 jsx 三者类似，但是我们只用 createElement 就是这个原因

cloneAndReplaceKey 是修改元素的 key 值，其他属性保持一至，其实这个 api 可以完全被 cloneElement 替代。所以， 这个api 一般知识 react 内部使用。
cloneElement  克隆元素对象，并返回新元素对象。
isValidElement 判断是否是 react elenment

### 内部方法

ReactElement 方法， 用于返回 reactelement  对象， 暴露的所有 api 最后调用的方法

hasValidRef   这个函数是判断 ref 是否有效，返回 true false, 区分开发环境和生产环境 ，config 是监测的对象

hasValidKey   这个函数是判断 react 组件 key 是否有效，返回 true false, 区分开发环境和生产环境

defineKeyPropWarningGetter    定义了不合法的 key 抛出警告的提示信息， 开发环境才会抛出警告

defineRefPropWarningGetter    定义了不合法的 ref 抛出警告的提示信息 开发环境才会抛出警告

# ReactElement 用到的js基础知识

Object.defineProperty(obj, prop, desc);

obj 需要定义属性的当前对象
prop 当前需要定义的属性名
desc 属性描述符

一般通过为对象属性复制的情况，对象属性可以修改，可以删除，但是通过 Objec.defineProperty()定义的属性，通过第三个参数描述的设置进行更精确的控制。

Object.getOwnPropertyDescriptor(obj, prop);

obj 需要查找的目标对象
prop 目标对象内属性名称

方法返回指定对象上一个自有属性对应的属性描述

Object.prototype.hasOwnProperty(); 方法会返回一个布尔值，指示对象自身属性中是否具有指定的属性（也就是，是否有指定的键）


bind()方法创建一个新的函数，在bind()被调用时，这个新函数的this被bind的第一个参数指定，其余的参数将作为新函数的参数供调用时使用
bind 可以预设一些参数，别的参数可以调用时再传

比如
```
function list() {
  return Array.prototype.slice.call(arguments);
}

function addArguments(arg1, arg2) {
    return arg1 + arg2
}

var list1 = list(1, 2, 3); // [1, 2, 3]

var result1 = addArguments(1, 2); // 3

// 创建一个函数，它拥有预设参数列表。
var leadingThirtysevenList = list.bind(null, 37);

// 创建一个函数，它拥有预设的第一个参数
var addThirtySeven = addArguments.bind(null, 37); 

var list2 = leadingThirtysevenList(); 
// [37]

var list3 = leadingThirtysevenList(1, 2, 3); 
// [37, 1, 2, 3]

var result2 = addThirtySeven(5); 
// 37 + 5 = 42 

var result3 = addThirtySeven(5, 10);
// 37 + 5 = 42 ，第二个参数被忽略
```