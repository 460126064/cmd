((global) => {
    const servers = {
        //模块状态                
        STATUS : {
          FETCHING : 1,
          SAVE : 2,
          LOADING : 3,
          LOADED : 4,
          EXECUTING : 5,
          EXECUTED : 6
        },          
        //缓存模块
        cacheModule : {},
        //主键Id不重复
        cid : 0,
        //转换模块路径
        dirname() {
             return location.href.match(/[^?#]*\//)[0];
        },
        //获取指定模块
        get(uri,deps) {
           return servers.cacheModule[uri] || (servers.cacheModule[uri] = new Module(uri,deps));
        },
        //save保存数据
        save(uri,data) {
            //绝对路径转换
            if(uri.indexOf('/') === 0) {
              uri = servers.dirname() + uri.slice(1);  
            //相对路径转换
            }else if(uri.indexOf('./') === 0) {
              uri = servers.dirname() + uri.replace(/\.\//,'');
            //无路径符号
            }else {
                uri = servers.dirname() + item;
            }            
            let mod = servers.get(uri);
            //更改状态
            if(mod.STATUS < servers.STATUS.SAVE) {
                mod.STATUS = servers.STATUS.SAVE
                //更新数据
                mod.dependencies = data.deps || [];
                mod.uri = uri || '';
                mod.factory = data.factory;
            }
        }                            
    }
    const likai = function(id,factory) {
          return new likai.prototype.init(id,factory);
    }
    likai.prototype = {
        constructor : likai,
        //初始化模块，入口文件
        init: function(uri,factory) {
            //初始元init模块
            let mod = servers.get(servers.dirname() + '_init_' + servers.cid,Array.isArray(uri) ? uri : [uri]);
            //将mod放入自己的依赖层级中
            mod._entry.push(mod);
            //引用计数,初始化为1，过滤主模块依赖，我们只关心最后模块
            mod.remain = 1;
            //定义主模块的回调
            mod.callback = () => {
                //返回依赖集合的全部路径
                // let uris = mod.resolve();
                //依赖返回的数组集合
                let exports = [];
                //一次执行主模块依赖模块
                mod.dependencies.forEach((item,index) => {
                    exports[index] = servers.cacheModule[item].exec();
                })
                factory && factory.apply(global,exports);
                //删除模块的属性
                let propertySet = ['remain','_entry','callback'];
                propertySet.forEach(item => delete mod[item])
            }
            //加载模块，这是整个模块加载入口
            mod.load(); 
        }
    }
    //likai静态方法，也是模块引用,推荐传入deps，避免再去检索整个回调函数
    likai.define = function(id,deps,callback) {
          //此方法未做不传入依赖处理，必须传入依赖
          if(Array.isArray(id)) {
            deps = id;
            id = null
          }else if(typeof id === 'function' && arguments.length === 1) {
                callback = id;
                id = null
          }//此处忽略其他个能多情况
          if(!deps && typeof callback === 'function'){
            //此处做函数检索，忽略，原理就是将回调函数转换为字符串,正则匹配里面的内容
            callback.toString()
          }
          //获取用户的id
          if(!id) {
             let scripts = document.scripts;
             id = scripts[scripts.length-1].src;
          }                  //保存模块数据
          servers.save(id,{
                deps : deps,
                factory : callback,
                uri : id
          })
    }
    //模块的构造函数
        const Module = function(uri,deps) {
            //模块自身id
            this.uri = uri
            //模块依赖集合名称
            this.dependencies = deps || [];
            //模块依赖集合对象
            this.deps = {};
            //_entry在按照依赖的层级，按照层次不断传播
            this._entry = [];
            //状态
            this.STATUS = 0;
        } 
        Module.prototype = {
            constructor : Module,                  
            //返回模块全部依赖集合，默认全部根路径
            resolve() {
                let uris = [];
                this.dependencies.forEach((item) => {
                    //绝对路径转换
                    if(item.indexOf('/') === 0) {
                      uris.push(servers.dirname() + item.slice(1))  
                    //相对路径转换
                    }else if(item.indexOf('./') === 0) {
                      uris.push(servers.dirname() + item.replace(/\.\//,''))
                    //无路径符号
                    }else {
                        uris.push(servers.dirname() + item) 
                    }
                    
                })
                return uris;
            },
            fetch(uri) {                        //只负责拉取模块,seajs中fetch只负责回传requestCache对象，真正调用在load中循环requestCache执行
                let script = document.createElement('script');
                //赋值src
                script.src = uri;
                //异步加载
                script.async = true;
                //追加dom节点
                document.head.appendChild(script);
                //加载完成事件
                script.onload = function() {
                    if('onload' in this) {
                        onload();
                    }else {
                        // IE
                        script.onreadystatechange = function() {
                            if(/loaded|complete/.test(script.readyState)){
                                onload();
                            }
                        }
                    }
                }
                script.onerror = function() {
                    throw new Error('Module is broken or URL is ERROR');
                }
                function onload() {
                    //因为script标签是走内存的，所以移除前取消事件引用
                    script.onload = script.onreadystatechange = null;
                    //移除节点禁止debug
                    document.head.removeChild(script)
                    //解除引用
                    script = null;
                    //模块加载
                    let mod = servers.get(uri);
                    //加载模块
                    mod.load();
                }
            },
            //load入口
            load() {
               //更改模块状态
               this.STATUS = servers.STATUS.LOADING;
               //保存依赖模块实例,并且缓存到cacheModule中
               this.dependencies = this.resolve();
               this.dependencies.forEach((item) => {
                  this.deps[item] = servers.get(item);
               })
               //过滤模块
               this.pass();
               //如果没有依赖直接onload执行
               if(this._entry.length) {
                  this.onload();
                  return;
               }
               //如果有依赖拉取模块
               this.dependencies.forEach((dep) => {
                   //判断状态
                   if(servers.cacheModule[dep].STATUS < servers.STATUS.FETCHING) {
                       servers.cacheModule[dep].fetch(dep);
                   }else if(servers.cacheModule[dep].STATUS < servers.STATUS.LOADING) {
                       servers.cacheModule[dep].load();
                   }                           
               })
            },
            //过滤依赖
            pass(){
               //查看是否有依赖，并且将依赖层级递传,如果多个主模块依赖，那么循环push进入
               let count = 0;
               this._entry.forEach((entry) => {
                    //每次初始化依赖数
                    count = 0;
                    this.dependencies.forEach((dep) => {
                        //此处忽略模块状态判断,直接层级递传
                        this.deps[dep]._entry.push(entry);
                        count++;
                    })
                   //如果count不为0，那么更新依赖数量
                   if(count) {
                      entry.remain += count - 1;
                      //如果已经将_entry传播出去了，将自己的依赖层级删除，方便在load实践中处理
                      this._entry.shift()
                   }                            
               })
            },
            //加载完成
            onload() {
                //到这一步说明最里层的依赖模块已经加载完成
                this.STATUS = servers.STATUS.LOADED;
                //查看模块加载数量
                this._entry.forEach((item) => {
                    --item.remain === 0 ? item.callback() : null;
                })
                //删除模块依赖层级
                delete this._entry;
            },
            //执行
            exec() {
                //更改执行状态
                if(this.STATUS < servers.STATUS.EXECUTING) {
                    this.STATUS = servers.STATUS.EXECUTED;
                }else if(this.STATUS > servers.STATUS.FETCHING) {
                    //直接将返回值return,防止重复读取
                    return this.exports
                }
                //定义require
                function require(uri) {
                    //绝对路径转换
                    if(uri.indexOf('/') === 0) {
                      uri = servers.dirname() + uri.slice(1);  
                    //相对路径转换
                    }else if(uri.indexOf('./') === 0) {
                      uri = servers.dirname() + uri.replace(/\.\//,'');
                    //无路径符号
                    }else {
                        uri = servers.dirname() + item;
                    }                        
                     let mod = servers.get(uri);
                     return mod.exec();
                }
                if(typeof this.factory !== 'function') {
                    return this.factory
                }
                //执行factory
                this.factory.call(this.exports = {},require,this.exports,this);
                //此处忽略factory不是函数的处理
                //删除factory,减少内存泄漏，大家可以看到seajs源码中有大量的delete在做优化
                delete this.factory;
                //返回exports
                return this.exports
            }
        }

    //重定向原型链
    likai.prototype.init.prototype = likai.prototype;
    //全局抛出
    global.likai = likai;
})(window || this)