## ReactFiberScheduler.js 主要内容
这是 fiber 运行主要逻辑，45 个函数方法

#### 函数方法目录

resetStack                                重置事务的堆栈 

commitAllHostEffects                      提交所有事务完成的结果， 提交的各种内容 请查看 ReactFiberCommitWork.js

commitBeforeMutationLifecycles            触发生命周期前的 结果提交 主要逻辑请看 ReactFiberCommitWork.js

commitAllLifeCycles                       提交所有生命周期  主要细节逻辑请看 ReactFiberCommitWork.js

isAlreadyFailedLegacyErrorBoundary        判断是否更新失败的判断

markLegacyErrorBoundaryAsFailed          更新失败的标志的添加

commitRoot                               提交完成的根节点

resetExpirationTime                      重置到期时间

completeUnitOfWork                      完成工作节点，然后移动到下一个兄弟节点，如果没有，就返回父节点

performUnitOfWork                       执行当前工作单元

workLoop                                循环调用 performUnitOfWork

renderRoot                              渲染根节点

dispatch                                指派工作的方法

captureCommitPhaseError                 捕获提交阶段的错误信息 调用 dispatch 并返回其执行结果

computeAsyncExpiration                  计算异步过期时间  调用 computeExpirationBucket 方法

computeInteractiveExpiration            计算 同步更新过期时间 调用 computeExpirationBucket 方法计算时间

computeUniqueAsyncExpiration            计算异步更新过期时间 调用 computeAsyncExpiration

computeExpirationForFiber               计算工作单元的过期时间 调用 computeInteractiveExpiration， computeAsyncExpiration 方法

suspendRoot                             暂停，设置下一个匹配点超时

retrySuspendedRoot                      重新启动暂停的节点

scheduleWork                            事务工作的逻辑处理方法， 会更新每个节点的优先级，然后循环到root，以后的操作都从root开始遍历

recalculateCurrentTime                 重新计算时间

deferredUpdates                        延迟更新，传入一个函数参数，并执行这个函数

syncUpdates                            异步更新 传入一个函数参数，并执行这个函数

scheduleCallbackWithExpiration         到期的回调函数

requestRetry                           调用 requestWork

requestWork                            每当根目录收到更新时，同步执行performSyncWork，异步执行scheduleCallbackWithExpiration，  

addRootToSchedule                      将此根节点加入事务中

findHighestPriorityRoot                找到高优先级的根节点

performAsyncWork                       执行异步更新的工作单元 调用 performWork

performSyncWork                       执行同步更新的工作单元 调用 performWork 同步任务会直接调用performWorkOnRoot进行下一步，异步任务也会调performWorkOnRoot，
                                      但处理不太一样如果有上次遗留的任务，留到空闲时运行
performWork                           执行更新的方法

flushRoot                             更新并渲染根节点

finishRendering                       渲染完成的调用  flushRoot 和 performWork  里调用

performWorkOnRoot                     执行工作单元的节点 reconcilation阶段

completeRoot                         根节点完成的逻辑处理

shouldYield                          当处理异步的时候 判断是不是已经超时了

onUncaughtError                      未知错误提醒

onBlock                             阻塞提醒

batchedUpdates                      批量跟新 

unbatchedUpdates                    非批量更新

flushSync                           同一层级节点更行更新

interactiveUpdates                  相互关联的更新

flushInteractiveUpdates             完全齐平的相互关系的更新

flushControlled                     同一层级节点更新的控制








