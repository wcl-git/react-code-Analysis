
# 难理解的就是下面这一部分代码
```
export default function forwardRef<Props, ElementType: React$ElementType>(
  render: (props: Props, ref: React$Ref<ElementType>) => React$Node, //  这个函数参数返回reactnode
) {.....
```
  forwardRef 方法 以一个函数为参数，且这个函数有两个形参，
  ``<Props, ElementType: React$ElementType>``  这个定义两个参数的类型

  ``render: (props: Props, ref: React$Ref<ElementType>) => React$Node,`` 这个是一个函数，默认返回 reactnode
```