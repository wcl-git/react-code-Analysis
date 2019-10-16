## ReactFiber.js 主要内容

1、Fiber                                 最小工作单元 fiber 对象的数据结构

2、FiberNode                             最小工作单元 fiber 对象构造器

3、createFiber                           新建一个 fiber，返回  FiberNode 构造器定义的对象

4、shouldConstruct                       判断是否是 reactcomponent 构造器的实例

5、createWorkInProgress                  创建一个更新过程中的的 fiber 的存储器  调用 createFiber 方法，并返回 workInProgress 对象

6、createHostRootFiber                   新建一个主线程 fiber

7、createFiberFromElement                新建一个 element 的工作单元

8、getFiberTagFromObjectType             获取 fibertag 对象

9、createFiberFromFragment               新建一个 Fragment 工作单元

10、createFiberFromProfiler              新建分析工具的工作单元，一般以唯一 id 为标志，如果不唯一，会报错

11、createFiberFromText                  新建一个 工具单元的内容 text

12、createFiberFromHostInstanceForDeletion  新建删除主进程实例的方法

13、createFiberFromPortal                创建 Portal 类型组件的最小工作单元

14、assignFiberPropertiesInDEV           用于保存WIP属性，为开发人员重播失败的工作信息





