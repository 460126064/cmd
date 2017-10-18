# cmd通过SEAJS了解CMD规范运行机制
* > 先补一张流程图，简版cmd代码已提交
> * ![cmd](https://github.com/460126064/cmd/blob/master/%E9%A1%B9%E7%9B%AE%E6%B5%81%E7%A8%8B.png)
# 如何保证模块依赖数
> * 如果模块有依赖，则该模块在依赖数中始终存在
``` javascript
      神奇之处就是 += count -1，初始化的依赖就是1，所以每次-1都能保证当前模块下最新的依赖总数，保证每个子模块都能在remain中记录，直到模块加载完成
      entry.remain += count - 1
      主模块对象移除，每个子模块都会将主模块对象传递下去
      mod._entry.shift()
```
> * 如果该模块没有依赖，则直接依赖数减1，其他依赖继续深入执行
``` javascript
     if (mod._entry.length) {
         mod.onload()
          return
      }
```
